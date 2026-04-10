const db = require("../index");

async function createUser(user, trx = db) {
  const rows = await trx("users")
    .insert({
      email: user.email,
      name: user.name,
      password_hash: user.passwordHash,
      role: user.role,
      status: user.status || "ACTIVE",
      created_at: trx.fn.now(),
      updated_at: trx.fn.now(),
    })
    .returning(["id", "email", "name", "role", "status"]);

  return rows[0];
}

function findUserByEmail(email, trx = db) {
  return trx("users").where({ email }).first();
}

module.exports = {
  createUser,
  findUserByEmail,
};