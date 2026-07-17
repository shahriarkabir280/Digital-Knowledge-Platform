/**
 * Borrow Requests Repository — member-initiated, librarian-approved.
 *
 * A member requests to borrow an item that currently HAS available copies
 * (contrast with `holds`, which queue members for UNAVAILABLE items). A
 * librarian (STAFF/LAB_MANAGER/ADMIN) reviews the request and either
 * approves it — which performs the actual checkout via loansRepository.checkout
 * (re-validating availability/subscription there) — or rejects it.
 */

const db = require("../index");
const loansRepository = require("./loans");
const notificationsRepo = require("./notifications");

/**
 * Create a pending borrow request.
 */
async function create(catalogItemId, memberId) {
  const request = await db.transaction(async (trx) => {
    const item = await trx("catalog_items")
      .where({ id: catalogItemId })
      .whereNot("state", "WITHDRAWN")
      .first();

    if (!item) {
      throw Object.assign(new Error("Catalog item not found"), {
        statusCode: 404,
        code: "CATALOG_ITEM_NOT_FOUND",
      });
    }

    if ((item.available_copies || 0) < 1) {
      throw Object.assign(
        new Error("No copies available — place a hold instead"),
        { statusCode: 409, code: "NO_COPIES_AVAILABLE" }
      );
    }

    const subscriptionsRepo = require("./subscriptions");
    const activeSubscription = await subscriptionsRepo.getActive(memberId, trx);
    if (!activeSubscription) {
      throw Object.assign(
        new Error("You need an active library subscription to borrow physical items"),
        { statusCode: 409, code: "NO_ACTIVE_SUBSCRIPTION" }
      );
    }

    const existingPending = await trx("borrow_requests")
      .where({ item_id: catalogItemId, member_id: memberId, status: "PENDING" })
      .first();
    if (existingPending) {
      throw Object.assign(
        new Error("You already have a pending request for this item"),
        { statusCode: 409, code: "REQUEST_ALREADY_PENDING" }
      );
    }

    const existingLoan = await trx("loans")
      .where({ item_id: catalogItemId, member_id: memberId, status: "ACTIVE" })
      .first();
    if (existingLoan) {
      throw Object.assign(
        new Error("You already have this item checked out"),
        { statusCode: 409, code: "ALREADY_CHECKED_OUT" }
      );
    }

    const existingHold = await trx("holds")
      .where({ item_id: catalogItemId, member_id: memberId })
      .whereIn("status", ["QUEUED", "READY"])
      .first();
    if (existingHold) {
      throw Object.assign(
        new Error("You already have a hold on this item"),
        { statusCode: 409, code: "HOLD_ALREADY_EXISTS" }
      );
    }

    const [inserted] = await trx("borrow_requests")
      .insert({
        item_id: catalogItemId,
        member_id: memberId,
        status: "PENDING",
        requested_at: trx.fn.now(),
        created_at: trx.fn.now(),
        updated_at: trx.fn.now(),
      })
      .returning("*");

    return { ...inserted, _itemTitle: item.title };
  });

  // Best-effort, after commit — a notification failure must not roll back
  // the request that was just successfully created.
  await notificationsRepo.notifyLibrarians({
    eventType: "borrow_request_created",
    title: "New borrow request",
    message: `A member requested to borrow "${request._itemTitle || 'a catalog item'}".`,
    metadata: { requestId: request.id, itemId: request.item_id, memberId: request.member_id },
  });

  delete request._itemTitle;
  return request;
}

/**
 * All pending requests, for the librarian queue.
 */
async function findPending() {
  return db("borrow_requests")
    .join("catalog_items", "borrow_requests.item_id", "catalog_items.id")
    .join("users", "borrow_requests.member_id", "users.id")
    .select(
      "borrow_requests.*",
      "catalog_items.title as item_title",
      "catalog_items.authors as item_author",
      "catalog_items.available_copies as item_available_copies",
      "users.name as member_name",
      "users.email as member_email"
    )
    .where("borrow_requests.status", "PENDING")
    .orderBy("borrow_requests.requested_at", "asc");
}

/**
 * A member's own requests (all statuses), most recent first.
 */
