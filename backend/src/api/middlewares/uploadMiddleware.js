/**
 * Multer Upload Middleware
 * Configures file upload handling with size limits and MIME type validation
 * 
 * SRS Reference: FR-DKP-003 - Document Upload
 */

const multer = require('multer');
const path = require('path');
const uploadConfig = require('../../config/upload.config');

/**
 * Configure multer for file uploads
 * Uses memory storage for flexibility - file is stored in req.file.buffer
 * Actual disk storage happens in uploadService.storeUploadedFile()
 */
const upload = multer({
  // Memory storage - file data in req.file.buffer
  storage: multer.memoryStorage(),

  // File size limit (500MB from SRS)
  limits: {
    fileSize: uploadConfig.MAX_FILE_SIZE,
  },

  // Optional: Check file extension before accepting
  fileFilter: (req, file, callback) => {
    // Get file extension from original filename
    const ext = path.extname(file.originalname).toLowerCase().replace(/^\./, '');

    // Check if extension is allowed (first-pass validation)
    if (!uploadConfig.isAllowedExtension(ext)) {
      const allowedExts = uploadConfig.getAllowedExtensions().join(', ');
      const error = new Error(
        `File type .${ext} not allowed. Allowed types: ${allowedExts}`
      );
      error.status = 400;
      error.code = 'INVALID_FILE_TYPE';
      return callback(error);
    }

    callback(null, true);
  },
});

/**
 * Middleware for handling multer upload errors
 * Catches errors from multer and formats them appropriately
 */
function uploadErrorHandler(err, req, res, next) {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({
        success: false,
        error: 'File size exceeds maximum allowed size of 500MB',
        code: 'FILE_TOO_LARGE',
        maxSize: '500MB',
      });
    }
    if (err.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({
        success: false,
        error: 'Too many files uploaded',
        code: 'TOO_MANY_FILES',
      });
    }
    if (err.code === 'LIMIT_PART_COUNT') {
      return res.status(400).json({
        success: false,
        error: 'Too many form fields',
        code: 'TOO_MANY_FIELDS',
      });
    }
  }

  // Pass to next error handler if not a multer error
  if (err) {
    err.status = err.status || 400;
    err.code = err.code || 'UPLOAD_ERROR';
  }
  next(err);
}

module.exports = {
  upload,
  uploadErrorHandler,
  uploadConfig,
};
