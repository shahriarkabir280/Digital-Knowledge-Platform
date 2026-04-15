/**
 * Upload Service
 * Handles file uploads with validation, storage, and error handling
 * Provides safe file storage with size limits and type validation
 * 
 * SRS Reference: FR-DKP-003, NFR-DKP-005
 */

const fs = require('fs').promises;
const path = require('path');
const uploadConfig = require('../config/upload.config');
const {
  sanitizeFilename,
  generateSafeFilename,
  validateFilename,
  getSafeUploadPath,
} = require('../utils/filenameUtils');

/**
 * Create upload directory if it doesn't exist
 * @param {string} dirPath - Directory path to create
 * @returns {Promise<void>}
 */
async function ensureUploadDir(dirPath) {
  try {
    await fs.mkdir(dirPath, { recursive: true });
  } catch (error) {
    throw new Error(`Failed to create upload directory: ${error.message}`);
  }
}

/**
 * Validate uploaded file before storing
 * @param {object} file - File object from multer or similar
 * @param {object} options - Validation options
 * @returns {object} {valid, errors[], warning[]}
 */
function validateUploadedFile(file, options = {}) {
  const { strictMimeValidation = true } = options;
  const errors = [];
  const warnings = [];

  if (!file) {
    errors.push('No file provided');
    return { valid: false, errors, warnings };
  }

  // Validate file exists and has required properties
  if (!file.originalname || !file.mimetype || file.size === undefined) {
    errors.push('Invalid file object: missing required properties');
    return { valid: false, errors, warnings };
  }

  // Validate filename safety
  const filenameValidation = validateFilename(file.originalname);
  if (!filenameValidation.isValid) {
    errors.push(`Unsafe filename: ${filenameValidation.errors.join(', ')}`);
  }

  // Validate file size
  if (file.size > uploadConfig.MAX_FILE_SIZE) {
    errors.push(
      `File size ${(file.size / 1024 / 1024).toFixed(2)}MB exceeds maximum allowed size of 500MB`
    );
  }

  if (file.size === 0) {
    errors.push('File is empty');
  }

  // Get file extension
  const ext = path.extname(file.originalname).toLowerCase().replace(/^\./, '');

  // Validate file extension
  if (!uploadConfig.isAllowedExtension(ext)) {
    errors.push(
      `File type .${ext} not allowed. Allowed types: ${uploadConfig
        .getAllowedExtensions()
        .join(', ')}`
    );
  }

  // Validate MIME type (if strict validation enabled)
  if (strictMimeValidation && !uploadConfig.isAllowedMimeType(file.mimetype)) {
    // If extension is allowed but MIME is not, it's a warning
    // Some clients may send wrong MIME types
    if (uploadConfig.isAllowedExtension(ext)) {
      warnings.push(
        `MIME type ${file.mimetype} unusual for .${ext} file, but extension is allowed`
      );
    } else {
      errors.push(
        `MIME type ${file.mimetype} not allowed. Expected: ${uploadConfig
          .getAllowedMimeTypes()
          .join(', ')}`
      );
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Store uploaded file to disk
 * @param {object} file - File object
 * @param {string} category - Upload category ('documents' or 'media')
 * @param {object} options - Storage options
 * @returns {Promise<object>} {success, data: {filename, path, relativePath, size}, error}
 */
async function storeUploadedFile(file, category = 'documents', options = {}) {
  const { customDir = null, useHashNaming = false } = options;

  try {
    // Determine upload directory
    let uploadDir;
    if (customDir) {
      uploadDir = customDir;
    } else if (category === 'media') {
      uploadDir = path.join(uploadConfig.UPLOAD_BASE_DIR, uploadConfig.MEDIA_DIR);
    } else {
      uploadDir = path.join(uploadConfig.UPLOAD_BASE_DIR, uploadConfig.DOCUMENTS_DIR);
    }

    // Ensure directory exists
    await ensureUploadDir(uploadDir);

    // Generate safe filename
    const { filename: safeFilename, originalFilename } = generateSafeFilename(
      file.originalname,
      { hashBased: useHashNaming }
    );

    // Get safe path (prevents directory traversal)
    const pathValidation = getSafeUploadPath(uploadConfig.UPLOAD_BASE_DIR, category, safeFilename);
    if (!pathValidation.safe) {
      throw new Error(pathValidation.error);
    }

    const filePath = pathValidation.path;

    // Write file to disk
    if (!file.path) {
      // If file.path not provided (not using multer disk storage), write from buffer
      if (!file.buffer) {
        throw new Error('File must have either path or buffer');
      }
      await fs.writeFile(filePath, file.buffer);
    } else {
      // Copy from temp location (if using multer memory storage)
      await fs.copyFile(file.path, filePath);
    }

    // Get file info
    const fileInfo = await fs.stat(filePath);

    return {
      success: true,
      data: {
        originalFilename,
        filename: safeFilename,
        path: filePath,
        relativePath: path.join(category, safeFilename),
        size: fileInfo.size,
        mimetype: file.mimetype,
        uploadedAt: new Date(),
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error.message || 'Failed to store uploaded file',
    };
  }
}

/**
 * Delete uploaded file
 * @param {string} relativePath - Relative path from upload directory
 * @returns {Promise<object>} {success, error}
 */
async function deleteUploadedFile(relativePath) {
  try {
    if (!relativePath) {
      throw new Error('Relative path required');
    }

    // Validate path to prevent directory traversal
    const fullPath = path.resolve(uploadConfig.UPLOAD_BASE_DIR, relativePath);
    const uploadBaseDir = path.resolve(uploadConfig.UPLOAD_BASE_DIR);

    if (!fullPath.startsWith(uploadBaseDir)) {
      throw new Error('Invalid file path: attempted directory traversal');
    }

    // Check if file exists before deleting
    try {
      await fs.access(fullPath);
    } catch {
      return { success: true }; // File doesn't exist, consider it deleted
    }

    // Delete the file
    await fs.unlink(fullPath);

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error.message || 'Failed to delete file',
    };
  }
}

/**
 * Get file info
 * @param {string} relativePath - Relative path from upload directory
 * @returns {Promise<object>} {success, data, error}
 */
async function getFileInfo(relativePath) {
  try {
    const fullPath = path.resolve(uploadConfig.UPLOAD_BASE_DIR, relativePath);
    const uploadBaseDir = path.resolve(uploadConfig.UPLOAD_BASE_DIR);

    if (!fullPath.startsWith(uploadBaseDir)) {
      throw new Error('Invalid file path');
    }

    const stats = await fs.stat(fullPath);

    return {
      success: true,
      data: {
        exists: true,
        size: stats.size,
        createdAt: stats.birthtime,
        modifiedAt: stats.mtime,
      },
    };
  } catch (error) {
    return {
      success: false,
      data: { exists: false },
      error: error.message,
    };
  }
}

/**
 * Get formatted file size
 * @param {number} bytes - Size in bytes
 * @returns {string} Formatted size (e.g., "2.5 MB")
 */
function formatFileSize(bytes) {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}

/**
 * Clean up temporary uploads (older than specified hours)
 * @param {number} ageHours - Delete files older than this many hours (default: 24)
 * @returns {Promise<object>} {success, deletedCount, error}
 */
async function cleanupTempDir(ageHours = 24) {
  try {
    const tempDir = path.join(uploadConfig.UPLOAD_BASE_DIR, uploadConfig.TEMP_DIR);
    const ageMs = ageHours * 60 * 60 * 1000;
    const now = Date.now();

    const files = await fs.readdir(tempDir);
    let deletedCount = 0;

    for (const file of files) {
      const filePath = path.join(tempDir, file);
      const stats = await fs.stat(filePath);

      if (now - stats.mtimeMs > ageMs) {
        await fs.unlink(filePath);
        deletedCount++;
      }
    }

    return { success: true, deletedCount };
  } catch (error) {
    return {
      success: false,
      deletedCount: 0,
      error: error.message,
    };
  }
}

module.exports = {
  // Configuration and validation
  validateUploadedFile,
  uploadConfig,

  // File storage operations
  ensureUploadDir,
  storeUploadedFile,
  deleteUploadedFile,
  getFileInfo,

  // Utilities
  formatFileSize,
  cleanupTempDir,

  // Re-export filename utilities
  ...require('../utils/filenameUtils'),
};
