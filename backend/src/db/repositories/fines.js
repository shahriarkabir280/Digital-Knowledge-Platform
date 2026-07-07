/**
 * Fines Repository — adapted to actual Supabase schema.
 * Actual columns: id, loan_id, member_id, amount, status, paid_at, created_at
 * (no currency, no reason columns — keep them for insert with fallback)
 */

const db = require("../index");

const FINE_RATE_PER_DAY = 5; // BDT per day
const MAX_FINE_DAYS = 30;

/**
 * Calculate and upsert a fine for an overdue loan.
 */
async function calculateFine(loanId, trx = db) {
  const loan = await trx("loans").where({ id: loanId }).first();

  if (!loan) {
    throw Object.assign(new Error("Loan not found"), {
      statusCode: 404,
      code: "LOAN_NOT_FOUND",
    });
  }

  const now = new Date();
  const dueDate = new Date(loan.due_date);

  if (now <= dueDate) return null;

  const diffMs = now - dueDate;
  const diffDays = Math.min(
    Math.ceil(diffMs / (1000 * 60 * 60 * 24)),
    MAX_FINE_DAYS
  );
  const amount = diffDays * FINE_RATE_PER_DAY;

  // Check if fine already exists
  const existing = await trx("fines")
    .where({ loan_id: loanId })
    .whereIn("status", ["PENDING"])
    .first();

  if (existing) {
    if (parseFloat(existing.amount) !== amount) {
      const [updated] = await trx("fines")
        .where({ id: existing.id })
        .update({ amount })
        .returning("*");
      return updated;
    }
    return existing;
  }

  const insertData = {
    loan_id: loanId,
    member_id: loan.member_id,
    amount,
    status: "PENDING",
    created_at: trx.fn.now(),
  };

  const [fine] = await trx("fines").insert(insertData).returning("*");
  return fine;
}

async function findByMember(memberId) {
  return db("fines")
    .join("loans", "fines.loan_id", "loans.id")
    .join("catalog_items", "loans.item_id", "catalog_items.id")
    .select(
      "fines.*",
      "catalog_items.title as item_title",
      "catalog_items.authors as item_author",
      "loans.checkout_date",
      "loans.due_date",
      "loans.return_date"
    )
    .where("fines.member_id", memberId)
    .orderBy("fines.created_at", "desc");
}

async function findById(fineId) {
  return db("fines").where({ id: fineId }).first();
}

async function markPaid(fineId, trx = db) {
  const fine = await trx("fines").where({ id: fineId }).first();

  if (!fine) {
    throw Object.assign(new Error("Fine not found"), {
      statusCode: 404,
      code: "FINE_NOT_FOUND",
    });
  }

  if (fine.status === "PAID") {
    throw Object.assign(new Error("Fine is already paid"), {
      statusCode: 409,
      code: "FINE_ALREADY_PAID",
    });
  }

  const [updated] = await trx("fines")
    .where({ id: fineId })
    .update({ status: "PAID", paid_at: trx.fn.now() })
    .returning("*");

  return updated;
}

async function waive(fineId, trx = db) {
  const fine = await trx("fines").where({ id: fineId }).first();

  if (!fine) {
    throw Object.assign(new Error("Fine not found"), {
      statusCode: 404,
      code: "FINE_NOT_FOUND",
    });
  }

  const [updated] = await trx("fines")
    .where({ id: fineId })
    .update({ status: "WAIVED", paid_at: trx.fn.now() })
    .returning("*");

  return updated;
}

async function getSummary({ from, to } = {}) {
  let query = db("fines")
    .select(
      db.raw("COUNT(*) as total_fines"),
      db.raw("SUM(amount) FILTER (WHERE status = 'PENDING') as pending_amount"),
      db.raw("SUM(amount) FILTER (WHERE status = 'PAID') as paid_amount"),
      db.raw("SUM(amount) FILTER (WHERE status = 'WAIVED') as waived_amount"),
      db.raw("COUNT(*) FILTER (WHERE status = 'PENDING') as pending_count"),
      db.raw("COUNT(*) FILTER (WHERE status = 'PAID') as paid_count"),
      db.raw("COUNT(*) FILTER (WHERE status = 'WAIVED') as waived_count")
    )
    .first();

  if (from) query = query.where("created_at", ">=", from);
  if (to) query = query.where("created_at", "<=", to);

  return query;
}

module.exports = {
  calculateFine,
  findByMember,
  findById,
  markPaid,
  waive,
  getSummary,
  FINE_RATE_PER_DAY,
};
