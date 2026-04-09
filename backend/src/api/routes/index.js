const { Router } = require("express");
const authRouter = require("../../modules/auth");
const documentsRouter = require("../../modules/documents");
const libraryRouter = require("../../modules/library");

const router = Router();

router.get("/health", (_req, res) => {
  res.status(200).json({
    status: "ok",
    service: "backend-api",
    timestamp: new Date().toISOString(),
  });
});

router.get("/status", (_req, res) => {
  res.status(200).json({ message: "API is ready" });
});

router.use("/auth", authRouter);
router.use("/repository", documentsRouter);
router.use("/library", libraryRouter);

module.exports = router;
