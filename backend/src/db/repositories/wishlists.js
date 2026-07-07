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

module.exports = {
  add,
  remove,
  findByMember,
  isInWishlist,
};
