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
router.use("/documents", documentsRouter);
router.use("/library", libraryRouter);

const PYTHON_SERVICE_URL = process.env.PYTHON_SERVICE_URL || "http://python-service:8000";

router.post("/extract-metadata", async (req, res) => {
  try {
    const { text } = req.body;
    if (!text || typeof text !== "string" || text.trim().length < 20) {
      return res.json({ success: false, error: "Not enough text (minimum 20 characters)." });
    }

    const response = await fetch(`${PYTHON_SERVICE_URL}/extract`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: text.trim() }),
    });

    if (!response.ok) {
      const errorBody = await response.text().catch(() => "");
      return res.status(502).json({ success: false, error: `Python service error (${response.status}): ${errorBody}` });
    }

    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error("[extract-metadata] Proxy error:", error.message);
    res.status(502).json({ success: false, error: "Metadata extraction service unavailable." });
  }
});

module.exports = router;
