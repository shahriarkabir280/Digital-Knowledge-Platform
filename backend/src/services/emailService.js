/**
 * Email Service
 * Sends notification emails for due reminders, overdue notices, etc.
 * Uses nodemailer (configure SMTP via .env) or Supabase Edge Functions.
 */

const nodemailer = require("nodemailer");

// Create transporter from environment variables
let transporter = null;

function getTransporter() {
  if (transporter) return transporter;

  const useSupabase = process.env.EMAIL_PROVIDER === "supabase";

  if (useSupabase) {
    // Supabase Edge Functions / third-party email integration
    // You would call Supabase functions here instead
    console.log("[emailService] Supabase email provider not yet implemented.");
    return null;
  }

  // SMTP configuration from .env
  const smtpHost = process.env.SMTP_HOST;
  const smtpPort = parseInt(process.env.SMTP_PORT, 10) || 587;
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;
  const smtpFrom = process.env.SMTP_FROM || "no-reply@library.local";

  if (!smtpHost || !smtpUser || !smtpPass) {
    console.warn(
      "[emailService] SMTP credentials not configured. Email notifications will be logged only."
    );
    return null;
  }

  transporter = nodemailer.createTransport({
    host: smtpHost,
    port: smtpPort,
    secure: smtpPort === 465,
    auth: {
      user: smtpUser,
      pass: smtpPass,
    },
  });

  console.log(`[emailService] SMTP transporter initialized for ${smtpHost}:${smtpPort}`);
  return transporter;
}

/**
 * Send an email notification.
 * @param {Object} options
 * @param {string} options.to — recipient email address
 * @param {string} options.subject — email subject
 * @param {string} options.text — plain text body
 * @param {string} [options.html] — optional HTML body
 * @returns {Promise<void>}
 */
async function sendEmail({ to, subject, text, html }) {
  const t = getTransporter();

  if (!t) {
    // Fallback: log to console
    console.log("[emailService] [MOCK EMAIL]");
    console.log(`  To: ${to}`);
    console.log(`  Subject: ${subject}`);
    console.log(`  Body: ${text}`);
    return;
  }

  try {
    const info = await t.sendMail({
      from: process.env.SMTP_FROM || '"Library System" <no-reply@library.local>',
      to,
      subject,
      text,
      html: html || text,
    });

    console.log(`[emailService] Email sent to ${to}: ${info.messageId}`);
  } catch (error) {
    console.error(`[emailService] Failed to send email to ${to}:`, error.message);
    throw error;
  }
}

/**
 * Send a due reminder email.
 */
async function sendDueReminder({ to, itemTitle, dueDate, memberName }) {
  const subject = `Library Item Due Soon: ${itemTitle}`;
  const text = `Hello ${memberName || "Member"},\n\n` +
    `This is a reminder that the following item is due soon:\n\n` +
    `  Item: ${itemTitle}\n` +
    `  Due Date: ${new Date(dueDate).toLocaleDateString()}\n\n` +
    `Please return or renew the item before the due date to avoid fines.\n\n` +
    `Thank you,\nDigital Knowledge Platform Library`;

  return sendEmail({ to, subject, text });
}

/**
 * Send an overdue notice email.
 */
async function sendOverdueNotice({ to, itemTitle, daysOverdue, memberName }) {
  const subject = `Library Item Overdue: ${itemTitle}`;
  const text = `Hello ${memberName || "Member"},\n\n` +
    `The following item is now overdue:\n\n` +
    `  Item: ${itemTitle}\n` +
    `  Days Overdue: ${daysOverdue}\n\n` +
    `Please return it immediately to avoid additional fines.\n\n` +
    `Thank you,\nDigital Knowledge Platform Library`;

  return sendEmail({ to, subject, text });
}

/**
 * Send a hold ready email.
 */
async function sendHoldReady({ to, itemTitle, memberName, holdId }) {
  const subject = `Your Hold is Ready: ${itemTitle}`;
  const text = `Hello ${memberName || "Member"},\n\n` +
    `Good news! The item you requested is now available:\n\n` +
    `  Item: ${itemTitle}\n` +
    `  Hold ID: ${holdId}\n\n` +
    `Please collect it from the circulation desk within 3 days.\n\n` +
    `Thank you,\nDigital Knowledge Platform Library`;

  return sendEmail({ to, subject, text });
}

module.exports = {
  sendEmail,
  sendDueReminder,
  sendOverdueNotice,
  sendHoldReady,
};
