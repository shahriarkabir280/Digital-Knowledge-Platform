const db = require("../index");

function createRequest({ documentId, resourceTable, requesterId, authorId, message }, trx = db) {
  return trx("document_access_requests")
    .insert({
      document_id: documentId,
      resource_table: resourceTable,
      requester_id: requesterId,
      author_id: authorId,
      message: message || null,
      status: "PENDING",
      created_at: trx.fn.now(),
      updated_at: trx.fn.now(),
    })
    .returning("*")
    .then((rows) => rows[0]);
}

function findByRequesterAndDocument({ requesterId, documentId, resourceTable }, trx = db) {
  return trx("document_access_requests")
    .where({ requester_id: requesterId, document_id: documentId, resource_table: resourceTable })
    .orderBy("created_at", "desc")
    .first();
}

async function hasApprovedAccess({ requesterId, documentId, resourceTable }, trx = db) {
  const row = await trx("document_access_requests")
    .where({
      requester_id: requesterId,
      document_id: documentId,
      resource_table: resourceTable,
      status: "APPROVED",
    })
    .first();

  return Boolean(row);
}

function listByRequester(requesterId, trx = db) {
  return trx("document_access_requests")
    .where({ requester_id: requesterId })
    .orderBy("created_at", "desc");
}

function listByAuthor(authorId, { status } = {}, trx = db) {
  const query = trx("document_access_requests as r")
    .join("users as u", "r.requester_id", "u.id")
    .select(
      "r.id",
      "r.document_id",
      "r.resource_table",
      "r.requester_id",
      "r.author_id",
      "r.message",
      "r.status",
      "r.decided_by",
      "r.decided_at",
      "r.created_at",
      "u.name as requester_name",
      "u.email as requester_email",
    )
    .where("r.author_id", authorId)
    .orderBy("r.created_at", "desc");

  if (status) {
    query.andWhere("r.status", status);
  }

  return query;
}

function findById(id, trx = db) {
  return trx("document_access_requests").where({ id }).first();
}

async function decide(id, { status, decidedBy }, trx = db) {
  const rows = await trx("document_access_requests")
    .where({ id })
    .update({
      status,
      decided_by: decidedBy,
      decided_at: trx.fn.now(),
      updated_at: trx.fn.now(),
    })
    .returning("*");

  return rows[0] || null;
}

module.exports = {
  createRequest,
  findByRequesterAndDocument,
  hasApprovedAccess,
  listByRequester,
  listByAuthor,
  findById,
  decide,
};
