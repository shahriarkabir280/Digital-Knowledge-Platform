const db = require("../../db");
const { validateDocumentId, validateMetadataPayload, normalizeKeywords } = require("./metadataValidator");
const { versionIncrementExpression } = require("./versionService");
const { sameDocumentOwner } = require("./ownership");

function hasOwnership(document, user) {
  return sameDocumentOwner(document, user) || user.role === "ADMIN";
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

function formatDocument(document) {
  return {
    id: document.id,
    title: document.title,
    type: document.type,
    format: document.format,
    version: document.version,
    state: document.state,
    accessTier: document.access_tier,
    uploaderId: document.uploader_id,
    updatedAt: document.updated_at,
  };
}

function formatMetadata(metadata) {
  return {
    id: metadata.id,
    documentId: metadata.document_id,
    author: metadata.author || null,
    abstract: metadata.abstract || null,
    keywords: parseKeywords(metadata.keywords),
    language: metadata.language || null,
    year: metadata.published_year || null,
    department: metadata.department || null,
    course: metadata.course || null,
    updatedAt: metadata.updated_at,
  };
}

function buildDocumentUpdates(payload) {
  const updates = {};

  if (payload.title !== undefined) {
    updates.title = payload.title.trim();
  }

  if (payload.accessTier !== undefined) {
    updates.access_tier = payload.accessTier;
  }

  return updates;
}

function buildMetadataUpdates(payload) {
  const updates = {};

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
  if (!hasOwnership(document, user)) {
    throw {
      statusCode: 403,
      code: "FORBIDDEN",
      message: "You do not have permission to modify this document",
    };
  }
}

async function createMetadata(req, res, next) {
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

    await db.transaction(async (trx) => {
      const document = await trx("documents").where({ id: documentId }).first();

      if (!document) {
        throw {
          statusCode: 404,
          code: "DOCUMENT_NOT_FOUND",
          message: "Document not found",
        };
      }

      assertDocumentPermission(document, req.user);

      const existingMetadata = await trx("metadata").where({ document_id: documentId }).first();
      if (existingMetadata) {
        throw {
          statusCode: 409,
          code: "METADATA_ALREADY_EXISTS",
          message: "Metadata already exists for this document",
        };
      }

      const documentUpdates = buildDocumentUpdates(payload);
      const metadataUpdates = buildMetadataUpdates(payload);

      if (Object.keys(documentUpdates).length > 0) {
        await trx("documents").where({ id: documentId }).update({
          ...documentUpdates,
          updated_at: trx.fn.now(),
        });
      }

      const [createdMetadataId] = await trx("metadata")
        .insert({
          document_id: documentId,
          ...metadataUpdates,
          created_at: trx.fn.now(),
          updated_at: trx.fn.now(),
        })
        .returning("id");

      const metadataRow = await trx("metadata").where({ id: createdMetadataId.id || createdMetadataId }).first();
      const updatedDocument = await trx("documents").where({ id: documentId }).first();

      return res.status(201).json({
        success: true,
        message: "Metadata created",
        data: {
          document: formatDocument(updatedDocument),
          metadata: formatMetadata(metadataRow),
        },
      });
    });
  } catch (error) {
    return next(error);
  }
}

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

    await db.transaction(async (trx) => {
      const document = await trx("documents").where({ id: documentId }).first();

      if (!document) {
        throw {
          statusCode: 404,
          code: "DOCUMENT_NOT_FOUND",
          message: "Document not found",
        };
      }

      assertDocumentPermission(document, req.user);

      const metadata = await trx("metadata").where({ document_id: documentId }).first();
      if (!metadata) {
        throw {
          statusCode: 404,
          code: "METADATA_NOT_FOUND",
          message: "Metadata does not exist for this document",
        };
      }

      const documentUpdates = buildDocumentUpdates(payload);
      const metadataUpdates = buildMetadataUpdates(payload);
      const hasDocumentUpdates = Object.keys(documentUpdates).length > 0;
      const hasMetadataUpdates = Object.keys(metadataUpdates).length > 0;

      if (!hasDocumentUpdates && !hasMetadataUpdates) {
        throw {
          statusCode: 400,
          code: "NO_CHANGES",
          message: "No changes found to update",
        };
      }

      // Only increment version if document fields (title, accessTier) are being updated
      if (hasDocumentUpdates) {
        await trx("documents").where({ id: documentId }).update({
          ...documentUpdates,
          version: versionIncrementExpression(trx),
          updated_at: trx.fn.now(),
        });
      } else if (hasMetadataUpdates) {
        // If only metadata is being updated, just update the timestamp without incrementing version
        await trx("documents").where({ id: documentId }).update({
          updated_at: trx.fn.now(),
        });
      }

      if (hasMetadataUpdates) {
        await trx("metadata").where({ document_id: documentId }).update({
          ...metadataUpdates,
          updated_at: trx.fn.now(),
        });
      }

      const updatedDocument = await trx("documents").where({ id: documentId }).first();
      const updatedMetadata = await trx("metadata").where({ document_id: documentId }).first();

      return res.status(200).json({
        success: true,
        message: "Metadata updated",
        data: {
          document: formatDocument(updatedDocument),
          metadata: formatMetadata(updatedMetadata),
        },
      });
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

    const document = await db("documents").where({ id: documentId }).first();

    if (!document) {
      return res.status(404).json({
        success: false,
        code: "DOCUMENT_NOT_FOUND",
        message: "Document not found",
      });
    }

    const metadata = await db("metadata").where({ document_id: documentId }).first();

    if (!metadata) {
      return res.status(404).json({
        success: false,
        code: "METADATA_NOT_FOUND",
        message: "Metadata does not exist for this document",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Metadata retrieved",
      data: {
        document: formatDocument(document),
        metadata: formatMetadata(metadata),
      },
    });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  createMetadata,
  updateMetadata,
  getMetadata,
};