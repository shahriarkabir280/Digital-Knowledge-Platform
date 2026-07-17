/**
 * Loans Repository — adapted to actual Supabase schema.
 *
 * Actual column names:
 *   item_id (not catalog_item_id), renewed_count (not renewal_count)
 *   copy_id, issued_by, returned_to, fine_amount, fine_paid
 */

const db = require("../index");

const DEFAULT_LOAN_DAYS = 14;
const RENEWAL_EXTENSION_DAYS = 7;
const MAX_RENEWALS = 2;

// ── Checkout ───────────────────────────────────────────────────────

async function checkout(catalogItemId, memberId, loanDays = DEFAULT_LOAN_DAYS, issuedBy = null) {
  return db.transaction(async (trx) => {
    // Lock the catalog item row
    const item = await trx("catalog_items")
      .where({ id: catalogItemId })
      .whereNot("state", "WITHDRAWN")
      .forUpdate()
      .first();

    if (!item) {
      throw Object.assign(new Error("Catalog item not found"), {
        statusCode: 404,
        code: "CATALOG_ITEM_NOT_FOUND",
      });
    }

    if (item.available_copies < 1) {
      throw Object.assign(new Error("No copies available for checkout"), {
        statusCode: 409,
        code: "NO_COPIES_AVAILABLE",
      });
    }

    // Physical (offline) borrowing requires an active monthly subscription.
    // Enforced here so it applies uniformly to staff walk-up checkout and to
    // borrow-request approval (both funnel through this function).
    const subscriptionsRepo = require("./subscriptions");
    const activeSubscription = await subscriptionsRepo.getActive(memberId, trx);
    if (!activeSubscription) {
      throw Object.assign(
        new Error("Member does not have an active library subscription"),
        { statusCode: 409, code: "NO_ACTIVE_SUBSCRIPTION" }
      );
    }

    // Check if member already has this item checked out
    const existingLoan = await trx("loans")
      .where({ item_id: catalogItemId, member_id: memberId, status: "ACTIVE" })
      .first();

    if (existingLoan) {
      throw Object.assign(
        new Error("Member already has this item checked out"),
        { statusCode: 409, code: "ALREADY_CHECKED_OUT" }
      );
    }

    // ── Hold reservation (FR-DKP-019) ──────────────────────────────
    // READY holds reserve copies. If this member has a READY hold, we
    // consume it. Otherwise every available copy that is spoken for by
    // someone else's READY hold is off-limits to a walk-up checkout.
    const myReadyHold = await trx("holds")
      .where({ item_id: catalogItemId, member_id: memberId, status: "READY" })
      .forUpdate()
      .first();

    const readyCount = await trx("holds")
      .where({ item_id: catalogItemId, status: "READY" })
      .count("* as c")
      .first();
    const readyHolds = parseInt(readyCount?.c || 0, 10);

    // Copies reserved for OTHER members' ready holds.
    const reservedByOthers = myReadyHold ? readyHolds - 1 : readyHolds;
    if (item.available_copies - reservedByOthers < 1) {
      throw Object.assign(
        new Error("All available copies are reserved for members with holds"),
        { statusCode: 409, code: "RESERVED_FOR_HOLDS" }
      );
    }

    // Find an available copy for tracking purposes
    const availableCopy = await trx("catalog_copies")
      .where({ item_id: catalogItemId, status: "AVAILABLE" })
      .first();

    // Decrement available copies
    await trx("catalog_items")
      .where({ id: catalogItemId })
      .decrement("available_copies", 1);

    // Mark copy as checked out if tracking per-copy
    if (availableCopy) {
      await trx("catalog_copies")
        .where({ id: availableCopy.id })
        .update({ status: "CHECKED_OUT", updated_at: trx.fn.now() });
    }

    // Consume this member's hold now that they've collected the item.
    if (myReadyHold) {
      await trx("holds")
        .where({ id: myReadyHold.id })
        .update({ status: "FULFILLED" });
    }

    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + loanDays);

    const [loan] = await trx("loans")
      .insert({
        item_id: catalogItemId,
        member_id: memberId,
        copy_id: availableCopy?.id || null,
        checkout_date: trx.fn.now(),
        due_date: dueDate,
        status: "ACTIVE",
        renewed_count: 0,
        issued_by: issuedBy,
        created_at: trx.fn.now(),
        updated_at: trx.fn.now(),
      })
      .returning("*");

    return loan;
  });
}

// ── Return ─────────────────────────────────────────────────────────

