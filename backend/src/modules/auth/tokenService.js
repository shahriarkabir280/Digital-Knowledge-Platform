const jwt = require("jsonwebtoken");

function getAuthConfig() {
  const accessSecret = process.env.JWT_SECRET;

  if (!accessSecret) {
    throw {
      statusCode: 500,
      code: "JWT_CONFIG_MISSING",
      message: "JWT secret is not configured",
    };
  }

  return {
    accessSecret,
    accessExpiresIn: process.env.JWT_EXPIRES_IN || "30m",
    refreshSecret: process.env.JWT_REFRESH_SECRET || accessSecret,
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || "7d",
  };
}

function toTokenPayload(user) {
  return {
    sub: String(user.id),
    email: user.email,
    role: user.role,
  };
}

function signAccessToken(user) {
  const config = getAuthConfig();
  return jwt.sign(toTokenPayload(user), config.accessSecret, {
    expiresIn: config.accessExpiresIn,
  });
}

function signRefreshToken(user) {
  const config = getAuthConfig();
  return jwt.sign(toTokenPayload(user), config.refreshSecret, {
    expiresIn: config.refreshExpiresIn,
  });
}

function issueAuthTokens(user) {
  return {
    accessToken: signAccessToken(user),
    refreshToken: signRefreshToken(user),
    tokenType: "Bearer",
    expiresIn: getAuthConfig().accessExpiresIn,
  };
}

function verifyRefreshToken(token) {
  try {
    const config = getAuthConfig();
    return jwt.verify(token, config.refreshSecret);
  } catch (_error) {
    throw {
      statusCode: 401,
      code: "INVALID_REFRESH_TOKEN",
      message: "Refresh token is invalid or expired",
    };
  }
}

module.exports = {
  issueAuthTokens,
  verifyRefreshToken,
};
