const db = require("../index");

async function createLoan(loan, trx = db) {
  const rows = await trx("loans")
    .insert({
      item_id: loan.itemId,
      member_id: loan.memberId,
      checkout_date: loan.checkoutDate || new Date(),
      due_date: loan.dueDate,
      return_date: loan.returnDate || null,
      status: loan.status || "ACTIVE",
      created_at: trx.fn.now(),
      updated_at: trx.fn.now(),
    })
    .returning(["id", "item_id", "member_id", "status"]);

  return rows[0];
}

module.exports = {
  createLoan,
};