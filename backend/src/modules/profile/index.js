/**
 * Profile Module — self-service profile for the logged-in user.
 * Distinct from /users (ADMIN-only role/status management).
 */

const { Router } = require("express");
const multer = require("multer");
const path = require("path");
const { z } = require("zod");

const requireAuth = require("../../api/middlewares/requireAuth");
const profileRepository = require("../../db/repositories/profile");
const supabaseStorage = require("../../services/supabaseStorage");

const router = Router();

const AVATAR_BUCKET = "documents";
const AVATAR_MAX_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_AVATAR_MIME = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

const avatarUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: AVATAR_MAX_SIZE },
  fileFilter: (_req, file, callback) => {
    if (!ALLOWED_AVATAR_MIME.has(file.mimetype)) {
      const error = new Error("Only JPEG, PNG, WEBP, or GIF images are allowed");
      error.statusCode = 400;
      error.code = "INVALID_FILE_TYPE";
      return callback(error);
    }
    callback(null, true);
  },
});

// Multer's own errors (e.g. LIMIT_FILE_SIZE) arrive as MulterError instances
// without a statusCode — normalize them before they hit the global handler.
function avatarUploadErrorHandler(err, _req, _res, next) {
  if (err instanceof multer.MulterError) {
    err.statusCode = err.code === "LIMIT_FILE_SIZE" ? 413 : 400;
    err.code = err.code || "UPLOAD_ERROR";
    if (err.code === "LIMIT_FILE_SIZE") {
      err.message = "Image exceeds the 5MB size limit";
    }
  }
  next(err);
}

// Optional URL-or-empty-string field (lets a member clear a link).
const optionalUrl = z
  .string()
  .trim()
  .max(500)
  .refine((v) => v === "" || /^https?:\/\//i.test(v), {
    message: "Must be a valid http(s) URL",
  })
  .optional();

const updateProfileSchema = z.object({
  name: z.string().trim().min(1).max(255).optional(),
  bio: z.string().trim().max(2000).optional(),
  department: z.string().trim().max(255).optional(),
  phone: z.string().trim().max(50).optional(),
  cv_url: optionalUrl,
  linkedin_url: optionalUrl,
  github_url: optionalUrl,
  google_scholar_url: optionalUrl,
  website_url: optionalUrl,
});

router.get("/me", requireAuth, async (req, res, next) => {
  try {
    const profile = await profileRepository.getById(req.auth.id);
    if (!profile) {
      return next({ statusCode: 404, code: "USER_NOT_FOUND", message: "User not found" });
    }
    res.json(profile);
  } catch (error) {
    next(error);
  }
});

router.patch("/me", requireAuth, async (req, res, next) => {
  const parsed = updateProfileSchema.safeParse(req.body);
  if (!parsed.success) {
    return next({
      statusCode: 400,
      code: "VALIDATION_ERROR",
      message: "Invalid profile data",
      errors: parsed.error.issues.map((i) => ({ field: i.path.join("."), message: i.message })),
    });
  }

  try {
    const updated = await profileRepository.updateProfile(req.auth.id, parsed.data);
    res.json(updated);
  } catch (error) {
    next(error);
  }
});

router.post("/me/avatar", requireAuth, avatarUpload.single("avatar"), avatarUploadErrorHandler, async (req, res, next) => {
  try {
    if (!req.file) {
      return next({ statusCode: 400, code: "NO_FILE", message: "No image file provided" });
    }

    const ext = (path.extname(req.file.originalname) || ".jpg").toLowerCase();
    const storagePath = `avatars/user-${req.auth.id}-${Date.now()}${ext}`;

    const { url } = await supabaseStorage.uploadFile(req.file.buffer, AVATAR_BUCKET, storagePath, {
      contentType: req.file.mimetype,
      upsert: true,
    });

    const previous = await profileRepository.getById(req.auth.id);
    const updated = await profileRepository.updateAvatar(req.auth.id, url);

    // Best-effort cleanup of the old avatar file (never blocks the response).
    if (previous?.avatar_url && previous.avatar_url.includes("/avatars/")) {
      const oldPath = previous.avatar_url.split(`${AVATAR_BUCKET}/`).pop();
      if (oldPath) {
        supabaseStorage.deleteFile(AVATAR_BUCKET, oldPath).catch(() => {});
      }
    }

    res.json(updated);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
