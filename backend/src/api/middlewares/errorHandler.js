const logger = require("../../config/logger");

function errorHandler(err, req, res, _next) {
  const statusCode = err.statusCode || 500;

  logger.error("unhandled_error", {
    method: req.method,
    path: req.originalUrl,
    statusCode,
    message: err.message,
    stack: process.env.NODE_ENV === "development" ? err.stack : undefined,
  });

  // 5xx means something unexpected/unhandled happened (a raw DB/driver
  // exception, a bug, etc.) — err.message there is developer-facing detail
  // (can include raw SQL, column names, stack fragments) and must never
  // reach the client. Only deliberately-thrown errors (statusCode < 500,
  // set explicitly by application code) carry a safe, user-facing message.
  const isUnexpected = statusCode >= 500;

  res.status(statusCode).json({
    error: {
      code: isUnexpected ? "INTERNAL_SERVER_ERROR" : (err.code || "INTERNAL_SERVER_ERROR"),
      message: isUnexpected ? "Something went wrong. Please try again." : (err.message || "Internal server error"),
      details: isUnexpected ? undefined : (err.details || undefined),
    },
  });
}

module.exports = errorHandler;
