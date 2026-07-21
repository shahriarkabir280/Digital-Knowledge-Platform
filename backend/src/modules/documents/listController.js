const { z } = require("zod");
const AccessTier = require("../../../../shared/types/AccessTier");

const db = require("../../db");

const querySchema = z.object({
  state: z.enum(["pending", "draft", "review", "published", "archived"]).optional(),
  type: z.string().trim().min(1).max(100).optional(),
});

const reviewQueueQuerySchema = z.object({
  type: z.string().trim().min(1).max(100).optional(),
});

const pendingDocumentsQuerySchema = z.object({
  type: z.string().trim().min(1).max(100).optional(),
});

const allUploadsQuerySchema = z.object({
  state: z.enum(["pending", "draft", "review", "published", "archived"]).optional(),
  type: z.string().trim().min(1).max(100).optional(),
  uploaderId: z.preprocess((value) => {
    if (value === "" || value === undefined || value === null) {
      return undefined;
    }

    const parsed = Number(value);
    return Number.isNaN(parsed) ? value : parsed;
  }, z.number().int().positive().optional()),
  accessTier: z.enum(Object.values(AccessTier)).optional(),
  search: z.string().optional(),
});

const REVIEW_QUEUE_ROLES = ["STAFF", "LAB_MANAGER", "REVIEWER", "ADMIN"];
const ALL_UPLOADS_ROLES = ["STAFF", "LAB_MANAGER", "REVIEWER", "ADMIN"];

function parseKeywords(value) {
  if (Array.isArray(value)) {
    return value;
  }

  if (typeof value === "string") {
    return value
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  }

  return [];
}

function normalizeDocumentRow(row, resourceCategory = null) {
  return {
    id: row.id,
    title: row.title,
    type: row.type || null,
    format: row.format,
    version: row.version,
    state: row.state,
    accessTier: row.access_tier,
    filePath: row.file_path,
    resourceCategory,
    author: row.author || null,
    abstract: row.abstract || null,
    keywords: parseKeywords(row.keywords),
    language: row.language || null,
    year: row.published_year || null,
    department: row.department || null,
    course: row.course || null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    uploaderId: row.uploader_id,
    uploaderName: row.uploader_name || null,
    uploaderEmail: row.uploader_email || null,
  };
}

function resolveResourceTable(resourceCategory) {
  const normalizedCategory = String(resourceCategory || "")
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "");

  if (["researchpaper", "thesis", "dataset", "research-paper", "researchpaper"].includes(normalizedCategory)) {
    return "research_resources";
  }

  return "academic_resources";
}

function resolveResourceTables(resourceCategory) {
  if (resourceCategory) {
    return [resolveResourceTable(resourceCategory)];
  }

  return ["research_resources", "academic_resources"];
}

function normalizeResourceCategory(value) {
  return String(value || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "");
}

function getCategoryValueAliases(resourceCategory) {
  const normalizedCategory = normalizeResourceCategory(resourceCategory);

  const aliasesByCategory = {
    researchpaper: ["researchpaper", "research-paper", "research", "paper"],
    thesis: ["thesis"],
    dataset: ["dataset", "datasets"],
    textbook: ["textbook", "textbookresource", "book", "pdf"],
    lectureslides: ["lectureslides", "lecture-slides", "slides", "presentation", "ppt", "pptx"],
    labmanual: ["labmanual", "lab-manual", "manual"],
    questionbank: ["questionbank", "question-bank", "qbank"],
    assignment: ["assignment", "assignments"],
    labreport: ["labreport", "lab-report", "report"],
    media: ["media", "video", "videos"],
    project: ["project"],
  };

  return aliasesByCategory[normalizedCategory] || [normalizedCategory];
}

function buildResourceQuery(table, filters = {}) {
  let query = db(table)
    .leftJoin("users as u", `${table}.uploader_id`, "u.id")
    .select(
      `${table}.id as id`,
      `${table}.title as title`,
      `${table}.resource_type as type`,
      `${table}.format as format`,
      `${table}.version as version`,
      `${table}.state as state`,
      `${table}.access_tier as access_tier`,
      `${table}.file_path as file_path`,
      `${table}.author as author`,
      `${table}.abstract as abstract`,
      `${table}.keywords as keywords`,
      `${table}.language as language`,
      `${table}.published_year as published_year`,
      `${table}.department as department`,
      `${table}.course as course`,
      `${table}.created_at as created_at`,
      `${table}.updated_at as updated_at`,
      `${table}.uploader_id as uploader_id`,
      db.raw("u.name as uploader_name"),
      db.raw("u.email as uploader_email"),
    );

  if (filters.state) {
    query = query.where({ state: filters.state });
  }

  if (filters.type) {
    query = query.whereRaw("LOWER(resource_type) = ?", [filters.type]);
  }

  if (filters.uploaderId) {
    query = query.where({ uploader_id: filters.uploaderId });
  }

  if (filters.resourceCategory) {
    const categoryAliases = getCategoryValueAliases(filters.resourceCategory);
    query = query.where((builder) => {
      categoryAliases.forEach((alias, index) => {
        if (index === 0) {
          builder.whereRaw("LOWER(resource_type) = ?", [alias]);
        } else {
          builder.orWhereRaw("LOWER(resource_type) = ?", [alias]);
        }
      });
    });
  }

  return query.orderBy("created_at", "desc");
}

