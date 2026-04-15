const { Router } = require("express");
const authRouter = require("../../modules/auth");
const documentsRouter = require("../../modules/documents");
const libraryRouter = require("../../modules/library");
const usersRouter = require("../../modules/users");
const db = require("../../db");

const router = Router();

router.get("/health", async (_req, res, next) => {
  try {
    await db.ping();

    res.status(200).json({
      status: "ok",
      service: "backend-api",
      database: "connected",
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    next(error);
  }
});

router.get("/status", (_req, res) => {
  res.status(200).json({ message: "API is ready" });
});

router.use("/auth", authRouter);
router.use("/users", usersRouter);
router.use("/repository", documentsRouter);
router.use("/library", libraryRouter);

module.exports = router;
