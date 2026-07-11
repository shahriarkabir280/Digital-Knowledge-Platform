/**
 * Holds Repository — adapted to actual Supabase schema.
 * Actual columns: id, item_id, member_id, status, placed_at, created_at
 * (no position column, no notified_at, no updated_at — simplified queue)
 */

const db = require("../index");

/**
 * Place a hold on a catalog item.
 */
async function placeHold(catalogItemId, memberId) {
  return db.transaction(async (trx) => {
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

    // Check if member already has an active hold
    const existing = await trx("holds")
      .where({ item_id: catalogItemId, member_id: memberId })
      .whereIn("status", ["QUEUED", "READY"])
      .first();

    if (existing) {
      throw Object.assign(
        new Error("You already have an active hold on this item"),
        { statusCode: 409, code: "HOLD_ALREADY_EXISTS" }
      );
    }

    // Holds are for checked-out items (FR-DKP-019). If an unreserved copy is
    // available right now, the member should just borrow it instead.
    const readyCount = await trx("holds")
      .where({ item_id: catalogItemId, status: "READY" })
      .count("* as c")
      .first();
    const reserved = parseInt(readyCount?.c || 0, 10);
    if ((item.available_copies || 0) - reserved > 0) {
      throw Object.assign(
        new Error("This item is available to borrow — no hold needed"),
        { statusCode: 409, code: "ITEM_AVAILABLE" }
      );
    }

    const [hold] = await trx("holds")
      .insert({
        item_id: catalogItemId,
        member_id: memberId,
        status: "QUEUED",
        placed_at: trx.fn.now(),
        created_at: trx.fn.now(),
      })
      .returning("*");

    return hold;
  });
}

/**
 * Fulfill next hold in queue when item is returned.
 *
 * IMPORTANT: this runs inside the caller's return transaction, so it does the
 * hold status update (which must be atomic with the return) but does NOT touch
 * the notifications table. Any failed write here would poison the whole
 * transaction and silently roll back the return (Postgres aborts the tx; the
 * later COMMIT becomes a no-op ROLLBACK). Notifications are best-effort and are
 * sent AFTER commit via notifyHoldReady().
 *
 * @returns the promoted hold row (status READY), or null if the queue is empty.
 */
async function fulfillNext(catalogItemId, trx = db) {
  const nextHold = await trx("holds")
    .where({ item_id: catalogItemId, status: "QUEUED" })
    .orderBy("placed_at", "asc")
    .forUpdate()
    .first();

  if (!nextHold) return null;

  const [updated] = await trx("holds")
    .where({ id: nextHold.id })
    .update({ status: "READY" })
    .returning("*");

  return updated;
}

/**
 * Best-effort "your hold is ready" notification (in-app + email). Call this
 * AFTER the return transaction has committed — never inside it. Swallows errors
 * so a notifications schema mismatch or mail failure can't affect the
 * committed return.
 */
async function notifyHoldReady(hold, catalogItemId) {
  if (!hold) return;

  // Fetch member + item details for a useful message/email.
  let member = null;
  let item = null;
  try {
    member = await db("users").where({ id: hold.member_id }).first();
    item = await db("catalog_items").where({ id: catalogItemId }).first();
  } catch {
    /* non-fatal — fall back to generic text below */
  }

  const itemTitle = item?.title || `catalog item #${catalogItemId}`;

  try {
    await db("notifications").insert({
      user_id: hold.member_id,
      event_type: "hold_ready",
      title: "Your hold is ready",
      message: `Your hold on "${itemTitle}" is now ready for pickup.`,
      is_read: false,
      created_at: db.fn.now(),
    });
  } catch (err) {
    console.warn("[holds] Could not create hold-ready notification:", err.message);
  }

  if (member?.email) {
    try {
      const emailService = require("../../services/emailService");
      await emailService.sendHoldReady({
        to: member.email,
        itemTitle,
        memberName: member.name,
        holdId: hold.id,
      });
    } catch (err) {
      console.warn("[holds] Could not send hold-ready email:", err.message);
    }
  }
}

/**
 * Cancel a hold request.
 */
async function cancelHold(holdId, memberId) {
  return db.transaction(async (trx) => {
    const hold = await trx("holds").where({ id: holdId }).first();

    if (!hold) {
      throw Object.assign(new Error("Hold request not found"), {
        statusCode: 404,
        code: "HOLD_NOT_FOUND",
      });
    }

    if (hold.member_id !== memberId) {
      throw Object.assign(new Error("You can only cancel your own holds"), {
        statusCode: 403,
        code: "HOLD_NOT_YOURS",
      });
    }

    if (hold.status === "FULFILLED" || hold.status === "CANCELLED") {
      throw Object.assign(
        new Error("This hold has already been fulfilled or cancelled"),
        { statusCode: 409, code: "HOLD_INVALID_STATUS" }
      );
    }

    const [cancelled] = await trx("holds")
      .where({ id: holdId })
      .update({ status: "CANCELLED" })
      .returning("*");

    return cancelled;
  });
}

/**
 * Find holds by member ID.
 */
async function findByMember(memberId) {
  return db("holds")
    .join("catalog_items", "holds.item_id", "catalog_items.id")
    .select(
      "holds.*",
      "catalog_items.title as item_title",
      "catalog_items.authors as item_author",
      "catalog_items.cover_image as item_cover"
    )
    .where("holds.member_id", memberId)
    .orderBy("holds.created_at", "desc");
}

async function findById(holdId) {
  return db("holds").where({ id: holdId }).first();
}

module.exports = {
  placeHold,
  fulfillNext,
  notifyHoldReady,
  cancelHold,
  findByMember,
  findById,
};