function buildReviewQueueQuery(table, filters = {}) {
  let query = db(table)
    .leftJoin("users as u", `${table}.uploader_id`, "u.id")
    .select(
      `${table}.id as id`,
      `${table}.title as title`,
      `${table}.resource_type as type`,
      `${table}.format as format`,
      `${table}.version as version`,
      `${table}.state as state`,
      `${table}.access_tier as access_tier`,
      `${table}.created_at as created_at`,
      `${table}.updated_at as updated_at`,
      `${table}.uploader_id as uploader_id`,
      db.raw("u.name as uploader_name"),
      db.raw("u.email as uploader_email"),
      `${table}.author as author`,
      `${table}.abstract as abstract`,
      `${table}.keywords as keywords`,
      `${table}.language as language`,
      `${table}.published_year as published_year`,
      `${table}.department as department`,
      `${table}.course as course`,
    )
    .where(`${table}.state`, "review")
    .orderBy(`${table}.created_at`, "asc");

  if (filters.type) {
    query = query.andWhereRaw(`LOWER(${table}.resource_type) = ?`, [filters.type]);
  }

  return query;
}

function buildAllUploadsQuery(table, filters = {}) {
  let query = db(table)
    .leftJoin("users as u", `${table}.uploader_id`, "u.id")
    .select(
      `${table}.id as id`,
      `${table}.title as title`,
      `${table}.resource_type as type`,
      `${table}.format as format`,
      `${table}.version as version`,
      `${table}.state as state`,
      `${table}.access_tier as access_tier`,
      `${table}.created_at as created_at`,
      `${table}.updated_at as updated_at`,
      `${table}.uploader_id as uploader_id`,
      db.raw("u.name as uploader_name"),
      db.raw("u.email as uploader_email"),
      `${table}.author as author`,
      `${table}.abstract as abstract`,
      `${table}.keywords as keywords`,
      `${table}.language as language`,
      `${table}.published_year as published_year`,
      `${table}.department as department`,
      `${table}.course as course`,
    )
    .orderBy(`${table}.created_at`, "desc");

  if (filters.state) {
    query = query.where(`${table}.state`, filters.state);
  }

  if (filters.type) {
    query = query.andWhereRaw(`LOWER(${table}.resource_type) = ?`, [filters.type]);
  }

  if (filters.uploaderId) {
    query = query.andWhere(`${table}.uploader_id`, filters.uploaderId);
  }

  if (filters.accessTier) {
    query = query.andWhere(`${table}.access_tier`, filters.accessTier);
  }

  if (filters.search && filters.search.trim()) {
    const searchPattern = `%${filters.search.toLowerCase()}%`;
    query = query.andWhere((builder) => {
      builder.whereRaw(`LOWER(${table}.title) LIKE ?`, [searchPattern])
             .orWhereRaw(`LOWER(${table}.author) LIKE ?`, [searchPattern])
             .orWhereRaw(`LOWER(u.name) LIKE ?`, [searchPattern])
             .orWhereRaw(`LOWER(u.email) LIKE ?`, [searchPattern]);
    });
  }

  return query;
}

function normalizeReviewRow(row) {
  let keywords = [];

  if (row.keywords) {
    try {
      const parsed = JSON.parse(row.keywords);
      if (Array.isArray(parsed)) {
        keywords = parsed;
      }
    } catch (_error) {
      keywords = String(row.keywords)
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);
    }
  }

  return {
    id: row.id,
    title: row.title,
    type: row.type,
    format: row.format,
    version: row.version,
    state: row.state,
    accessTier: row.access_tier,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    uploaderId: row.uploader_id,
    uploaderName: row.uploader_name || null,
    uploaderEmail: row.uploader_email || null,
    author: row.author || null,
    abstract: row.abstract || null,
    keywords,
    language: row.language || null,
    year: row.published_year || null,
    department: row.department || null,
    course: row.course || null,
  };
}

function normalizeAllUploadsRow(row) {
  return {
    id: row.id,
    title: row.title,
    type: row.type,
    format: row.format,
    version: row.version,
    state: row.state,
    accessTier: row.access_tier,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    uploaderId: row.uploader_id,
    uploaderName: row.uploader_name || null,
    uploaderEmail: row.uploader_email || null,
    author: row.author || null,
    year: row.published_year || null,
    department: row.department || null,
    course: row.course || null,
  };
}

