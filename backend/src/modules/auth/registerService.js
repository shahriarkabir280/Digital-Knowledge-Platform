const bcrypt = require("bcryptjs");

const usersRepository = require("../../db/repositories/users");

const SALT_ROUNDS = 10;

function buildError(statusCode, code, message) {
  return { statusCode, code, message };
}

async function registerUser(payload) {
  const existing = await usersRepository.findUserByEmail(payload.email);

  if (existing) {
    throw buildError(409, "EMAIL_ALREADY_EXISTS", "Email is already registered");
  }

  const passwordHash = await bcrypt.hash(payload.password, SALT_ROUNDS);

  const created = await usersRepository.createUser({
    email: payload.email,
    name: payload.name,
    passwordHash,
    role: payload.role,
    status: "ACTIVE",
  });

  return {
    id: created.id,
    email: created.email,
    name: created.name,
    role: created.role,
    status: created.status,
  };
}

module.exports = {
  registerUser,
};