async function findByMember(memberId) {
  return db("borrow_requests")
    .join("catalog_items", "borrow_requests.item_id", "catalog_items.id")
    .select(
      "borrow_requests.*",
      "catalog_items.title as item_title",
      "catalog_items.authors as item_author",
      "catalog_items.cover_image as item_cover"
    )
    .where("borrow_requests.member_id", memberId)
    .orderBy("borrow_requests.created_at", "desc");
}

async function findById(requestId) {
  return db("borrow_requests").where({ id: requestId }).first();
}

/**
 * Approve a pending request: performs the actual checkout (which re-checks
 * availability/subscription/hold-precedence) and links the resulting loan.
 */
async function approve(requestId, staffId, loanDays) {
  const request = await findById(requestId);

  if (!request) {
    throw Object.assign(new Error("Borrow request not found"), {
      statusCode: 404,
      code: "REQUEST_NOT_FOUND",
    });
  }

  if (request.status !== "PENDING") {
    throw Object.assign(
      new Error("Only pending requests can be approved"),
      { statusCode: 409, code: "REQUEST_INVALID_STATUS" }
    );
  }

  // checkout() runs its own transaction (locks the item row, decrements
  // available_copies, re-validates subscription/holds) — deliberately not
  // nested inside another transaction here.
  const loan = await loansRepository.checkout(
    request.item_id,
    request.member_id,
    loanDays,
    staffId
  );

  const [updated] = await db("borrow_requests")
    .where({ id: requestId })
    .update({
      status: "APPROVED",
      decided_at: db.fn.now(),
      decided_by: staffId,
      loan_id: loan.id,
      updated_at: db.fn.now(),
    })
    .returning("*");

  const item = await db("catalog_items").where({ id: request.item_id }).first();
  await notificationsRepo.notifyUser({
    userId: request.member_id,
    eventType: "borrow_request_approved",
    title: "Borrow request approved",
    message: `"${item?.title || 'Your item'}" is ready — due ${new Date(loan.due_date).toLocaleDateString()}.`,
    metadata: { requestId, loanId: loan.id, itemId: request.item_id },
  });

  return { request: updated, loan };
}

async function reject(requestId, staffId, reason) {
  const request = await findById(requestId);

  if (!request) {
    throw Object.assign(new Error("Borrow request not found"), {
      statusCode: 404,
      code: "REQUEST_NOT_FOUND",
    });
  }

  if (request.status !== "PENDING") {
    throw Object.assign(
      new Error("Only pending requests can be rejected"),
      { statusCode: 409, code: "REQUEST_INVALID_STATUS" }
    );
  }

  const [updated] = await db("borrow_requests")
    .where({ id: requestId })
    .update({
      status: "REJECTED",
      decided_at: db.fn.now(),
      decided_by: staffId,
      reject_reason: reason || null,
      updated_at: db.fn.now(),
    })
    .returning("*");

  const item = await db("catalog_items").where({ id: request.item_id }).first();
  await notificationsRepo.notifyUser({
    userId: request.member_id,
    eventType: "borrow_request_rejected",
    title: "Borrow request rejected",
    message: reason
      ? `Your request for "${item?.title || 'an item'}" was rejected: ${reason}`
      : `Your request for "${item?.title || 'an item'}" was rejected.`,
    metadata: { requestId, itemId: request.item_id },
  });

  return updated;
}

/**
 * Member cancels their own pending request.
 */
async function cancel(requestId, memberId) {
  const request = await findById(requestId);

  if (!request) {
    throw Object.assign(new Error("Borrow request not found"), {
      statusCode: 404,
      code: "REQUEST_NOT_FOUND",
    });
  }

  if (Number(request.member_id) !== Number(memberId)) {
    throw Object.assign(new Error("You can only cancel your own requests"), {
      statusCode: 403,
      code: "REQUEST_NOT_YOURS",
    });
  }

  if (request.status !== "PENDING") {
    throw Object.assign(
      new Error("Only pending requests can be cancelled"),
      { statusCode: 409, code: "REQUEST_INVALID_STATUS" }
    );
  }

  const [updated] = await db("borrow_requests")
    .where({ id: requestId })
    .update({ status: "CANCELLED", updated_at: db.fn.now() })
    .returning("*");

  return updated;
}

module.exports = {
  create,
  findPending,
  findByMember,
  findById,
  approve,
  reject,
  cancel,
};
