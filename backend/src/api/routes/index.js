const { Router } = require("express");
const swaggerUi = require("swagger-ui-express");
const openapiSpec = require("../docs/openapi");
const authRouter = require("../../modules/auth");
const documentsRouter = require("../../modules/documents");
const libraryRouter = require("../../modules/library");
const usersRouter = require("../../modules/users");
const profileRouter = require("../../modules/profile");
const projectsRouter = require("../../modules/projects");
const collaborationRouter = require("../../modules/collaboration");
const loansRouter = require("../../modules/loans");
const roleRequestsRouter = require("../../modules/roleRequests");
const db = require("../../db");
const { extractMetadataLocally } = require("../../services/metadataExtractionService");

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

router.use("/docs", swaggerUi.serve, swaggerUi.setup(openapiSpec));
router.get("/openapi.json", (_req, res) => res.json(openapiSpec));

router.use("/auth", authRouter);
router.use("/users", usersRouter);
router.use("/profile", profileRouter);
router.use("/repository", documentsRouter);
router.use("/documents", documentsRouter);
router.use("/library", libraryRouter);
router.use("/projects", projectsRouter);
router.use("/collaboration", collaborationRouter);
router.use("/loans", loansRouter);
router.use("/role-requests", roleRequestsRouter);

const PYTHON_SERVICE_URL = process.env.PYTHON_SERVICE_URL || "http://python-service:8000";

router.post("/extract-metadata", async (req, res) => {
  const { text } = req.body;
  if (!text || typeof text !== "string" || text.trim().length < 20) {
    return res.json({ success: false, error: "Not enough text (minimum 20 characters)." });
  }

  // Try Python service first, fall back to Node.js heuristics
  try {
    const response = await fetch(`${PYTHON_SERVICE_URL}/extract`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: text.trim() }),
      signal: AbortSignal.timeout(5000),
    });

    if (response.ok) {
      const data = await response.json();
      return res.json(data);
    }
    console.warn(`[extract-metadata] Python service returned ${response.status}, falling back to local`);
  } catch (error) {
    console.warn(`[extract-metadata] Python service unavailable (${error.message}), falling back to local`);
  }

  const metadata = extractMetadataLocally(text.trim(), null);
  const responseData = {
    title: metadata.title || null,
    author: metadata.author || null,
    abstract: metadata.abstract || null,
    keywords: metadata.keywords || [],
    department: metadata.department || null,
    success: true,
  };
  // Always include debug info when title falls back to "Untitled Resource"
  if (!metadata.title || metadata.title === 'Untitled Resource') {
    const rawLines = text.trim().split('\n').slice(0, 20);
    responseData._debug = {
      firstLines: rawLines,
      first500: text.trim().slice(0, 500),
    };
  }
  res.json(responseData);
});

module.exports = router;
