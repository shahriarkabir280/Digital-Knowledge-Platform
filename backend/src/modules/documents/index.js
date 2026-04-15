const { Router } = require("express");
const { upload, uploadErrorHandler } = require("../../api/middlewares/uploadMiddleware");
const requireAuth = require("../../api/middlewares/requireAuth");
const uploadController = require("./uploadController");

const router = Router();

router.get("/health", (_req, res) => {
  res.status(200).json({ module: "repository", status: "ready" });
});

/**
 * Middleware to convert req.auth to req.user for controller compatibility
 */
function attachAuthUser(req, res, next) {
  req.user = {
    id: Number(req.auth.sub),
    email: req.auth.email,
    role: req.auth.role,
  };
  next();
}

/**
 * Upload file endpoint
 * POST /api/repository/upload
 */
router.post(
  "/upload",
  requireAuth,
  attachAuthUser,
  upload.single("file"),
  uploadErrorHandler,
  uploadController.uploadFile
);

module.exports = router;
