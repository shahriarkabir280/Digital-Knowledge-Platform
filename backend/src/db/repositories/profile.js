/**
 * Profile Repository — self-service user profile (distinct from the
 * ADMIN-only users repository/module, which only manages role/status).
 */

const db = require("../index");

const PUBLIC_COLUMNS = [
  "id",
  "email",
  "name",
  "role",
  "status",
  "avatar_url",
  "bio",
  "department",
  "phone",
  "cv_url",
  "linkedin_url",
  "github_url",
  "google_scholar_url",
  "website_url",
  "created_at",
  "updated_at",
];

async function getById(id) {
  return db("users").select(PUBLIC_COLUMNS).where({ id }).first();
}

/**
 * Update editable self-service fields. `data` keys are already restricted
 * to the editable set by the route's zod schema.
 */
async function updateProfile(id, data) {
  const [updated] = await db("users")
    .where({ id })
    .update({ ...data, updated_at: db.fn.now() })
    .returning(PUBLIC_COLUMNS);

  return updated;
}

async function updateAvatar(id, avatarUrl) {
  const [updated] = await db("users")
    .where({ id })
    .update({ avatar_url: avatarUrl, updated_at: db.fn.now() })
    .returning(PUBLIC_COLUMNS);

  return updated;
}

module.exports = {
  getById,
  updateProfile,
  updateAvatar,
};
