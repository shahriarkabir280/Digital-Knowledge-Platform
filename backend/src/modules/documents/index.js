const { Router } = require("express");
const { upload, uploadErrorHandler } = require("../../api/middlewares/uploadMiddleware");
const requireAuth = require("../../api/middlewares/requireAuth");
const uploadController = require("./uploadController");
const metadataController = require("./metadataController");

const router = Router();

router.get("/health", (_req, res) => {
  res.status(200).json({ module: "repository", status: "ready" });
});

function attachAuthUser(req, _res, next) {
  req.user = {
    id: Number(req.auth.sub),
    email: req.auth.email,
    role: req.auth.role,
  };
  next();
}

router.use(requireAuth, attachAuthUser);

/**
 * Upload file endpoint
 * POST /api/repository/upload
 */
router.post(
  "/upload",
  upload.single("file"),
  uploadErrorHandler,
  uploadController.uploadFile
);

/**
 * Create document metadata
 * POST /api/repository/:id/metadata
 */
router.post("/:id/metadata", metadataController.createMetadata);

/**
 * Update document metadata
 * PUT /api/repository/:id/metadata
 */
router.put("/:id/metadata", metadataController.updateMetadata);

module.exports = router;