function validateFilters(query) {
  const parsed = querySchema.safeParse(query);

  if (!parsed.success) {
    const details = parsed.error.issues.map((issue) => ({
      field: issue.path.join("."),
      message: issue.message,
    }));

    return {
      ok: false,
      error: {
        statusCode: 400,
        code: "VALIDATION_ERROR",
        message: "Invalid filter query",
        details,
      },
    };
  }

  const data = parsed.data;

  return {
    ok: true,
    data: {
      state: data.state,
      type: data.type ? data.type.toLowerCase() : undefined,
    },
  };
}

function validateReviewQueueFilters(query) {
  const parsed = reviewQueueQuerySchema.safeParse(query);

  if (!parsed.success) {
    const details = parsed.error.issues.map((issue) => ({
      field: issue.path.join("."),
      message: issue.message,
    }));

    return {
      ok: false,
      error: {
        statusCode: 400,
        code: "VALIDATION_ERROR",
        message: "Invalid review queue query",
        details,
      },
    };
  }

  return {
    ok: true,
    data: {
      type: parsed.data.type ? parsed.data.type.toLowerCase() : undefined,
    },
  };
}

function validatePendingDocumentsFilters(query) {
  const parsed = pendingDocumentsQuerySchema.safeParse(query);

  if (!parsed.success) {
    const details = parsed.error.issues.map((issue) => ({
      field: issue.path.join("."),
      message: issue.message,
    }));

    return {
      ok: false,
      error: {
        statusCode: 400,
        code: "VALIDATION_ERROR",
        message: "Invalid pending documents query",
        details,
      },
    };
  }

  return {
    ok: true,
    data: {
      type: parsed.data.type ? parsed.data.type.toLowerCase() : undefined,
    },
  };
}

function validateAllUploadsFilters(query) {
  const parsed = allUploadsQuerySchema.safeParse(query);

  if (!parsed.success) {
    const details = parsed.error.issues.map((issue) => ({
      field: issue.path.join("."),
      message: issue.message,
    }));

    return {
      ok: false,
      error: {
        statusCode: 400,
        code: "VALIDATION_ERROR",
        message: "Invalid all uploads query",
        details,
      },
    };
  }

  const data = parsed.data;

  return {
    ok: true,
    data: {
      state: data.state,
      type: data.type ? data.type.toLowerCase() : undefined,
      uploaderId: data.uploaderId,
      accessTier: data.accessTier,
      search: data.search,
    },
  };
}

async function getMyUploads(req, res, next) {
  const userId = req.user?.id;

  if (!userId) {
    return next({
      statusCode: 401,
      code: "AUTH_REQUIRED",
      message: "Authorization token is required",
    });
  }

  const filterResult = validateFilters(req.query || {});
  if (!filterResult.ok) {
    return next(filterResult.error);
  }

  try {
    const { state, type } = filterResult.data;
    const resourceCategory = req.query.resourceCategory; // Optional filter

    const tables = resolveResourceTables(resourceCategory);
    const results = await Promise.all(
      tables.map(async (table) => {
        const rows = await buildResourceQuery(table, { state, type, resourceCategory, uploaderId: userId });
        // Use the actual resource_type from the row, not a default
        return rows.map((row) => normalizeDocumentRow(row, row.resource_type || (table === "research_resources" ? "research-paper" : "textbook")));
      })
    );

    const items = results.flat().sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    return res.status(200).json({
      success: true,
      data: {
        items,
        total: items.length,
        filters: {
          state: state || null,
          type: type || null,
          resourceCategory: resourceCategory || null,
        },
      },
      message: items.length > 0 ? "My uploads fetched" : "No uploads found",
    });
  } catch (error) {
    return next(error);
  }
}

async function getReviewQueue(req, res, next) {
  const userRole = req.user?.role;

  if (!REVIEW_QUEUE_ROLES.includes(userRole)) {
    return next({
      statusCode: 403,
      code: "FORBIDDEN",
      message: "Staff or reviewer access is required",
    });
  }

  const filterResult = validateReviewQueueFilters(req.query || {});
  if (!filterResult.ok) {
    return next(filterResult.error);
  }

  try {
    const { type } = filterResult.data;

    const tables = ["research_resources", "academic_resources"];
    const rows = [];

    for (const table of tables) {
      const query = buildReviewQueueQuery(table, { type });
      rows.push(...(await query));
    }

    const items = rows
      .sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
      .map(normalizeReviewRow);

    return res.status(200).json({
      success: true,
      data: {
        items,
        total: items.length,
        filters: {
          state: "review",
          type: type || null,
        },
      },
      message: items.length > 0 ? "Review queue fetched" : "Review queue is empty",
    });
  } catch (error) {
    return next(error);
  }
}

