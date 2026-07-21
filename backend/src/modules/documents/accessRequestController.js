const { z } = require("zod");

const { validateDocumentId } = require("./metadataValidator");
const { findResourceById } = require("./resourceStorage");
const { sameDocumentOwner } = require("./ownership");
const documentAccessRequests = require("../../db/repositories/documentAccessRequests");
const { notifyUser } = require("../../db/repositories/notifications");
const db = require("../../db");

const requestAccessSchema = z.object({
  message: z.string().trim().max(1000).optional(),
});

const decisionSchema = z.object({
  decision: z.enum(["APPROVED", "REJECTED"]),
});

function formatRequestRow(row, documentTitle) {
  return {
    id: row.id,
    documentId: row.document_id,
    resourceTable: row.resource_table,
    documentTitle: documentTitle || null,
    requesterId: row.requester_id,
    requesterName: row.requester_name || null,
    requesterEmail: row.requester_email || null,
    authorId: row.author_id,
    message: row.message,
    status: row.status,
    decidedBy: row.decided_by ?? null,
    decidedAt: row.decided_at ?? null,
    createdAt: row.created_at,
  };
}

async function hydrateTitles(rows) {
  const uniqueKeys = new Map();
  rows.forEach((row) => {
    uniqueKeys.set(`${row.resource_table}:${row.document_id}`, {
      table: row.resource_table,
      id: row.document_id,
    });
  });

  const titles = new Map();
  await Promise.all(
    Array.from(uniqueKeys.values()).map(async ({ table, id }) => {
      const doc = await db(table).where({ id }).first(["id", "title"]);
      if (doc) {
        titles.set(`${table}:${id}`, doc.title);
      }
    }),
  );

  return rows.map((row) => formatRequestRow(row, titles.get(`${row.resource_table}:${row.document_id}`)));
}

async function requestAccess(req, res, next) {
  const documentIdResult = validateDocumentId(req.params.id);
  if (!documentIdResult.ok) {
    return next(documentIdResult.error);
  }

  const parsed = requestAccessSchema.safeParse(req.body || {});
  if (!parsed.success) {
    const details = parsed.error.issues.map((issue) => ({
      field: issue.path.join("."),
      message: issue.message,
    }));

    return next({
      statusCode: 400,
      code: "VALIDATION_ERROR",
      message: "Invalid access request payload",
      details,
    });
  }

  try {
    const documentId = documentIdResult.data;
    const resourceLookup = await findResourceById(documentId);
    const document = resourceLookup?.document;

    if (!document) {
      return next({
        statusCode: 404,
        code: "DOCUMENT_NOT_FOUND",
        message: "Document not found",
      });
    }

    if (document.access_tier !== "RESTRICTED") {
      return next({
        statusCode: 400,
        code: "NOT_RESTRICTED",
        message: "This document does not require an access request",
      });
    }

    if (sameDocumentOwner(document, req.user)) {
      return next({
        statusCode: 400,
        code: "OWN_DOCUMENT",
        message: "You already have full access to your own document",
      });
    }

    const existing = await documentAccessRequests.findByRequesterAndDocument({
      requesterId: req.user.id,
      documentId,
      resourceTable: resourceLookup.table,
    });

    if (existing && (existing.status === "PENDING" || existing.status === "APPROVED")) {
      return res.status(409).json({
        success: false,
        error: existing.status === "APPROVED" ? "You already have access to this document" : "You already have a pending request for this document",
        code: existing.status === "APPROVED" ? "ALREADY_APPROVED" : "ALREADY_REQUESTED",
        data: { request: formatRequestRow(existing, document.title) },
      });
    }

    const created = await documentAccessRequests.createRequest({
      documentId,
      resourceTable: resourceLookup.table,
      requesterId: req.user.id,
      authorId: document.uploader_id,
      message: parsed.data.message,
    });

    const requesterName = req.user.email || `User ${req.user.id}`;
    await notifyUser({
      userId: document.uploader_id,
      eventType: "document_access_request_submitted",
      title: "New access request",
      message: `${requesterName} requested access to "${document.title || "your document"}".`,
      metadata: {
        requestId: created.id,
        documentId,
        resourceTable: resourceLookup.table,
        requesterName,
        message: parsed.data.message || null,
      },
    });

    return res.status(201).json({
      success: true,
      message: "Access request submitted",
      data: { request: formatRequestRow(created, document.title) },
    });
  } catch (error) {
    return next(error);
  }
}

async function listMine(req, res, next) {
  try {
    const rows = await documentAccessRequests.listByRequester(req.user.id);
    const items = await hydrateTitles(rows.map((row) => ({ ...row, requester_name: null, requester_email: null })));

    return res.status(200).json({
      success: true,
      data: { items },
    });
  } catch (error) {
    return next(error);
  }
}

async function listIncoming(req, res, next) {
  try {
    const status = typeof req.query.status === "string" ? req.query.status.toUpperCase() : undefined;
    const rows = await documentAccessRequests.listByAuthor(req.user.id, { status });
    const items = await hydrateTitles(rows);

    return res.status(200).json({
      success: true,
      data: { items },
    });
  } catch (error) {
    return next(error);
  }
}

async function decide(req, res, next) {
  const requestId = Number(req.params.requestId);
  if (!Number.isInteger(requestId) || requestId <= 0) {
    return next({
      statusCode: 400,
      code: "INVALID_REQUEST_ID",
      message: "Request id must be a positive integer",
    });
  }

  const parsed = decisionSchema.safeParse(req.body || {});
  if (!parsed.success) {
    const details = parsed.error.issues.map((issue) => ({
      field: issue.path.join("."),
      message: issue.message,
    }));

    return next({
      statusCode: 400,
      code: "VALIDATION_ERROR",
      message: "Invalid decision payload",
      details,
    });
  }

  try {
    const existing = await documentAccessRequests.findById(requestId);
    if (!existing) {
      return next({
        statusCode: 404,
        code: "ACCESS_REQUEST_NOT_FOUND",
        message: "Access request not found",
      });
    }

    const isAuthor = Number(existing.author_id) === Number(req.user.id);
    if (!isAuthor && req.user.role !== "ADMIN") {
      return next({
        statusCode: 403,
        code: "FORBIDDEN",
        message: "Only the document author or an admin can decide this request",
      });
    }

    if (existing.status !== "PENDING") {
      return next({
        statusCode: 409,
        code: "ACCESS_REQUEST_ALREADY_DECIDED",
        message: "This request has already been decided",
      });
    }

    const decision = parsed.data.decision;
    const updated = await documentAccessRequests.decide(requestId, {
      status: decision,
      decidedBy: req.user.id,
    });

    const document = await db(existing.resource_table).where({ id: existing.document_id }).first(["title"]);

    await notifyUser({
      userId: existing.requester_id,
      eventType: "document_access_request_decided",
      title: decision === "APPROVED" ? "Access request approved" : "Access request rejected",
      message:
        decision === "APPROVED"
          ? `Your request to access "${document?.title || "the document"}" was approved.`
          : `Your request to access "${document?.title || "the document"}" was rejected.`,
      metadata: {
        requestId: updated.id,
        documentId: existing.document_id,
        resourceTable: existing.resource_table,
        status: decision,
      },
    });

    return res.status(200).json({
      success: true,
      message: `Access request ${decision.toLowerCase()}`,
      data: { request: formatRequestRow(updated, document?.title) },
    });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  requestAccess,
  listMine,
  listIncoming,
  decide,
};
