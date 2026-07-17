/**
 * Reviews Repository — one review per member per catalog item (book).
 * Re-submitting updates the existing review rather than creating a duplicate.
 */

const db = require("../index");

async function findByCatalogItem(catalogItemId) {
  return db("reviews")
    .join("users", "reviews.user_id", "users.id")
    .select(
      "reviews.id",
      "reviews.rating",
      "reviews.comment",
      "reviews.created_at",
      "reviews.updated_at",
      "reviews.user_id",
      "users.name as user_name"
    )
    .where("reviews.catalog_item_id", catalogItemId)
    .orderBy("reviews.created_at", "desc");
}

async function findMine(catalogItemId, userId) {
  return db("reviews")
    .where({ catalog_item_id: catalogItemId, user_id: userId })
    .first();
}

/**
 * Average rating + count + per-star breakdown for a catalog item.
 */
async function getSummary(catalogItemId) {
  const rows = await db("reviews")
    .where({ catalog_item_id: catalogItemId })
    .select("rating");

  const count = rows.length;
  const breakdown = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  let total = 0;

  for (const row of rows) {
    const rating = Number(row.rating);
    breakdown[rating] = (breakdown[rating] || 0) + 1;
    total += rating;
  }

  return {
    average: count > 0 ? Math.round((total / count) * 10) / 10 : 0,
    count,
    breakdown,
  };
}

/**
 * Create or update the caller's own review for a catalog item.
 */
async function upsert(catalogItemId, userId, rating, comment) {
  const [review] = await db("reviews")
    .insert({
      catalog_item_id: catalogItemId,
      user_id: userId,
      rating,
      comment: comment || null,
      created_at: db.fn.now(),
      updated_at: db.fn.now(),
    })
    .onConflict(["catalog_item_id", "user_id"])
    .merge({ rating, comment: comment || null, updated_at: db.fn.now() })
    .returning("*");

  return review;
}

module.exports = {
  findByCatalogItem,
  findMine,
  getSummary,
  upsert,
};
