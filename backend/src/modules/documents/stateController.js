const db = require("../../db");
const {
  validateDocumentId,
  validateStatePayload,
  validateTransition,
  validateRolePermission,
} = require("./stateValidator");

function formatDocument(document) {
  return {
    id: document.id,
    title: document.title,
    state: document.state,
    accessTier: document.access_tier,
    uploaderId: document.uploader_id,
    updatedAt: document.updated_at,
  };
}

async function patchDocumentState(req, res, next) {
  const idResult = validateDocumentId(req.params.id);
  if (!idResult.ok) {
    return next(idResult.error);
  }

  const payloadResult = validateStatePayload(req.body);
  if (!payloadResult.ok) {
    return next(payloadResult.error);
  }

  try {
    const documentId = idResult.data;
    const nextState = payloadResult.data.state;

    const document = await db("documents").where({ id: documentId }).first();

    if (!document) {
      return next({
        statusCode: 404,
        code: "DOCUMENT_NOT_FOUND",
        message: "Document not found",
      });
    }

    const transitionResult = validateTransition(document.state, nextState);
    if (!transitionResult.ok) {
      return next(transitionResult.error);
    }

    const permissionResult = validateRolePermission(document, req.user, nextState);
    if (!permissionResult.ok) {
      return next(permissionResult.error);
    }

    await db("documents")
      .where({ id: documentId })
      .update({
        state: nextState,
        updated_at: db.fn.now(),
      });

    const updatedDocument = await db("documents").where({ id: documentId }).first();

    return res.status(200).json({
      success: true,
      message: "Document lifecycle state updated",
      data: {
        document: formatDocument(updatedDocument),
        transition: {
          from: document.state,
          to: nextState,
          changedBy: req.user.id,
          changedAt: updatedDocument.updated_at,
        },
      },
    });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  patchDocumentState,
};