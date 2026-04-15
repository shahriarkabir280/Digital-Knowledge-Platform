function requireAdmin(req, _res, next) {
  if (req.auth?.role !== "ADMIN") {
    return next({
      statusCode: 403,
      code: "ADMIN_ACCESS_REQUIRED",
      message: "Admin access is required",
    });
  }

  return next();
}

module.exports = requireAdmin;