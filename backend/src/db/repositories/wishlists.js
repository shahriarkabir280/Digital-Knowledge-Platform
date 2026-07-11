/**
 * Wishlists Repository — adapted to actual Supabase schema.
 * Actual columns: id, user_id (not member_id), item_id (not catalog_item_id), added_at
 */

const db = require("../index");

/**
 * Add an item to a member's wishlist.
 */
async function add(memberId, catalogItemId) {
  const item = await db("catalog_items")
    .where({ id: catalogItemId })
    .whereNot("state", "WITHDRAWN")
    .first();

  if (!item) {
    throw Object.assign(new Error("Catalog item not found"), {
      statusCode: 404,
      code: "CATALOG_ITEM_NOT_FOUND",
    });
  }

  try {
    const [wishlist] = await db("wishlists")
      .insert({
        user_id: memberId,
        item_id: catalogItemId,
        added_at: db.fn.now(),
      })
      .returning("*");

    return wishlist;
  } catch (error) {
    if (error.code === "23505") {
      throw Object.assign(new Error("Item is already in your wishlist"), {
        statusCode: 409,
        code: "WISHLIST_DUPLICATE",
      });
    }
    throw error;
  }
}

/**
 * Remove a wishlist entry.
 */
async function remove(wishlistId, memberId) {
  const entry = await db("wishlists").where({ id: wishlistId }).first();

  if (!entry) {
    throw Object.assign(new Error("Wishlist entry not found"), {
      statusCode: 404,
      code: "WISHLIST_NOT_FOUND",
    });
  }

  if (entry.user_id !== memberId) {
    throw Object.assign(
      new Error("You can only remove items from your own wishlist"),
      { statusCode: 403, code: "WISHLIST_NOT_YOURS" }
    );
  }

  await db("wishlists").where({ id: wishlistId }).delete();
  return { deleted: true };
}

/**
 * Get all wishlist items for a member.
 */
async function findByMember(memberId) {
  return db("wishlists")
    .join("catalog_items", "wishlists.item_id", "catalog_items.id")
    .select(
      "wishlists.id as wishlist_id",
      "wishlists.added_at as wishlisted_at",
      "catalog_items.id as catalog_item_id",
      "catalog_items.title",
      "catalog_items.authors as author",
      "catalog_items.isbn",
      "catalog_items.category as item_type",
      "catalog_items.state as status",
      "catalog_items.available_copies",
      "catalog_items.cover_image as cover_image_url",
      "catalog_items.location"
    )
    .where("wishlists.user_id", memberId)
    .whereNot("catalog_items.state", "WITHDRAWN")
    .orderBy("wishlists.added_at", "desc");
}

/**
 * Check if an item is in a member's wishlist.
 */
async function isInWishlist(memberId, catalogItemId) {
  const entry = await db("wishlists")
    .where({ user_id: memberId, item_id: catalogItemId })
    .first();
  return !!entry;
}

/**
 * Notify (in-app + email) every member who has this item on their wishlist
 * that it is now available. Best-effort: never throws.
 *
 * Call this AFTER a return commits, and only when no hold reserved the freed
 * copy (a hold takes precedence over wishlist notifications).
 */
async function notifyAvailable(catalogItemId) {
  let item = null;
  let watchers = [];
  try {
    item = await db("catalog_items").where({ id: catalogItemId }).first();
    if (!item || item.state === "WITHDRAWN") return;

    watchers = await db("wishlists")
      .join("users", "wishlists.user_id", "users.id")
      .where("wishlists.item_id", catalogItemId)
      .select("users.id as user_id", "users.email as email", "users.name as name");
  } catch (err) {
    console.warn("[wishlists] Could not load watchers:", err.message);
    return;
  }

  const emailService = require("../../services/emailService");

  for (const w of watchers) {
    try {
      await db("notifications").insert({
        user_id: w.user_id,
        event_type: "wishlist_available",
        title: "Wishlist item available",
        message: `"${item.title}" from your wishlist is now available to borrow.`,
        is_read: false,
        created_at: db.fn.now(),
      });
    } catch (err) {
      console.warn("[wishlists] Could not create notification:", err.message);
    }

    if (w.email) {
      try {
        await emailService.sendWishlistAvailable({
          to: w.email,
          itemTitle: item.title,
          memberName: w.name,
        });
      } catch (err) {
        console.warn("[wishlists] Could not send email:", err.message);
      }
    }
  }
}

module.exports = {
  add,
  remove,
  findByMember,
  isInWishlist,
  notifyAvailable,
};
