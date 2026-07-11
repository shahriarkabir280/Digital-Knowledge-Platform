/**
 * Catalog Items Repository
 * Adapted to the actual Supabase schema.
 *
 * Actual column names:
 *   authors (not author), publication_year (not publish_year),
 *   state (not status), category (not item_type), cover_image (not cover_image_url)
 *   NO barcode column — barcode lives in catalog_copies
 *   NO is_deleted column — use state = 'WITHDRAWN'
 */

const db = require("../index");

// ── Helpers ────────────────────────────────────────────────────────

function baseQuery(trx = db) {
  // Exclude soft-deleted items
  return trx("catalog_items").whereNot("state", "WITHDRAWN");
}

function withCopies(query) {
  return query
    .select("catalog_items.*")
    .select(
      db.raw(`
        COALESCE(
          (SELECT json_agg(
            json_build_object(
              'id', cc.id,
              'barcode', cc.barcode,
              'status', cc.status,
              'condition', cc.condition
            )
          ) FROM catalog_copies cc WHERE cc.item_id = catalog_items.id),
          '[]'::json
        ) AS copies
      `)
    );
}

// ── Search / Read ──────────────────────────────────────────────────

/**
 * Full-text + faceted search with pagination.
 */
async function search(opts = {}) {
  const {
    q,
    author,
    isbn,
    subject,
    status,
    available,
    location,
    item_type, // maps to category
    language,
    tag,
    page = 1,
    limit = 20,
    sort_by = "created_at",
    sort_order = "desc",
  } = opts;

  let query = baseQuery();

  // Full-text search using the actual search_vector_en column
  if (q && q.trim()) {
    query = query.whereRaw(
      "search_vector_en @@ plainto_tsquery('english', ?)",
      [q.trim()]
    );
    // Explicitly keep all item columns: calling .select(relevance) below would
    // otherwise drop Knex's implicit "select *", leaving rows with only relevance.
    query = query.select("catalog_items.*").select(
      db.raw(
        "ts_rank(search_vector_en, plainto_tsquery('english', ?)) AS relevance",
        [q.trim()]
      )
    );
  }

  if (author) query = query.where("authors", "ILIKE", `%${author}%`);
  if (isbn) query = query.where("isbn", isbn);
  if (subject) query = query.where("subject", "ILIKE", `%${subject}%`);
  if (status) query = query.where("state", status.toUpperCase());
  if (available === "true") query = query.where("available_copies", ">", 0);
  if (location) query = query.where("location", "ILIKE", `%${location}%`);
  if (item_type) query = query.where("category", "ILIKE", item_type);
  if (language) query = query.where("language", "ILIKE", language);

  const countQuery = query
    .clone()
    .clearSelect()
    .clearOrder()
    .count("* as total")
    .first();

  const validSortColumns = [
    "title",
    "authors",
    "publication_year",
    "created_at",
    "available_copies",
  ];
  const sortCol = validSortColumns.includes(sort_by) ? sort_by : "created_at";
  const sortDir = sort_order === "asc" ? "asc" : "desc";

  if (q && q.trim() && sort_by === "created_at") {
    query = query.orderBy("relevance", "desc");
  } else {
    query = query.orderBy(sortCol, sortDir);
  }

  const offset = (Math.max(1, page) - 1) * limit;
  query = query.limit(Math.min(limit, 100)).offset(offset);

  const [items, countResult] = await Promise.all([query, countQuery]);
  const total = parseInt(countResult?.total || 0, 10);

  return {
    items,
    pagination: {
      page: Math.max(1, page),
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

/**
 * Find a single catalog item by ID.
 */
async function findById(id, trx = db) {
  return baseQuery(trx).where("catalog_items.id", id).first();
}

/**
 * Find by barcode (looks in catalog_copies table).
 */
async function findByBarcode(barcode, trx = db) {
  return trx("catalog_items")
    .join("catalog_copies", "catalog_items.id", "catalog_copies.item_id")
    .select("catalog_items.*", "catalog_copies.id as copy_id", "catalog_copies.barcode", "catalog_copies.status as copy_status")
    .where("catalog_copies.barcode", barcode)
    .whereNot("catalog_items.state", "WITHDRAWN")
    .first();
}

/**
 * Find by ISBN.
 */
async function findByIsbn(isbn, trx = db) {
  return baseQuery(trx).where("isbn", isbn);
}

/**
 * Return the subset of the given ISBNs that already exist (single query).
 * Used by bulk import for duplicate detection without an N+1.
 */
async function findExistingIsbns(isbns, trx = db) {
  if (!isbns || isbns.length === 0) return [];
  const rows = await trx("catalog_items")
    .whereNot("state", "WITHDRAWN")
    .whereIn("isbn", isbns)
    .distinct("isbn")
    .pluck("isbn");
  return rows;
}

/**
 * Get distinct values for faceted filters.
 */
async function getFacets() {
  const [locations, categories, languages, subjects] = await Promise.all([
    db("catalog_items")
      .whereNot("state", "WITHDRAWN")
      .whereNotNull("location")
      .distinct("location")
      .orderBy("location"),
    db("catalog_items")
      .whereNot("state", "WITHDRAWN")
      .distinct("category")
      .whereNotNull("category")
      .orderBy("category"),
    db("catalog_items")
      .whereNot("state", "WITHDRAWN")
      .whereNotNull("language")
      .distinct("language")
      .orderBy("language"),
    db("catalog_items")
      .whereNot("state", "WITHDRAWN")
      .whereNotNull("subject")
      .distinct("subject")
      .orderBy("subject"),
  ]);

  return {
    locations: locations.map((r) => r.location),
    itemTypes: categories.map((r) => r.category), // returned as itemTypes for API compatibility
    languages: languages.map((r) => r.language),
    subjects: subjects.map((r) => r.subject),
  };
}

// ── Write ──────────────────────────────────────────────────────────

/**
 * Create a new catalog item.
 * @param {Object} data — uses our API field names (mapped internally)
 */
async function create(data, _tags = [], trx = db) {
  const mapped = mapToDb(data);

  const [item] = await trx("catalog_items")
    .insert({
      ...mapped,
      available_copies: mapped.available_copies ?? mapped.total_copies ?? 1,
      state: mapped.state || "ACTIVE",
      created_at: trx.fn.now(),
      updated_at: trx.fn.now(),
    })
    .returning("*");

  return mapFromDb(item);
}

/**
 * Update a catalog item.
 */
async function update(id, data, _tags = undefined, trx = db) {
  const mapped = mapToDb(data);

  await trx("catalog_items")
    .where({ id })
    .update({ ...mapped, updated_at: trx.fn.now() });

  return findById(id, trx);
}

/**
 * Soft-delete a catalog item (sets state to WITHDRAWN).
 */
async function softDelete(id, trx = db) {
  return trx("catalog_items")
    .where({ id })
    .update({ state: "WITHDRAWN", updated_at: trx.fn.now() });
}

/**
 * Get availability stats for dashboard.
 */
async function getStats(trx = db) {
  const stats = await trx("catalog_items")
    .whereNot("state", "WITHDRAWN")
    .select(
      db.raw("COUNT(*) as total_items"),
      db.raw("SUM(total_copies) as total_copies"),
      db.raw("SUM(available_copies) as available_copies"),
      db.raw("COUNT(*) FILTER (WHERE state = 'ACTIVE') as available_items"),
      db.raw(
        "COUNT(*) FILTER (WHERE available_copies = 0) as checked_out_items"
      )
    )
    .first();

  return stats;
}

// ── Schema adapter helpers ─────────────────────────────────────────
// Maps between our API field names and the actual DB column names.

const API_TO_DB = {
  author: "authors",
  publish_year: "publication_year",
  item_type: "category",
  cover_image_url: "cover_image",
  // status: "state"  (handled specially since we use 'status' as filter parameter)
};

const DB_TO_API = Object.fromEntries(
  Object.entries(API_TO_DB).map(([k, v]) => [v, k])
);

function mapToDb(data) {
  const result = {};
  for (const [key, value] of Object.entries(data || {})) {
    if (key === "tags" || key === "barcode") continue; // barcode goes to catalog_copies
    result[API_TO_DB[key] || key] = value;
  }
  return result;
}

function mapFromDb(row) {
  if (!row) return null;
  const result = {};
  for (const [key, value] of Object.entries(row)) {
    result[DB_TO_API[key] || key] = value;
  }
  return result;
}

module.exports = {
  search,
  findById,
  findByBarcode,
  findByIsbn,
  findExistingIsbns,
  getFacets,
  create,
  update,
  softDelete,
  getStats,
};
