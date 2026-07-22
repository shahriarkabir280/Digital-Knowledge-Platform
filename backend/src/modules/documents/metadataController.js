const db = require("../../db");
const { validateDocumentId, validateMetadataPayload, normalizeKeywords } = require("./metadataValidator");
const { findResourceById } = require("./resourceStorage");
const { sameDocumentOwner } = require("./ownership");

const METADATA_MANAGER_ROLES = new Set(["STAFF", "LAB_MANAGER", "ADMIN"]);

function hasPermission(document, user) {
  return sameDocumentOwner(document, user) || METADATA_MANAGER_ROLES.has(user.role);
}

function serializeKeywords(value) {
  return JSON.stringify(normalizeKeywords(value));
}

function parseKeywords(value) {
  if (!value) {
    return [];
  }

  if (Array.isArray(value)) {
    return value;
  }

  if (typeof value === "string") {
    const trimmed = value.trim();

    if (!trimmed) {
      return [];
    }

    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) {
        return parsed;
      }
    } catch (_error) {
      // Fall through to comma-separated parsing.
    }

    return trimmed.split(",").map((keyword) => keyword.trim()).filter(Boolean);
  }

  return [];
}

function formatDocument(row) {
  return {
    id: row.id,
    title: row.title,
    type: row.resource_type,
    format: row.format,
    version: row.version,
    state: row.state,
    accessTier: row.access_tier,
    uploaderId: row.uploader_id,
    updatedAt: row.updated_at,
  };
}

function formatMetadata(row) {
  return {
    id: row.id,
    documentId: row.id,
    title: row.title,
    author: row.author || null,
    abstract: row.abstract || null,
    keywords: parseKeywords(row.keywords),
    language: row.language || null,
    year: row.published_year || null,
    department: row.department || null,
    course: row.course || null,
    accessTier: row.access_tier,
    updatedAt: row.updated_at,
  };
}

function buildResourceUpdates(payload) {
  const updates = {};

  if (payload.title !== undefined) {
    updates.title = payload.title.trim();
  }

  if (payload.accessTier !== undefined) {
    updates.access_tier = payload.accessTier;
  }

  if (payload.author !== undefined) {
    updates.author = payload.author.trim();
  }

  if (payload.abstract !== undefined) {
    updates.abstract = payload.abstract.trim();
  }

  if (payload.keywords !== undefined) {
    const keywords = normalizeKeywords(payload.keywords);
    if (keywords.length === 0) {
      throw {
        statusCode: 400,
        code: "INVALID_KEYWORDS",
        message: "Provide at least one keyword",
      };
    }
    updates.keywords = serializeKeywords(keywords);
  }

  if (payload.language !== undefined) {
    updates.language = payload.language.trim();
  }

  if (payload.year !== undefined) {
    updates.published_year = payload.year;
  }

  if (payload.department !== undefined) {
    updates.department = payload.department.trim();
  }

  if (payload.course !== undefined) {
    updates.course = payload.course.trim();
  }

  return updates;
}

function assertDocumentPermission(document, user) {
  if (!hasPermission(document, user)) {
    throw {
      statusCode: 403,
      code: "FORBIDDEN",
      message: "You do not have permission to modify this document",
    };
  }
}

/**
 * Update metadata for a document. A `research_resources`/`academic_resources`
 * row always carries its own metadata columns, so "create" and "update" are
 * the same operation here — `createMetadata` below is a thin alias kept for
 * the existing POST route/frontend fallback.
 */
async function updateMetadata(req, res, next) {
  const documentIdResult = validateDocumentId(req.params.id);
  if (!documentIdResult.ok) {
    return next(documentIdResult.error);
  }

  const payloadResult = validateMetadataPayload(req.body);
  if (!payloadResult.ok) {
    return next(payloadResult.error);
  }

  try {
    const documentId = documentIdResult.data;
    const payload = payloadResult.data;

    const resourceLookup = await findResourceById(documentId);
    if (!resourceLookup) {
      return next({
        statusCode: 404,
        code: "DOCUMENT_NOT_FOUND",
        message: "Document not found",
      });
    }

    assertDocumentPermission(resourceLookup.document, req.user);

    const updates = buildResourceUpdates(payload);
    if (Object.keys(updates).length === 0) {
      return next({
        statusCode: 400,
        code: "NO_CHANGES",
        message: "No changes found to update",
      });
    }

    await db(resourceLookup.table)
      .where({ id: documentId })
      .update({
        ...updates,
        updated_at: db.fn.now(),
      });

    const updatedRow = await db(resourceLookup.table).where({ id: documentId }).first();

    return res.status(200).json({
      success: true,
      message: "Metadata updated",
      data: {
        document: formatDocument(updatedRow),
        metadata: formatMetadata(updatedRow),
      },
    });
  } catch (error) {
    return next(error);
  }
}

async function getMetadata(req, res, next) {
  const documentIdResult = validateDocumentId(req.params.id);
  if (!documentIdResult.ok) {
    return next(documentIdResult.error);
  }

  try {
    const documentId = documentIdResult.data;

    const resourceLookup = await findResourceById(documentId);
    if (!resourceLookup) {
      return res.status(404).json({
        success: false,
        code: "DOCUMENT_NOT_FOUND",
        message: "Document not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Metadata retrieved",
      data: {
        document: formatDocument(resourceLookup.document),
        metadata: formatMetadata(resourceLookup.document),
      },
    });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  createMetadata: updateMetadata,
  updateMetadata,
  getMetadata,
};
