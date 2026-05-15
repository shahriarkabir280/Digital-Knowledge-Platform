const jwt = require("jsonwebtoken");

function extractBearerToken(headerValue) {
  if (!headerValue) {
    return "";
  }

  const [scheme, token] = String(headerValue).split(" ");
  if (scheme !== "Bearer" || !token) {
    return "";
  }

  return token;
}

function requireAuth(req, _res, next) {
  const token = extractBearerToken(req.headers.authorization);
  if (!token) {
    return next({
      statusCode: 401,
      code: "AUTH_REQUIRED",
      message: "Authorization token is required",
    });
  }

  const secret = process.env.JWT_SECRET;
  if (!secret) {
    return next({
      statusCode: 500,
      code: "JWT_CONFIG_MISSING",
      message: "JWT secret is not configured",
    });
  }

  try {
    req.auth = jwt.verify(token, secret);
    return next();
  } catch (_error) {
    return next({
      statusCode: 401,
      code: "INVALID_ACCESS_TOKEN",
      message: "Access token is invalid or expired",
    });
  }
}

module.exports = requireAuth;