async function returnItem(loanId, returnedTo = null) {
  const holdsRepo = require("./holds");
  const wishlistsRepo = require("./wishlists");
  let promotedHold = null;
  let itemId = null;
  let wasUnavailable = false;

  const updatedLoan = await db.transaction(async (trx) => {
    const loan = await trx("loans").where({ id: loanId }).forUpdate().first();

    if (!loan) {
      throw Object.assign(new Error("Loan not found"), {
        statusCode: 404,
        code: "LOAN_NOT_FOUND",
      });
    }

    if (loan.status === "RETURNED") {
      throw Object.assign(new Error("Item already returned"), {
        statusCode: 409,
        code: "ALREADY_RETURNED",
      });
    }

    const [updated] = await trx("loans")
      .where({ id: loanId })
      .update({
        status: "RETURNED",
        return_date: trx.fn.now(),
        returned_to: returnedTo,
        updated_at: trx.fn.now(),
      })
      .returning("*");

    // Was the item fully checked out before this return? (drives wishlist alerts)
    const itemBefore = await trx("catalog_items")
      .where({ id: loan.item_id })
      .first();
    wasUnavailable = (itemBefore?.available_copies ?? 0) <= 0;

    // Increment available copies
    await trx("catalog_items")
      .where({ id: loan.item_id })
      .increment("available_copies", 1);

    // Mark copy as available again
    if (loan.copy_id) {
      await trx("catalog_copies")
        .where({ id: loan.copy_id })
        .update({ status: "AVAILABLE", updated_at: trx.fn.now() });
    }

    // Promote the next hold atomically with the return (no notification here —
    // that would risk poisoning this transaction; see holds.fulfillNext).
    itemId = loan.item_id;
    promotedHold = await holdsRepo.fulfillNext(loan.item_id, trx);

    return updated;
  });

  // After commit: notify. A hold takes precedence over wishlist alerts — if a
  // hold claimed the freed copy, only the hold member is told (the copy is
  // reserved for them, not open to wishlisters).
  if (promotedHold) {
    await holdsRepo.notifyHoldReady(promotedHold, itemId);
  } else if (wasUnavailable) {
    // Item just went from 0 → available and nobody was in the hold queue:
    // let wishlisters know it's grabbable.
    await wishlistsRepo.notifyAvailable(itemId);
  }

  return updatedLoan;
}

// ── Renewal ────────────────────────────────────────────────────────

async function renew(loanId) {
  return db.transaction(async (trx) => {
    const loan = await trx("loans").where({ id: loanId }).forUpdate().first();

    if (!loan) {
      throw Object.assign(new Error("Loan not found"), {
        statusCode: 404,
        code: "LOAN_NOT_FOUND",
      });
    }

    if (loan.status !== "ACTIVE" && loan.status !== "OVERDUE") {
      throw Object.assign(
        new Error("Only active or overdue loans can be renewed"),
        { statusCode: 409, code: "INVALID_LOAN_STATUS" }
      );
    }

    if ((loan.renewed_count || 0) >= MAX_RENEWALS) {
      throw Object.assign(
        new Error(`Maximum renewals (${MAX_RENEWALS}) reached`),
        { statusCode: 409, code: "MAX_RENEWALS_REACHED" }
      );
    }

    const newDueDate = new Date(loan.due_date);
    newDueDate.setDate(newDueDate.getDate() + RENEWAL_EXTENSION_DAYS);

    const [updatedLoan] = await trx("loans")
      .where({ id: loanId })
      .update({
        due_date: newDueDate,
        renewed_count: (loan.renewed_count || 0) + 1,
        status: "ACTIVE",
        updated_at: trx.fn.now(),
      })
      .returning("*");

    return updatedLoan;
  });
}

// ── Queries ────────────────────────────────────────────────────────

async function findByMember(memberId, status = null) {
  let query = db("loans")
    .join("catalog_items", "loans.item_id", "catalog_items.id")
    .select(
      "loans.*",
      "catalog_items.title as item_title",
      "catalog_items.authors as item_author",
      "catalog_items.isbn as item_isbn",
      "catalog_items.cover_image as item_cover"
    )
    .where("loans.member_id", memberId)
    .orderBy("loans.created_at", "desc");

  if (status) query = query.where("loans.status", status);

  return query;
}

async function findOverdue() {
  return db("loans")
    .join("catalog_items", "loans.item_id", "catalog_items.id")
    .join("users", "loans.member_id", "users.id")
    .select(
      "loans.*",
      "catalog_items.title as item_title",
      "catalog_items.authors as item_author",
      "users.name as member_name",
      "users.email as member_email"
    )
    .whereIn("loans.status", ["ACTIVE", "OVERDUE"])
    .where("loans.due_date", "<", db.fn.now())
    .orderBy("loans.due_date", "asc");
}

async function findById(loanId) {
  return db("loans")
    .join("catalog_items", "loans.item_id", "catalog_items.id")
    .select(
      "loans.*",
      "catalog_items.title as item_title",
      "catalog_items.authors as item_author",
      "catalog_items.isbn as item_isbn"
    )
    .where("loans.id", loanId)
    .first();
}

async function findHistory(memberId, { page = 1, limit = 20 } = {}) {
  const offset = (Math.max(1, page) - 1) * limit;

  const query = db("loans")
    .join("catalog_items", "loans.item_id", "catalog_items.id")
    .select(
      "loans.*",
      "catalog_items.title as item_title",
      "catalog_items.authors as item_author",
      "catalog_items.isbn as item_isbn",
      "catalog_items.cover_image as item_cover"
    )
    .where("loans.member_id", memberId)
    .orderBy("loans.checkout_date", "desc");

  const [items, [{ total }]] = await Promise.all([
    query.clone().limit(limit).offset(offset),
    query.clone().clearSelect().clearOrder().count("* as total"),
  ]);

  return {
    items,
    pagination: {
      page: Math.max(1, page),
      limit,
      total: parseInt(total, 10),
      totalPages: Math.ceil(parseInt(total, 10) / limit),
    },
  };
}

async function markOverdue() {
  const result = await db("loans")
    .where("status", "ACTIVE")
    .where("due_date", "<", db.fn.now())
    .update({ status: "OVERDUE", updated_at: db.fn.now() });

  return result;
}

module.exports = {
  checkout,
  returnItem,
  renew,
  findByMember,
  findOverdue,
  findById,
  findHistory,
  markOverdue,
  DEFAULT_LOAN_DAYS,
  MAX_RENEWALS,
  RENEWAL_EXTENSION_DAYS,
};
