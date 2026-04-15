const bcrypt = require("bcryptjs");

const usersRepository = require("../../db/repositories/users");
const { issueAuthTokens, verifyRefreshToken } = require("./tokenService");

function authError() {
  return {
    statusCode: 401,
    code: "INVALID_CREDENTIALS",
    message: "Invalid email or password",
  };
}

function normalizeUser(user) {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    status: user.status,
  };
}

async function loginUser(payload) {
  const user = await usersRepository.findUserByEmail(payload.email);

  if (!user) {
    throw authError();
  }

  const isPasswordValid = await bcrypt.compare(payload.password, user.password_hash || "");

  if (!isPasswordValid) {
    throw authError();
  }

  if (user.status !== "ACTIVE") {
    throw {
      statusCode: 403,
      code: "USER_INACTIVE",
      message: "User account is not active",
    };
  }

  const safeUser = normalizeUser(user);

  return {
    user: safeUser,
    ...issueAuthTokens(safeUser),
  };
}

async function refreshAccessToken(refreshToken) {
  const decoded = verifyRefreshToken(refreshToken);

  const user = await usersRepository.findUserByEmail(decoded.email);

  if (!user || user.status !== "ACTIVE") {
    throw {
      statusCode: 401,
      code: "INVALID_REFRESH_TOKEN",
      message: "Refresh token is invalid or expired",
    };
  }

  const safeUser = normalizeUser(user);

  return {
    user: safeUser,
    ...issueAuthTokens(safeUser),
  };
}

module.exports = {
  loginUser,
  refreshAccessToken,
};
