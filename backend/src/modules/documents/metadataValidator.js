const { z } = require("zod");

const AccessTier = require("../../../../shared/types/AccessTier");

const currentYear = new Date().getFullYear();

const metadataPayloadSchema = z.object({
  title: z.string().trim().min(1).max(255).optional(),
  author: z.string().trim().min(1).max(500).optional(),
  abstract: z.string().trim().min(1).optional(),
  keywords: z.union([z.string(), z.array(z.string())]).optional(),
  language: z.string().trim().min(1).max(20).optional(),
  year: z.preprocess((value) => {
    if (value === "" || value === null || value === undefined) {
      return undefined;
    }

    const parsed = Number(value);
    return Number.isNaN(parsed) ? value : parsed;
  }, z.number().int().min(1900).max(currentYear + 1).optional()),
  department: z.string().trim().min(1).max(255).optional(),
  course: z.string().trim().min(1).max(255).optional(),
  accessTier: z.enum(Object.values(AccessTier)).optional(),
}).refine(
  (payload) =>
    Boolean(
      payload.title ||
        payload.author ||
        payload.abstract ||
        payload.keywords ||
        payload.language ||
        payload.year !== undefined ||
        payload.department ||
        payload.course ||
        payload.accessTier,
    ),
  {
    message: "At least one metadata field must be provided",
  },
);

function validateDocumentId(value) {
  const documentId = Number(value);

  if (!Number.isInteger(documentId) || documentId <= 0) {
    return {
      ok: false,
      error: {
        statusCode: 400,
        code: "INVALID_DOCUMENT_ID",
        message: "Document id must be a positive integer",
      },
    };
  }

  return {
    ok: true,
    data: documentId,
  };
}

function validateMetadataPayload(payload) {
  const parsed = metadataPayloadSchema.safeParse(payload);

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
        message: "Invalid metadata payload",
        details,
      },
    };
  }

  return {
    ok: true,
    data: parsed.data,
  };
}

function normalizeKeywords(keywords) {
  if (Array.isArray(keywords)) {
    return keywords.map((keyword) => String(keyword).trim()).filter(Boolean);
  }

  if (typeof keywords === "string") {
    return keywords
      .split(",")
      .map((keyword) => keyword.trim())
      .filter(Boolean);
  }

  return [];
}

module.exports = {
  validateDocumentId,
  validateMetadataPayload,
  normalizeKeywords,
};