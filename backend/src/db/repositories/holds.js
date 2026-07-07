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
 */
async function fulfillNext(catalogItemId, trx = db) {
  const nextHold = await trx("holds")
    .where({ item_id: catalogItemId, status: "QUEUED" })
    .orderBy("placed_at", "asc")
    .first();

  if (!nextHold) return null;

  const [updated] = await trx("holds")
    .where({ id: nextHold.id })
    .update({ status: "READY" })
    .returning("*");

  // Attempt to insert notification (if notifications table has type column)
  // Otherwise skip notification creation
  try {
    await trx("notifications").insert({
      user_id: nextHold.member_id,
      event_type: "hold_ready",
      title: "Your hold is ready",
      message: `Your hold on catalog item #${catalogItemId} is now ready for pickup.`,
      is_read: false,
      created_at: trx.fn.now(),
    });
  } catch (err) {
    console.warn("[holds] Could not create notification:", err.message);
  }

  return updated;
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
  cancelHold,
  findByMember,
  findById,
};