async function getPendingDocuments(req, res, next) {
  const userRole = req.user?.role;

  // Staff and privileged reviewers can view pending documents
  if (!["STAFF", "LAB_MANAGER", "REVIEWER", "ADMIN"].includes(userRole)) {
    return next({
      statusCode: 403,
      code: "FORBIDDEN",
      message: "Staff access is required to view pending documents",
    });
  }

  const filterResult = validatePendingDocumentsFilters(req.query || {});
  if (!filterResult.ok) {
    return next(filterResult.error);
  }

  try {
    const { type } = filterResult.data;
    const resourceCategory = req.query.resourceCategory; // Optional filter - can be null to get both
    
    // If a specific category is requested, query only that table
    if (resourceCategory) {
      const table = resolveResourceTable(resourceCategory);
      const rows = await buildResourceQuery(table, { state: 'pending', type, resourceCategory, uploaderId: null });
      const items = rows.map((row) => normalizeDocumentRow(row, resourceCategory));

      return res.status(200).json({
        success: true,
        data: {
          items,
          total: items.length,
          filters: {
            state: "pending",
            type: type || null,
            resourceCategory,
          },
        },
        message: items.length > 0 ? "Pending documents fetched" : "No pending documents",
      });
    }

    // If no specific category, query both research and academic resources
    const tables = ["research_resources", "academic_resources"];
    const allRows = [];

    for (const table of tables) {
      const rows = await buildResourceQuery(table, { state: 'pending', type, resourceCategory: null, uploaderId: null });
      // Use the actual resource_type from each row
      allRows.push(...rows.map((row) => normalizeDocumentRow(row, row.resource_type || (table === "research_resources" ? "research-paper" : "textbook"))));
    }

    const items = allRows.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    return res.status(200).json({
      success: true,
      data: {
        items,
        total: items.length,
        filters: {
          state: "pending",
          type: type || null,
          resourceCategory: null,
        },
      },
      message: items.length > 0 ? "Pending documents fetched" : "No pending documents",
    });
  } catch (error) {
    return next(error);
  }
}

async function getAllUploads(req, res, next) {
  const userRole = req.user?.role;

  if (!ALL_UPLOADS_ROLES.includes(userRole)) {
    return next({
      statusCode: 403,
      code: "FORBIDDEN",
      message: "Staff or reviewer access is required",
    });
  }

  const filterResult = validateAllUploadsFilters(req.query || {});
  if (!filterResult.ok) {
    return next(filterResult.error);
  }

  try {
    const { state, type, uploaderId, accessTier, search } = filterResult.data;

    const tables = ["research_resources", "academic_resources"];
    const rows = [];

    for (const table of tables) {
      const query = buildAllUploadsQuery(table, { state, type, uploaderId, accessTier, search });
      rows.push(...(await query));
    }

    const items = rows
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      .map(normalizeAllUploadsRow);

    return res.status(200).json({
      success: true,
      data: {
        items,
        total: items.length,
        filters: {
          state: state || null,
          type: type || null,
          uploaderId: uploaderId || null,
          accessTier: accessTier || null,
          search: search || null,
        },
      },
      message: items.length > 0 ? "All uploads fetched" : "No uploads found",
    });
  } catch (error) {
    return next(error);
  }
}

async function getPublishedDocuments(req, res, next) {
  const filterResult = validateFilters(req.query || {});
  if (!filterResult.ok) {
    return next(filterResult.error);
  }

  try {
    const { state, type } = filterResult.data;
    const resourceCategory = req.query.resourceCategory; // Optional filter

    const tables = resolveResourceTables(resourceCategory);
    const results = await Promise.all(
      tables.map(async (table) => {
        // Query published documents WITHOUT filtering by uploader — visible to all users
        const rows = await buildResourceQuery(table, {
          state: "published",
          type,
          resourceCategory,
          // NOTE: No uploaderId filter — this is intentional so ALL users can see approved resources
        });
        return rows.map((row) =>
          normalizeDocumentRow(
            row,
            row.type ||
              (table === "research_resources" ? "research-paper" : "textbook")
          )
        );
      })
    );

    let items = results
      .flat()
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    // Guests (no authenticated user) may only ever see PUBLIC documents,
    // regardless of any client-supplied filter — never trust the client here.
    if (!req.user) {
      items = items.filter((item) => item.accessTier === "PUBLIC");
    }

    return res.status(200).json({
      success: true,
      data: {
        items,
        total: items.length,
        filters: {
          state: "published",
          type: type || null,
          resourceCategory: resourceCategory || null,
        },
      },
      message:
        items.length > 0
          ? "Published documents fetched"
          : "No published documents found",
    });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  getMyUploads,
  getReviewQueue,
  getPendingDocuments,
  getAllUploads,
  getPublishedDocuments,
};