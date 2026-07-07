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

const JOB_INTERVAL_MS = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Insert a notification (skips if already sent today of same type/loan).
 */
async function insertNotification({ userId, type, title, message, metadata }) {
  // Avoid duplicate notifications on same day for same loan/type
  if (metadata?.loan_id) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const existing = await db("notifications")
      .where({ user_id: userId, event_type: type })
      .where("created_at", ">=", today)
      .first();

    if (existing) return null;
  }

  const [notification] = await db("notifications")
    .insert({
      user_id: userId,
      event_type: type,  // notifications table uses event_type, not type
      title,
      message,
      is_read: false,
      created_at: db.fn.now(),
    })
    .returning("id");

  return notification;
}

/**
 * Send due-reminder notifications for loans due in ~3 days and ~1 day.
 */
async function sendDueReminders() {
  const now = new Date();

  // Reminders for loans due in 3 days (within a 24-hour window)
  const threeDaysFromNow = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
  const threeDaysEnd = new Date(threeDaysFromNow.getTime() + 24 * 60 * 60 * 1000);

  const dueSoon3 = await db("loans")
    .where("status", "ACTIVE")
    .where("due_date", ">=", threeDaysFromNow)
    .where("due_date", "<", threeDaysEnd)
    .select("id", "member_id", "item_id", "due_date");

  for (const loan of dueSoon3) {
    const item = await db("catalog_items")
      .where({ id: loan.item_id })
      .first();

    await insertNotification({
      userId: loan.member_id,
      type: "DUE_REMINDER",
      title: "Item Due in 3 Days",
      message: `"${item?.title || "Your item"}" is due on ${new Date(loan.due_date).toLocaleDateString()}.`,
      metadata: { loan_id: loan.id, item_id: loan.item_id },
    });
  }

  // Reminders for loans due in 1 day
  const oneDayFromNow = new Date(now.getTime() + 1 * 24 * 60 * 60 * 1000);
  const oneDayEnd = new Date(oneDayFromNow.getTime() + 24 * 60 * 60 * 1000);

  const dueSoon1 = await db("loans")
    .where("status", "ACTIVE")
    .where("due_date", ">=", oneDayFromNow)
    .where("due_date", "<", oneDayEnd)
    .select("id", "member_id", "item_id", "due_date");

  for (const loan of dueSoon1) {
    const item = await db("catalog_items")
      .where({ id: loan.item_id })
      .first();

    await insertNotification({
      userId: loan.member_id,
      type: "DUE_REMINDER",
      title: "Item Due Tomorrow!",
      message: `"${item?.title || "Your item"}" is due tomorrow (${new Date(loan.due_date).toLocaleDateString()}). Please return or renew it.`,
      metadata: { loan_id: loan.id, item_id: loan.item_id },
    });
  }

  return { dueSoon3: dueSoon3.length, dueSoon1: dueSoon1.length };
}

/**
 * Process overdue loans: update status and send notifications.
 */
async function processOverdueLoans() {
  const count = await loansRepository.markOverdue();

  // Send OVERDUE notifications for all currently overdue loans
  const overdueLoans = await db("loans")
    .where("status", "OVERDUE")
    .select("id", "member_id", "item_id", "due_date");

  for (const loan of overdueLoans) {
    const item = await db("catalog_items")
      .where({ id: loan.item_id })
      .first();

    const daysOverdue = Math.ceil(
      (Date.now() - new Date(loan.due_date).getTime()) / (1000 * 60 * 60 * 24)
    );

    await insertNotification({
      userId: loan.member_id,
      type: "OVERDUE",
      title: "Overdue Item",
      message: `"${item?.title || "An item"}" is ${daysOverdue} day(s) overdue. Please return it immediately to avoid additional fines.`,
      metadata: {
        loan_id: loan.id,
        item_id: loan.item_id,
        days_overdue: daysOverdue,
      },
    });

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
