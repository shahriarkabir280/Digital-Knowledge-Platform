const { Router } = require("express");
const { z } = require("zod");

const requireAuth = require("../../api/middlewares/requireAuth");
const requireAdmin = require("../../api/middlewares/requireAdmin");
const usersRepository = require("../../db/repositories/users");

const router = Router();

const allowedRoles = [
  "MEMBER",
  "CONTRIBUTOR",
  "STAFF",
  "LAB_MANAGER",
  "ADMIN",
  "REVIEWER",
];

const roleUpdateSchema = z.object({
  role: z.enum(allowedRoles),
});

router.use(requireAuth, requireAdmin);

router.get("/", async (_req, res, next) => {
  try {
    const users = await usersRepository.listUsers();
    return res.status(200).json({ users });
  } catch (error) {
    return next(error);
  }
});

router.patch("/:id/role", async (req, res, next) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    return next({
      statusCode: 400,
      code: "INVALID_USER_ID",
      message: "User id must be a positive integer",
    });
  }

  const parsed = roleUpdateSchema.safeParse(req.body);
  if (!parsed.success) {
    const details = parsed.error.issues.map((issue) => ({
      field: issue.path.join("."),
      message: issue.message,
    }));

    return next({
      statusCode: 400,
      code: "VALIDATION_ERROR",
      message: "Invalid role update payload",
      details,
    });
  }

  try {
    const updated = await usersRepository.updateUserRoleById(id, parsed.data.role);

    if (!updated) {
      return next({
        statusCode: 404,
        code: "USER_NOT_FOUND",
        message: "User not found",
      });
    }

    return res.status(200).json({
      message: "User role updated",
      user: updated,
    });
  } catch (error) {
    return next(error);
  }
});

module.exports = router;
