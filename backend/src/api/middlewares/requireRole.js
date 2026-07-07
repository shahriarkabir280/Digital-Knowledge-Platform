/**
 * Middleware: Require one of the specified roles.
 * Usage: requireRole("STAFF", "LAB_MANAGER", "ADMIN")
 */

function requireRole(...allowedRoles) {
  return (req, _res, next) => {
    const userRole = req.auth?.role;
    if (!userRole || !allowedRoles.includes(userRole)) {
      return next({
        statusCode: 403,
        code: "INSUFFICIENT_ROLE",
        message: `This action requires one of: ${allowedRoles.join(", ")}`,
      });
    }
    return next();
  };
}

module.exports = requireRole;
