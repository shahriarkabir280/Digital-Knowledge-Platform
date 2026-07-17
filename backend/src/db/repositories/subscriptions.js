/**
 * Library Subscriptions Repository — monthly, manually-activated by staff.
 * A member needs an ACTIVE row with end_date in the future to borrow
 * from the physical (offline) library. See loans.checkout().
 */

const db = require("../index");
const notificationsRepo = require("./notifications");

/**
 * Activate (or extend) a member's subscription.
 * If the member already has an ACTIVE, non-expired row, the new period is
 * appended onto its end_date (renewal). Otherwise a fresh row starts now.
 */
async function activate(memberId, staffId, months = 1) {
  const subscription = await db.transaction(async (trx) => {
    const existing = await trx("library_subscriptions")
      .where({ member_id: memberId, status: "ACTIVE" })
      .where("end_date", ">", trx.fn.now())
      .orderBy("end_date", "desc")
      .first();

    const base = existing ? new Date(existing.end_date) : new Date();
    const newEndDate = new Date(base);
    newEndDate.setMonth(newEndDate.getMonth() + months);

    if (existing) {
      const [updated] = await trx("library_subscriptions")
        .where({ id: existing.id })
        .update({
          end_date: newEndDate,
          activated_by: staffId,
          renewal_requested_at: null,
          updated_at: trx.fn.now(),
        })
        .returning("*");
      return updated;
    }

    const [created] = await trx("library_subscriptions")
      .insert({
        member_id: memberId,
        status: "ACTIVE",
        start_date: trx.fn.now(),
        end_date: newEndDate,
        activated_by: staffId,
        created_at: trx.fn.now(),
        updated_at: trx.fn.now(),
      })
      .returning("*");
    return created;
  });

  await notificationsRepo.notifyUser({
    userId: memberId,
    eventType: "subscription_activated",
    title: "Library subscription activated",
    message: `Your offline library subscription is active until ${new Date(subscription.end_date).toLocaleDateString()}.`,
    metadata: { subscriptionId: subscription.id },
  });

  return subscription;
}

/**
 * The member's current ACTIVE, non-expired subscription (or undefined).
 */
async function getActive(memberId, trx = db) {
  return trx("library_subscriptions")
    .where({ member_id: memberId, status: "ACTIVE" })
    .where("end_date", ">", trx.fn.now())
    .orderBy("end_date", "desc")
    .first();
}

/**
 * Most recent subscription row for a member, active or not (for display).
 */
async function findByMember(memberId) {
  return db("library_subscriptions")
    .where({ member_id: memberId })
    .orderBy("created_at", "desc")
    .first();
}

/**
 * Member flags their (most recent) subscription for renewal. Notifies
 * every librarian; activate() clears the flag once actioned.
 */
async function requestRenewal(memberId) {
  const subscription = await findByMember(memberId);

  if (!subscription) {
    throw Object.assign(
      new Error("You don't have a subscription yet — contact a librarian to start one"),
      { statusCode: 404, code: "NO_SUBSCRIPTION_TO_RENEW" }
    );
  }

  const [updated] = await db("library_subscriptions")
    .where({ id: subscription.id })
    .update({ renewal_requested_at: db.fn.now(), updated_at: db.fn.now() })
    .returning("*");

  const member = await db("users").where({ id: memberId }).first();
  await notificationsRepo.notifyLibrarians({
    eventType: "subscription_renewal_requested",
    title: "Subscription renewal requested",
    message: `${member?.name || member?.email || 'A member'} requested to renew their library subscription.`,
    metadata: { subscriptionId: updated.id, memberId },
  });

  return updated;
}

/**
 * Librarian rejects a pending renewal request — clears the flag (without
 * extending the subscription) so the member can request again later, and
 * notifies them with the reason.
 */
async function rejectRenewal(memberId, staffId, reason) {
  const subscription = await findByMember(memberId);

  if (!subscription || !subscription.renewal_requested_at) {
    throw Object.assign(
      new Error("This member has no pending renewal request"),
      { statusCode: 409, code: "NO_PENDING_RENEWAL" }
    );
  }

  const [updated] = await db("library_subscriptions")
    .where({ id: subscription.id })
    .update({ renewal_requested_at: null, updated_at: db.fn.now() })
    .returning("*");

  await notificationsRepo.notifyUser({
    userId: memberId,
    eventType: "subscription_renewal_rejected",
    title: "Renewal request rejected",
    message: reason
      ? `Your subscription renewal request was rejected: ${reason}`
      : "Your subscription renewal request was rejected.",
    metadata: { subscriptionId: updated.id, rejectedBy: staffId },
  });

  return updated;
}

/**
 * List subscriptions for the librarian dashboard.
 */
async function findAll({ page = 1, limit = 20, status } = {}) {
  let query = db("library_subscriptions")
    .join("users", "library_subscriptions.member_id", "users.id")
    .select(
      "library_subscriptions.*",
      "users.name as member_name",
      "users.email as member_email"
    )
    .orderBy("library_subscriptions.created_at", "desc");

  if (status) query = query.where("library_subscriptions.status", status);

  const offset = (Math.max(1, page) - 1) * limit;

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

/**
 * Flip lapsed ACTIVE subscriptions to EXPIRED. Called daily from
 * dueTrackingJob alongside loan due-date processing.
 */
async function expireDue() {
  return db("library_subscriptions")
    .where("status", "ACTIVE")
    .where("end_date", "<", db.fn.now())
    .update({ status: "EXPIRED", updated_at: db.fn.now() });
}

module.exports = {
  activate,
  getActive,
  findByMember,
  findAll,
  expireDue,
  requestRenewal,
  rejectRenewal,
};
