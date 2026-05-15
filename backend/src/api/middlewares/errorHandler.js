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

  res.status(statusCode).json({
    error: {
      code: err.code || "INTERNAL_SERVER_ERROR",
      message: err.message || "Internal server error",
    },
  });
}

module.exports = errorHandler;
