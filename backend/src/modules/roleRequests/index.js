const { Router } = require("express");
const { z } = require("zod");

const db = require("../../db");
const requireAuth = require("../../api/middlewares/requireAuth");
const requireAdmin = require("../../api/middlewares/requireAdmin");
const roleRequestsRepository = require("../../db/repositories/roleRequests");
const usersRepository = require("../../db/repositories/users");

const router = Router();

const requestableRoles = ["ADMIN", "MEMBER", "CONTRIBUTOR", "LAB_MANAGER", "STAFF", "REVIEWER"];

const createRequestSchema = z.object({
  requestedRole: z.enum(requestableRoles),
  reason: z.string().trim().min(1, "Reason is required"),
});

const decisionSchema = z.object({
  decision: z.enum(["APPROVED", "REJECTED"]),
});

function formatRequest(row) {
  return {
    id: row.id,
    userId: row.user_id,
    requestedRole: row.requested_role,
    reason: row.reason,
    status: row.status,
    decidedBy: row.decided_by ?? null,
    decidedAt: row.decided_at ?? null,
    createdAt: row.created_at,
    requesterName: row.requester_name,
    requesterEmail: row.requester_email,
    requesterCurrentRole: row.requester_current_role,
  };
}

async function notifyAdminsOfNewRequest(requester, requestedRole, reason) {
  try {
    const admins = await db("users").select("id").where({ role: "ADMIN" });
    const requesterLabel = requester.name || requester.email || `User ${requester.id}`;

    const rows = admins
      .filter((admin) => admin.id !== requester.id)
      .map((admin) => ({
        user_id: admin.id,
        event_type: "role_request_submitted",
        title: "New role upgrade request",
        message: `${requesterLabel} requested to become ${requestedRole}. Reason: ${reason}`,
        is_read: false,
        created_at: db.fn.now(),
      }));

    if (rows.length > 0) {
      await db("notifications").insert(rows);
    }
  } catch (error) {
    console.error("[roleRequests] Failed to notify admins of new request:", error.message);
  }
}

async function notifyRequesterOfDecision(userId, requestedRole, decision) {
  try {
    const title = decision === "APPROVED" ? "Role upgrade approved" : "Role upgrade rejected";
    const message =
      decision === "APPROVED"
        ? `Your request to become ${requestedRole} was approved. Log in again to see your updated role.`
        : `Your request to become ${requestedRole} was rejected.`;

    await db("notifications").insert({
      user_id: userId,
      event_type: "role_request_decided",
      title,
      message,
      is_read: false,
      created_at: db.fn.now(),
    });
  } catch (error) {
    console.error("[roleRequests] Failed to notify requester of decision:", error.message);
  }
}

router.use(requireAuth);

router.post("/", async (req, res, next) => {
  const parsed = createRequestSchema.safeParse(req.body);
  if (!parsed.success) {
    const details = parsed.error.issues.map((issue) => ({
      field: issue.path.join("."),
      message: issue.message,
    }));

    return next({
      statusCode: 400,
      code: "VALIDATION_ERROR",
      message: "Invalid role request payload",
      details,
    });
  }

  try {
    const requester = await db("users")
      .select("id", "name", "email")
      .where({ id: req.auth.id })
      .first();

    const created = await roleRequestsRepository.createRequest({
      userId: req.auth.id,
      requestedRole: parsed.data.requestedRole,
      reason: parsed.data.reason,
    });

    await notifyAdminsOfNewRequest(requester || req.auth, parsed.data.requestedRole, parsed.data.reason);

    return res.status(201).json({
      success: true,
      message: "Role upgrade request submitted",
      data: { request: created },
    });
  } catch (error) {
    return next(error);
  }
});

router.get("/mine", async (req, res, next) => {
  try {
    const rows = await roleRequestsRepository.listRequestsByUser(req.auth.id);

    return res.status(200).json({
      success: true,
      data: {
        items: rows.map((row) => ({
          id: row.id,
          requestedRole: row.requested_role,
          reason: row.reason,
          status: row.status,
          decidedAt: row.decided_at,
          createdAt: row.created_at,
        })),
      },
    });
  } catch (error) {
    return next(error);
  }
});

router.get("/", requireAdmin, async (req, res, next) => {
  try {
    const status = typeof req.query.status === "string" ? req.query.status.toUpperCase() : undefined;
    const rows = await roleRequestsRepository.listRequests({ status });

    return res.status(200).json({
      success: true,
      data: { items: rows.map(formatRequest) },
    });
  } catch (error) {
    return next(error);
  }
});

router.patch("/:id/decision", requireAdmin, async (req, res, next) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    return next({
      statusCode: 400,
      code: "INVALID_REQUEST_ID",
      message: "Request id must be a positive integer",
    });
  }

  const parsed = decisionSchema.safeParse(req.body);
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
    const existing = await roleRequestsRepository.findById(id);
    if (!existing) {
      return next({
        statusCode: 404,
        code: "ROLE_REQUEST_NOT_FOUND",
        message: "Role request not found",
      });
    }

    if (existing.status !== "PENDING") {
      return next({
        statusCode: 409,
        code: "ROLE_REQUEST_ALREADY_DECIDED",
        message: "This request has already been decided",
      });
    }

    const decision = parsed.data.decision;

    const updated = await roleRequestsRepository.decideRequest(id, {
      status: decision,
      decidedBy: req.auth.id,
    });

    if (decision === "APPROVED") {
      await usersRepository.updateUserRoleById(existing.user_id, existing.requested_role);
    }

    await notifyRequesterOfDecision(existing.user_id, existing.requested_role, decision);

    return res.status(200).json({
      success: true,
      message: `Role request ${decision.toLowerCase()}`,
      data: { request: updated },
    });
  } catch (error) {
    return next(error);
  }
});

module.exports = router;
