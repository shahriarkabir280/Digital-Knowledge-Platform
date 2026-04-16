const db = require("../../db");
const {
  validateDocumentId,
  validateStatePayload,
  validateTransition,
  validateTransitionNote,
  validateRolePermission,
} = require("./stateValidator");

const STAFF_NOTIFICATION_ROLES = ["STAFF", "LAB_MANAGER", "REVIEWER", "ADMIN"];

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

function buildTransitionNotification(document, fromState, toState, actorName, note) {
  const eventType = `document_${toState}`;
  const noteSuffix = note ? ` Reason: ${note}` : "";

  if (toState === "review") {
    return {
      eventType,
      title: "New document submitted for review",
      message: `"${document.title}" was submitted for review by ${actorName}.${noteSuffix}`,
    };
  }

  if (fromState === "review" && toState === "published") {
    return {
      eventType,
      title: "Document approved and published",
      message: `Your document "${document.title}" was approved and published by ${actorName}.${noteSuffix}`,
    };
  }

  if (fromState === "review" && toState === "draft") {
    return {
      eventType,
      title: "Revision requested",
      message: `Your document "${document.title}" was returned to draft by ${actorName}.${noteSuffix}`,
    };
  }

  if (toState === "archived") {
    return {
      eventType,
      title: "Document archived",
      message: `"${document.title}" was archived by ${actorName}.${noteSuffix}`,
    };
  }

  return {
    eventType,
    title: "Document status updated",
    message: `"${document.title}" moved from ${fromState} to ${toState} by ${actorName}.${noteSuffix}`,
  };
}

async function createTransitionNotifications(trx, document, fromState, toState, actor, note) {
  const notification = buildTransitionNotification(document, fromState, toState, actor.name || actor.email || `User ${actor.id}`, note);

  const recipientIds = new Set();

  // Flow 1: draft -> review (submission arrives for reviewer/staff).
  if (toState === "review") {
    const staffUsers = await trx("users")
      .select("id")
      .whereIn("role", STAFF_NOTIFICATION_ROLES);

    staffUsers.forEach((user) => {
      if (user.id !== actor.id) {
        recipientIds.add(user.id);
      }
    });
  }

  // Flow 2: review -> published or review -> draft (decision sent back to requester/uploader).
  if (fromState === "review" && (toState === "published" || toState === "draft")) {
    if (document.uploader_id !== actor.id) {
      recipientIds.add(document.uploader_id);
    }
  }

  if (recipientIds.size === 0) {
    return;
  }

  const rows = Array.from(recipientIds).map((userId) => ({
    user_id: userId,
    document_id: document.id,
    event_type: notification.eventType,
    title: notification.title,
    message: notification.message,
    is_read: false,
    created_at: trx.fn.now(),
  }));

  await trx("notifications").insert(rows);
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
    const note = payloadResult.data.note ? payloadResult.data.note.trim() : null;

    const actor = await db("users")
      .select("id", "name", "email")
      .where({ id: req.user.id })
      .first();

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

    const noteResult = validateTransitionNote(document.state, nextState, note);
    if (!noteResult.ok) {
      return next(noteResult.error);
    }

    const permissionResult = validateRolePermission(document, req.user, nextState);
    if (!permissionResult.ok) {
      return next(permissionResult.error);
    }

    const updatedDocument = await db.transaction(async (trx) => {
      await trx("documents")
        .where({ id: documentId })
        .update({
          state: nextState,
          updated_at: trx.fn.now(),
        });

      await trx("document_state_logs").insert({
        document_id: documentId,
        from_state: document.state,
        to_state: nextState,
        note,
        changed_by: req.user.id,
        created_at: trx.fn.now(),
      });

      await createTransitionNotifications(trx, document, document.state, nextState, actor || req.user, note);

      return trx("documents").where({ id: documentId }).first();
    });

    return res.status(200).json({
      success: true,
      message: "Document lifecycle state updated",
      data: {
        document: formatDocument(updatedDocument),
        transition: {
          from: document.state,
          to: nextState,
          note,
          changedBy: req.user.id,
          changedAt: updatedDocument.updated_at,
        },
      },
    });
  } catch (error) {
    return next(error);
  }
}

