/**
 * Audit Log Repository — persists to the `audit_log` table (FR-DKP-023).
 *
 * Writes are best-effort: an audit failure must never break the underlying
 * catalog/loan operation, so record() catches and logs instead of throwing.
 * Reads (findByEntity / findRecent) return real rows for the librarian UI.
 *
 * Table (see backend/scripts/supabase_library_5.4.sql):
 *   id, entity_type, entity_id, action, changed_by, old_values(jsonb),
 *   new_values(jsonb), created_at
 */

const db = require("../index");

/**
 * Record an audit log entry.
 * @param {Object} entry
 * @param {string} entry.entityType  — e.g. 'catalog_item', 'loan', 'fine'
 * @param {number} entry.entityId    — ID of the affected record
 * @param {string} entry.action      — 'CREATE', 'UPDATE', or 'DELETE'
 * @param {number} [entry.changedBy] — User ID who performed the action
 * @param {Object} [entry.oldValues] — Previous state (for updates/deletes)
 * @param {Object} [entry.newValues] — New state (for creates/updates)
 * @param {Object} [trx]             — Optional Knex transaction
 */
async function record(entry, trx = db) {
  const row = {
    entity_type: entry.entityType,
    entity_id: entry.entityId,
    action: entry.action,
    changed_by: entry.changedBy || null,
    old_values: JSON.stringify(entry.oldValues || {}),
    new_values: JSON.stringify(entry.newValues || {}),
    created_at: trx.fn.now(),
  };

  try {
    const [saved] = await trx("audit_log").insert(row).returning("*");
    return saved;
  } catch (err) {
    // Never let an audit failure break the caller's operation.
    console.warn("[AUDIT] Could not persist audit entry:", err.message);
    console.log("[AUDIT]", JSON.stringify({ ...row, old_values: entry.oldValues, new_values: entry.newValues }));
    return null;
  }
}

function normalizeRow(r) {
  if (!r) return r;
  const parse = (v) => {
    if (v == null) return v;
    if (typeof v === "object") return v; // pg already parsed jsonb
    try {
      return JSON.parse(v);
    } catch {
      return v;
    }
  };
  return { ...r, old_values: parse(r.old_values), new_values: parse(r.new_values) };
}

/**
 * Fetch audit log entries for a specific entity, paginated.
 */
async function findByEntity(entityType, entityId, { page = 1, limit = 50 } = {}) {
  const offset = (Math.max(1, page) - 1) * limit;

  const [rows, countRow] = await Promise.all([
    db("audit_log")
      .where({ entity_type: entityType, entity_id: entityId })
      .orderBy("created_at", "desc")
      .limit(Math.min(limit, 200))
      .offset(offset),
    db("audit_log")
      .where({ entity_type: entityType, entity_id: entityId })
      .count("* as total")
      .first(),
  ]);

  return {
    items: rows.map(normalizeRow),
    pagination: {
      page: Math.max(1, page),
      limit,
      total: parseInt(countRow?.total || 0, 10),
    },
  };
}

/**
 * Fetch recent audit log entries, optionally filtered by entity type.
 */
async function findRecent({ page = 1, limit = 50, entityType } = {}) {
  const offset = (Math.max(1, page) - 1) * limit;

  let query = db("audit_log")
    .leftJoin("users", "audit_log.changed_by", "users.id")
    .select("audit_log.*", "users.name as changed_by_name", "users.email as changed_by_email")
    .orderBy("audit_log.created_at", "desc")
    .limit(Math.min(limit, 200))
    .offset(offset);

  if (entityType) query = query.where("audit_log.entity_type", entityType);

  const rows = await query;
  return rows.map(normalizeRow);
}

module.exports = {
  record,
  findByEntity,
  findRecent,
};
