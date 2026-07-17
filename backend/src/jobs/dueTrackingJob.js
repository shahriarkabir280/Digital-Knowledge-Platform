/**
 * Due Tracking Job
 * Runs daily to:
 *  1. Send DUE_REMINDER notifications (3 days before, 1 day before)
 *  2. Mark ACTIVE loans as OVERDUE and send OVERDUE notifications
 *  3. Calculate fines for overdue loans
 */

const db = require("../db");
const loansRepository = require("../db/repositories/loans");
const finesRepository = require("../db/repositories/fines");
const subscriptionsRepository = require("../db/repositories/subscriptions");
const emailService = require("../services/emailService");

const JOB_INTERVAL_MS = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Insert an in-app notification, de-duplicated PER LOAN per day.
 *
 * The dedup key is (user_id, event_type, metadata->>'loan_id') within today,
 * so a member with several items due/overdue on the same day gets one
 * notification PER ITEM — not just one total. Returns null if suppressed.
 */
async function insertNotification({ userId, type, title, message, metadata }) {
  const loanId = metadata?.loan_id;

  if (loanId != null) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const existing = await db("notifications")
      .where({ user_id: userId, event_type: type })
      .where("created_at", ">=", today)
      .whereRaw("metadata->>'loan_id' = ?", [String(loanId)])
      .first();

    if (existing) return null;
  }

  const [notification] = await db("notifications")
    .insert({
      user_id: userId,
      event_type: type, // notifications table uses event_type, not type
      title,
      message,
      metadata: metadata ? JSON.stringify(metadata) : null,
      is_read: false,
      created_at: db.fn.now(),
    })
    .returning("id");

  return notification;
}

/**
 * Best-effort email send. Never throws — a mail failure must not abort the job
 * (the in-app notification has already been written).
 */
async function safeSendEmail(sender, payload) {
  try {
    await sender(payload);
  } catch (err) {
    console.error("[dueTrackingJob] Email send failed:", err.message);
  }
}

/**
 * Send due-reminder notifications (in-app + email) for loans due in ~3 days
 * and ~1 day. Each qualifying loan is joined to its item and member so we can
 * address the email and title it correctly.
 */
async function remindWindow(startOffsetDays, title, buildMessage, emailLabel) {
  const now = new Date();
  const windowStart = new Date(now.getTime() + startOffsetDays * 24 * 60 * 60 * 1000);
  const windowEnd = new Date(windowStart.getTime() + 24 * 60 * 60 * 1000);

  const loans = await db("loans")
    .join("catalog_items", "loans.item_id", "catalog_items.id")
    .join("users", "loans.member_id", "users.id")
    .where("loans.status", "ACTIVE")
    .where("loans.due_date", ">=", windowStart)
    .where("loans.due_date", "<", windowEnd)
    .select(
      "loans.id as id",
      "loans.member_id as member_id",
      "loans.item_id as item_id",
      "loans.due_date as due_date",
      "catalog_items.title as item_title",
      "users.email as member_email",
      "users.name as member_name"
    );

  for (const loan of loans) {
    const inserted = await insertNotification({
      userId: loan.member_id,
      type: "DUE_REMINDER",
      title,
      message: buildMessage(loan),
      metadata: { loan_id: loan.id, item_id: loan.item_id, window: emailLabel },
    });

    // Only email if the in-app notification was newly created (not a dup).
    if (inserted && loan.member_email) {
      await safeSendEmail(emailService.sendDueReminder, {
        to: loan.member_email,
        itemTitle: loan.item_title || "Your item",
        dueDate: loan.due_date,
        memberName: loan.member_name,
      });
    }
  }

  return loans.length;
}

async function sendDueReminders() {
  const dueSoon3 = await remindWindow(
    3,
    "Item Due in 3 Days",
    (loan) =>
      `"${loan.item_title || "Your item"}" is due on ${new Date(loan.due_date).toLocaleDateString()}.`,
    "3-day"
  );

  const dueSoon1 = await remindWindow(
    1,
    "Item Due Tomorrow!",
    (loan) =>
      `"${loan.item_title || "Your item"}" is due tomorrow (${new Date(loan.due_date).toLocaleDateString()}). Please return or renew it.`,
    "1-day"
  );

  return { dueSoon3, dueSoon1 };
}

/**
 * Process overdue loans: update status, notify (in-app + email), fine.
 */
async function processOverdueLoans() {
  const count = await loansRepository.markOverdue();

  const overdueLoans = await db("loans")
    .join("catalog_items", "loans.item_id", "catalog_items.id")
    .join("users", "loans.member_id", "users.id")
    .where("loans.status", "OVERDUE")
    .select(
      "loans.id as id",
      "loans.member_id as member_id",
      "loans.item_id as item_id",
      "loans.due_date as due_date",
      "catalog_items.title as item_title",
      "users.email as member_email",
      "users.name as member_name"
    );

  for (const loan of overdueLoans) {
    const daysOverdue = Math.ceil(
      (Date.now() - new Date(loan.due_date).getTime()) / (1000 * 60 * 60 * 24)
    );

    const inserted = await insertNotification({
      userId: loan.member_id,
      type: "OVERDUE",
      title: "Overdue Item",
      message: `"${loan.item_title || "An item"}" is ${daysOverdue} day(s) overdue. Please return it immediately to avoid additional fines.`,
      metadata: {
        loan_id: loan.id,
        item_id: loan.item_id,
        days_overdue: daysOverdue,
      },
    });

    // Overdue emails go out daily (acceptance criterion: "daily after due
    // date"), so send whenever a fresh daily notification was created.
    if (inserted && loan.member_email) {
      await safeSendEmail(emailService.sendOverdueNotice, {
        to: loan.member_email,
        itemTitle: loan.item_title || "An item",
        daysOverdue,
        memberName: loan.member_name,
      });
    }

    // Calculate or update fine
    try {
      await finesRepository.calculateFine(loan.id);
    } catch (err) {
      console.error(`[dueTrackingJob] Failed to calculate fine for loan ${loan.id}:`, err.message);
    }
  }

  return count;
}

/**
 * Run a single iteration of the due tracking job.
 */
async function runOnce() {
  console.log("[dueTrackingJob] Running due tracking cycle...");

  try {
    const reminders = await sendDueReminders();
    console.log(
      `[dueTrackingJob] Due reminders: ${reminders.dueSoon3} (3-day), ${reminders.dueSoon1} (1-day)`
    );

    const overdueCount = await processOverdueLoans();
    console.log(`[dueTrackingJob] Marked ${overdueCount} new loans as overdue`);

    const expiredSubscriptions = await subscriptionsRepository.expireDue();
    console.log(`[dueTrackingJob] Expired ${expiredSubscriptions} lapsed subscriptions`);
  } catch (error) {
    console.error("[dueTrackingJob] Error during cycle:", error.message);
  }
}

/**
 * Start the due tracking job.
 * Runs once immediately, then every 24 hours.
 */
function start() {
  // Run immediately on startup
  runOnce();

  // Schedule daily
  const intervalId = setInterval(runOnce, JOB_INTERVAL_MS);

  // Allow graceful shutdown
  const stop = () => clearInterval(intervalId);

  console.log("[dueTrackingJob] Started — runs every 24 hours");

  return { stop };
}

module.exports = { start, runOnce };
