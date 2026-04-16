const { z } = require("zod");
const AccessTier = require("../../../../shared/types/AccessTier");

const db = require("../../db");

const querySchema = z.object({
  state: z.enum(["draft", "review", "published", "archived"]).optional(),
  type: z.string().trim().min(1).max(100).optional(),
});

const reviewQueueQuerySchema = z.object({
  type: z.string().trim().min(1).max(100).optional(),
});

const allUploadsQuerySchema = z.object({
  state: z.enum(["draft", "review", "published", "archived"]).optional(),
  type: z.string().trim().min(1).max(100).optional(),
  uploaderId: z.preprocess((value) => {
    if (value === "" || value === undefined || value === null) {
      return undefined;
    }

    const parsed = Number(value);
    return Number.isNaN(parsed) ? value : parsed;
  }, z.number().int().positive().optional()),
  accessTier: z.enum(Object.values(AccessTier)).optional(),
});

const REVIEW_QUEUE_ROLES = ["STAFF", "LAB_MANAGER", "REVIEWER", "ADMIN"];
const ALL_UPLOADS_ROLES = ["STAFF", "LAB_MANAGER", "REVIEWER", "ADMIN"];

function normalizeDocumentRow(row) {
  return {
    id: row.id,
    title: row.title,
    type: row.type,
    format: row.format,
    version: row.version,
    state: row.state,
    accessTier: row.access_tier,
    filePath: row.file_path,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    uploaderId: row.uploader_id,
  };
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

    let query = db("documents")
      .select(
        "id",
        "title",
        "type",
        "format",
        "version",
        "state",
        "access_tier",
        "file_path",
        "created_at",
        "updated_at",
        "uploader_id",
      )
      .where({ uploader_id: userId })
      .orderBy("created_at", "desc");

    if (state) {
      query = query.andWhere({ state });
    }

    if (type) {
      query = query.andWhereRaw("LOWER(type) = ?", [type]);
    }

    const rows = await query;
    const items = rows.map(normalizeDocumentRow);

    return res.status(200).json({
      success: true,
      data: {
        items,
        total: items.length,
        filters: {
          state: state || null,
          type: type || null,
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

    let query = db("documents as d")
      .leftJoin("users as u", "d.uploader_id", "u.id")
      .leftJoin("metadata as m", "d.id", "m.document_id")
      .select(
        "d.id",
        "d.title",
        "d.type",
        "d.format",
        "d.version",
        "d.state",
        "d.access_tier",
        "d.created_at",
        "d.updated_at",
        "d.uploader_id",
        db.raw("u.name as uploader_name"),
        db.raw("u.email as uploader_email"),
        "m.author",
        "m.abstract",
        "m.keywords",
        "m.language",
        "m.published_year",
        "m.department",
      )
      .where({ "d.state": "review" })
      .orderBy("d.created_at", "asc");

    if (type) {
      query = query.andWhereRaw("LOWER(d.type) = ?", [type]);
    }

    const rows = await query;
    const items = rows.map(normalizeReviewRow);

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
    const { state, type, uploaderId, accessTier } = filterResult.data;

    let query = db("documents as d")
      .leftJoin("users as u", "d.uploader_id", "u.id")
      .leftJoin("metadata as m", "d.id", "m.document_id")
      .select(
        "d.id",
        "d.title",
        "d.type",
        "d.format",
        "d.version",
        "d.state",
        "d.access_tier",
        "d.created_at",
        "d.updated_at",
        "d.uploader_id",
        db.raw("u.name as uploader_name"),
        db.raw("u.email as uploader_email"),
        "m.author",
      )
      .orderBy("d.created_at", "desc");

    if (state) {
      query = query.andWhere({ "d.state": state });
    }

    if (type) {
      query = query.andWhereRaw("LOWER(d.type) = ?", [type]);
    }

    if (uploaderId) {
      query = query.andWhere({ "d.uploader_id": uploaderId });
    }

    if (accessTier) {
      query = query.andWhere({ "d.access_tier": accessTier });
    }

    const rows = await query;
    const items = rows.map(normalizeAllUploadsRow);

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
        },
      },
      message: items.length > 0 ? "All uploads fetched" : "No uploads found",
    });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  getMyUploads,
  getReviewQueue,
  getAllUploads,
};