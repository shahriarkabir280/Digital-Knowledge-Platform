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
    const payload = jwt.verify(token, secret);
    // Normalize: JWT stores user id as 'sub' (string), expose as integer 'id'
    req.auth = {
      ...payload,
      id: payload.id != null
        ? parseInt(payload.id, 10)
        : (payload.sub ? parseInt(payload.sub, 10) : undefined),
    };
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
