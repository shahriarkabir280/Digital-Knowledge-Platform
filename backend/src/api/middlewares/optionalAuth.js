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

/**
 * Like requireAuth, but never rejects the request. If a valid bearer token
 * is present, req.auth is populated exactly as requireAuth does; otherwise
 * the request continues as a guest (req.auth left unset).
 */
function optionalAuth(req, _res, next) {
  const token = extractBearerToken(req.headers.authorization);
  if (!token) {
    return next();
  }

  const secret = process.env.JWT_SECRET;
  if (!secret) {
    return next();
  }

  try {
    const payload = jwt.verify(token, secret);
    req.auth = {
      ...payload,
      id: payload.id != null
        ? parseInt(payload.id, 10)
        : (payload.sub ? parseInt(payload.sub, 10) : undefined),
    };
  } catch (_error) {
    // Invalid/expired token: treat as guest rather than failing the request.
  }

  return next();
}

module.exports = optionalAuth;
