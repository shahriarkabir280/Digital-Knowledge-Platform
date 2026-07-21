const { Router } = require("express");
const { upload, uploadErrorHandler } = require("../../api/middlewares/uploadMiddleware");
const requireAuth = require("../../api/middlewares/requireAuth");
const optionalAuth = require("../../api/middlewares/optionalAuth");
const uploadController = require("./uploadController");
const metadataController = require("./metadataController");
const stateController = require("./stateController");
const listController = require("./listController");
const accessRequestController = require("./accessRequestController");

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

function attachOptionalAuthUser(req, _res, next) {
  if (req.auth) {
    req.user = {
      id: Number(req.auth.sub),
      email: req.auth.email,
      role: req.auth.role,
    };
  }
  next();
}

/**
 * Public reads — available to guests (no token) as well as authenticated
 * users. Access-tier enforcement happens inside these controllers based on
 * whether req.user is set.
 */
router.get("/published", optionalAuth, attachOptionalAuthUser, listController.getPublishedDocuments);
router.get("/files/:documentId", optionalAuth, attachOptionalAuthUser, uploadController.getFileInfo);
router.get("/files/:documentId/signed-url", optionalAuth, attachOptionalAuthUser, uploadController.getSignedFileUrl);
router.get("/files/:documentId/content", optionalAuth, attachOptionalAuthUser, uploadController.streamFileContent);

router.use(requireAuth, attachAuthUser);

router.get("/notifications", stateController.getMyNotifications);
router.patch("/notifications/read-all", stateController.markAllNotificationsRead);
router.patch("/notifications/:notificationId/read", stateController.markNotificationRead);

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
 * Remaining file endpoints (mutations require auth)
 */
router.delete("/files/:documentId", uploadController.deleteFile);

/**
 * Replace existing file and increment version
 * PUT /api/documents/:id/file
 */
router.put(
  "/:id/file",
  upload.single("file"),
  uploadErrorHandler,
  uploadController.replaceFile
);

/**
 * Create document metadata
 * POST /api/repository/:id/metadata
 */
router.post("/:id/metadata", metadataController.createMetadata);

/**
 * Get document metadata
 * GET /api/repository/:id/metadata
 */
router.get("/:id/metadata", metadataController.getMetadata);

/**
 * Update document metadata
 * PUT /api/repository/:id/metadata
 */
router.put("/:id/metadata", metadataController.updateMetadata);

/**
 * Update lifecycle state
 * PATCH /api/documents/:id/state
 */
router.patch("/:id/state", stateController.patchDocumentState);

/**
 * Document lifecycle audit logs
 * GET /api/documents/:id/audit-logs
 */
router.get("/:id/audit-logs", stateController.getDocumentAuditLogs);

/**
 * List uploads for current user
 * GET /api/documents/my-uploads?state=&type=
 */
router.get("/my-uploads", listController.getMyUploads);

/**
 * Staff/reviewer queue for submissions pending review
 * GET /api/documents/review-queue?type=
 */
router.get("/review-queue", listController.getReviewQueue);

/**
 * Admin global records - pending approval
 * GET /api/documents/pending?type=
 */
router.get("/pending", listController.getPendingDocuments);

/**
 * Staff/reviewer all uploads listing
 * GET /api/documents/all-uploads?state=&type=&uploaderId=&accessTier=
 */
router.get("/all-uploads", listController.getAllUploads);

/**
 * Request access to a RESTRICTED document
 * POST /api/documents/:id/access-requests
 */
router.post("/:id/access-requests", accessRequestController.requestAccess);

/**
 * Access requests I've submitted
 * GET /api/documents/access-requests/mine
 */
router.get("/access-requests/mine", accessRequestController.listMine);

/**
 * Access requests awaiting my decision (documents I authored)
 * GET /api/documents/access-requests/incoming?status=
 */
router.get("/access-requests/incoming", accessRequestController.listIncoming);

/**
 * Approve/reject an access request
 * PATCH /api/documents/access-requests/:requestId/decision
 */
router.patch("/access-requests/:requestId/decision", accessRequestController.decide);

module.exports = router;
