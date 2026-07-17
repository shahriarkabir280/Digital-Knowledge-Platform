/**
 * Notifications helper — thin, best-effort wrapper around the shared
 * `notifications` table (columns: user_id, event_type, title, message,
 * is_read, metadata, created_at — see supabase_library_5.4.sql).
 *
 * Mirrors the pattern already used in holds.js (notifyHoldReady) and
 * dueTrackingJob.js: inserts are never allowed to throw — a notification
 * failure must never abort the operation that triggered it.
 */

const db = require("../index");

async function notifyUser({ userId, eventType, title, message, metadata }) {
  if (!userId) return;
  try {
    await db("notifications").insert({
      user_id: userId,
      event_type: eventType,
      title,
      message,
      metadata: metadata ? JSON.stringify(metadata) : null,
      is_read: false,
      created_at: db.fn.now(),
    });
  } catch (err) {
    console.warn(`[notifications] Could not notify user ${userId}:`, err.message);
  }
}

/**
 * Notify every librarian (STAFF/LAB_MANAGER/ADMIN) — used for events a
 * member triggers that a librarian needs to act on (new borrow request,
 * subscription renewal request, etc).
 */
async function notifyLibrarians({ eventType, title, message, metadata }) {
  try {
    const librarians = await db("users")
      .select("id")
      .whereIn("role", ["STAFF", "LAB_MANAGER", "ADMIN"]);

    await Promise.all(
      librarians.map((librarian) =>
        notifyUser({ userId: librarian.id, eventType, title, message, metadata })
      )
    );
  } catch (err) {
    console.warn("[notifications] Could not notify librarians:", err.message);
  }
}

module.exports = { notifyUser, notifyLibrarians };
