const { z } = require("zod");

const DOCUMENT_STATES = Object.freeze({
  DRAFT: "draft",
  REVIEW: "review",
  PUBLISHED: "published",
  ARCHIVED: "archived",
});

const lifecycleSchema = z.object({
  state: z.enum(Object.values(DOCUMENT_STATES)),
  note: z.string().trim().max(1000).optional(),
});

const allowedTransitions = {
  [DOCUMENT_STATES.DRAFT]: [DOCUMENT_STATES.REVIEW],
  [DOCUMENT_STATES.REVIEW]: [DOCUMENT_STATES.PUBLISHED, DOCUMENT_STATES.DRAFT],
  [DOCUMENT_STATES.PUBLISHED]: [DOCUMENT_STATES.ARCHIVED],
  [DOCUMENT_STATES.ARCHIVED]: [],
};

const rolePolicyByTargetState = {
  [DOCUMENT_STATES.DRAFT]: [
    "REVIEWER",
    "STAFF",
    "LAB_MANAGER",
    "ADMIN",
  ],
  [DOCUMENT_STATES.REVIEW]: [
    "CONTRIBUTOR",
    "STAFF",
    "LAB_MANAGER",
    "ADMIN",
  ],
  [DOCUMENT_STATES.PUBLISHED]: [
    "REVIEWER",
    "STAFF",
    "LAB_MANAGER",
    "ADMIN",
  ],
  [DOCUMENT_STATES.ARCHIVED]: ["STAFF", "LAB_MANAGER", "ADMIN"],
};

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

function validateStatePayload(payload) {
  const parsed = lifecycleSchema.safeParse(payload);

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
        message: "Invalid lifecycle state payload",
        details,
      },
    };
  }

  return {
    ok: true,
    data: parsed.data,
  };
}

function validateTransition(currentState, nextState) {
  if (currentState === nextState) {
    return {
      ok: false,
      error: {
        statusCode: 400,
        code: "STATE_UNCHANGED",
        message: `Document is already in '${nextState}' state`,
      },
    };
  }

  const allowedNext = allowedTransitions[currentState] || [];

  if (!allowedNext.includes(nextState)) {
    return {
      ok: false,
      error: {
        statusCode: 400,
        code: "INVALID_STATE_TRANSITION",
        message: `Transition from '${currentState}' to '${nextState}' is not allowed`,
      },
    };
  }

  return { ok: true };
}

function validateTransitionNote(currentState, nextState, note) {
  const requiresNote =
    currentState === DOCUMENT_STATES.REVIEW &&
    (nextState === DOCUMENT_STATES.PUBLISHED || nextState === DOCUMENT_STATES.DRAFT);

  if (!requiresNote) {
    return { ok: true };
  }

  if (typeof note !== "string" || note.trim().length === 0) {
    return {
      ok: false,
      error: {
        statusCode: 400,
        code: "TRANSITION_NOTE_REQUIRED",
        message: "A review note is required when publishing or rejecting a document",
      },
    };
  }

  return { ok: true };
}

function canMoveToReview(document, user) {
  if (document.uploader_id === user.id) {
    return true;
  }

  const allowedRoles = rolePolicyByTargetState[DOCUMENT_STATES.REVIEW] || [];
  return allowedRoles.includes(user.role);
}

function validateRolePermission(document, user, nextState) {
  if (nextState === DOCUMENT_STATES.REVIEW) {
    if (canMoveToReview(document, user)) {
      return { ok: true };
    }

    return {
      ok: false,
      error: {
        statusCode: 403,
        code: "FORBIDDEN_STATE_TRANSITION",
        message: "You are not allowed to move this document to review",
      },
    };
  }

  const allowedRoles = rolePolicyByTargetState[nextState] || [];
  if (allowedRoles.includes(user.role)) {
    return { ok: true };
  }

  return {
    ok: false,
    error: {
      statusCode: 403,
      code: "FORBIDDEN_STATE_TRANSITION",
      message: `Role '${user.role}' is not allowed to move document to '${nextState}'`,
    },
  };
}

module.exports = {
  DOCUMENT_STATES,
  validateDocumentId,
  validateStatePayload,
  validateTransition,
  validateTransitionNote,
  validateRolePermission,
};