async function getDocumentAuditLogs(req, res, next) {
  const idResult = validateDocumentId(req.params.id);
  if (!idResult.ok) {
    return next(idResult.error);
  }

  try {
    const documentId = idResult.data;
    const document = await db("documents").where({ id: documentId }).first();

    if (!document) {
      return next({
        statusCode: 404,
        code: "DOCUMENT_NOT_FOUND",
        message: "Document not found",
      });
    }

    const isPrivileged = STAFF_NOTIFICATION_ROLES.includes(req.user.role);
    const isOwner = document.uploader_id === req.user.id;

    if (!isPrivileged && !isOwner) {
      return next({
        statusCode: 403,
        code: "FORBIDDEN",
        message: "You are not allowed to view this document audit log",
      });
    }

    const rows = await db("document_state_logs as l")
      .leftJoin("users as u", "l.changed_by", "u.id")
      .select(
        "l.id",
        "l.document_id",
        "l.from_state",
        "l.to_state",
        "l.note",
        "l.changed_by",
        "l.created_at",
        db.raw("u.name as changed_by_name"),
        db.raw("u.email as changed_by_email"),
      )
      .where({ "l.document_id": documentId })
      .orderBy("l.created_at", "desc");

    return res.status(200).json({
      success: true,
      data: {
        items: rows.map((row) => ({
          id: row.id,
          documentId: row.document_id,
          from: row.from_state,
          to: row.to_state,
          note: row.note || null,
          changedBy: row.changed_by,
          changedByName: row.changed_by_name || null,
          changedByEmail: row.changed_by_email || null,
          changedAt: row.created_at,
        })),
      },
      message: rows.length > 0 ? "Audit logs fetched" : "No audit logs found",
    });
  } catch (error) {
    return next(error);
  }
}

async function getMyNotifications(req, res, next) {
  try {
    const limit = Math.min(Math.max(Number(req.query.limit) || 30, 1), 100);

    const rows = await db("notifications")
      .select("id", "document_id", "event_type", "title", "message", "is_read", "created_at")
      .where({ user_id: req.user.id })
      .orderBy("created_at", "desc")
      .limit(limit);

    return res.status(200).json({
      success: true,
      data: {
        items: rows.map((row) => ({
          id: row.id,
          documentId: row.document_id,
          eventType: row.event_type,
          title: row.title,
          message: row.message,
          isRead: row.is_read,
          createdAt: row.created_at,
        })),
      },
      message: rows.length > 0 ? "Notifications fetched" : "No notifications found",
    });
  } catch (error) {
    return next(error);
  }
}

async function markNotificationRead(req, res, next) {
  const notificationId = Number(req.params.notificationId);
  if (!Number.isInteger(notificationId) || notificationId <= 0) {
    return next({
      statusCode: 400,
      code: "INVALID_NOTIFICATION_ID",
      message: "Notification id must be a positive integer",
    });
  }

  try {
    const updated = await db("notifications")
      .where({ id: notificationId, user_id: req.user.id })
      .update({ is_read: true })
      .returning(["id", "is_read"]);

    if (!updated || updated.length === 0) {
      return next({
        statusCode: 404,
        code: "NOTIFICATION_NOT_FOUND",
        message: "Notification not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Notification marked as read",
      data: {
        id: updated[0].id,
        isRead: updated[0].is_read,
      },
    });
  } catch (error) {
    return next(error);
  }
}

async function markAllNotificationsRead(req, res, next) {
  try {
    const updated = await db("notifications")
      .where({ user_id: req.user.id, is_read: false })
      .update({ is_read: true });

    return res.status(200).json({
      success: true,
      message: "All notifications marked as read",
      data: {
        updatedCount: Number(updated) || 0,
      },
    });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  patchDocumentState,
  getDocumentAuditLogs,
  getMyNotifications,
  markNotificationRead,
  markAllNotificationsRead,
};