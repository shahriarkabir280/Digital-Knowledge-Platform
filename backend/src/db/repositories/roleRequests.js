const db = require("../index");

function createRequest({ userId, requestedRole, reason }, trx = db) {
  return trx("role_change_requests")
    .insert({
      user_id: userId,
      requested_role: requestedRole,
      reason,
      status: "PENDING",
      created_at: trx.fn.now(),
    })
    .returning(["id", "user_id", "requested_role", "reason", "status", "created_at"])
    .then((rows) => rows[0]);
}

function listRequests({ status } = {}, trx = db) {
  const query = trx("role_change_requests as r")
    .join("users as u", "r.user_id", "u.id")
    .select(
      "r.id",
      "r.user_id",
      "r.requested_role",
      "r.reason",
      "r.status",
      "r.decided_by",
      "r.decided_at",
      "r.created_at",
      "u.name as requester_name",
      "u.email as requester_email",
      "u.role as requester_current_role",
    )
    .orderBy("r.created_at", "desc");

  if (status) {
    query.where("r.status", status);
  }

  return query;
}

function listRequestsByUser(userId, trx = db) {
  return trx("role_change_requests")
    .select(["id", "requested_role", "reason", "status", "decided_at", "created_at"])
    .where({ user_id: userId })
    .orderBy("created_at", "desc");
}

function findById(id, trx = db) {
  return trx("role_change_requests").where({ id }).first();
}

async function decideRequest(id, { status, decidedBy }, trx = db) {
  const rows = await trx("role_change_requests")
    .where({ id })
    .update({
      status,
      decided_by: decidedBy,
      decided_at: trx.fn.now(),
    })
    .returning(["id", "user_id", "requested_role", "reason", "status", "decided_by", "decided_at", "created_at"]);

  return rows[0] || null;
}

module.exports = {
  createRequest,
  listRequests,
  listRequestsByUser,
  findById,
  decideRequest,
};
