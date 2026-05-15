/**
 * Upload Service
 * Handles file uploads to Supabase Storage with validation.
 *
 * SRS Reference: FR-DKP-003, NFR-DKP-005
 */

const path = require('path');
const uploadConfig = require('../config/upload.config');
const supabaseStorage = require('./supabaseStorage');
const { sanitizeFilename, generateSafeFilename, validateFilename } = require('../utils/filenameUtils');

const BUCKET_NAME = 'documents';

/**
 * Validate uploaded file before storing.
 * @param {object} file - File object from multer
 * @param {object} options
 * @returns {{ valid: boolean, errors: string[], warnings: string[] }}
 */
function validateUploadedFile(file, options = {}) {
  const { strictMimeValidation = true } = options;
  const errors = [];
  const warnings = [];

  if (!file) {
    errors.push('No file provided');
    return { valid: false, errors, warnings };
  }

  if (!file.originalname || !file.mimetype || file.size === undefined) {
    errors.push('Invalid file object: missing required properties');
    return { valid: false, errors, warnings };
  }

  const filenameValidation = validateFilename(file.originalname);
  if (!filenameValidation.isValid) {
    errors.push(`Unsafe filename: ${filenameValidation.errors.join(', ')}`);
  }

  if (file.size > uploadConfig.MAX_FILE_SIZE) {
    errors.push(
      `File size ${(file.size / 1024 / 1024).toFixed(2)}MB exceeds maximum allowed size of 500MB`
    );
  }

  if (file.size === 0) {
    errors.push('File is empty');
  }

  const ext = path.extname(file.originalname).toLowerCase().replace(/^\./, '');

  if (!uploadConfig.isAllowedExtension(ext)) {
    errors.push(
      `File type .${ext} not allowed. Allowed types: ${uploadConfig.getAllowedExtensions().join(', ')}`
    );
  }

  if (strictMimeValidation && !uploadConfig.isAllowedMimeType(file.mimetype)) {
    if (uploadConfig.isAllowedExtension(ext)) {
      warnings.push(
        `MIME type ${file.mimetype} unusual for .${ext} file, but extension is allowed`
      );
    } else {
      errors.push(
        `MIME type ${file.mimetype} not allowed.`
      );
    }
  }

  return { valid: errors.length === 0, errors, warnings };
}

/**
 * Upload file buffer to Supabase Storage.
 * @param {object} file - Multer file object (must have .buffer)
 * @param {string} category - 'documents' or 'media'
 * @returns {Promise<{ success: boolean, data?: object, error?: string }>}
 */
async function storeUploadedFile(file, category = 'documents') {
  try {
    if (!file.buffer) {
      throw new Error('File buffer is missing. Ensure multer memoryStorage is used.');
    }

    const { filename: safeFilename, originalFilename } = generateSafeFilename(file.originalname);

    // Store under category subfolder: documents/filename.pdf or media/filename.mp4
    const storagePath = `${category}/${safeFilename}`;

    const result = await supabaseStorage.uploadFile(
      file.buffer,
      BUCKET_NAME,
      storagePath,
      { contentType: file.mimetype, upsert: false }
    );

    return {
      success: true,
      data: {
        originalFilename,
        filename: safeFilename,
        // relativePath is what gets stored in the DB documents.file_path column
        relativePath: storagePath,
        storagePath,
        bucket: BUCKET_NAME,
        size: file.size,
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
 * Delete file from Supabase Storage.
 * @param {string} relativePath - Path stored in DB (e.g. 'documents/abc.pdf')
 * @returns {Promise<{ success: boolean, error?: string }>}
 */
async function deleteUploadedFile(relativePath) {
  try {
    if (!relativePath) throw new Error('Relative path required');
    await supabaseStorage.deleteFile(BUCKET_NAME, relativePath);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * Get a short-lived signed URL for a private file (used for streaming/preview).
 * @param {string} relativePath - Path stored in DB
 * @param {number} expiresIn - Seconds until expiry (default 60)
 * @returns {Promise<string>} Signed URL
 */
async function getSignedUrl(relativePath, expiresIn = 60) {
  const client = supabaseStorage.getSupabaseClient();
  const { data, error } = await client.storage
    .from(BUCKET_NAME)
    .createSignedUrl(relativePath, expiresIn);

  if (error) throw new Error(`Failed to create signed URL: ${error.message}`);
  return data.signedUrl;
}

/**
 * Get file info (existence check via signed URL attempt).
 * @param {string} relativePath
 * @returns {Promise<{ success: boolean, data: object }>}
 */
async function getFileInfo(relativePath) {
  try {
    const signedUrl = await getSignedUrl(relativePath, 10);
    return {
      success: true,
      data: { exists: true, signedUrl },
    };
  } catch {
    return {
      success: false,
      data: { exists: false },
    };
  }
}

/**
 * Format bytes to human-readable string.
 */
function formatFileSize(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}

module.exports = {
  validateUploadedFile,
  storeUploadedFile,
  deleteUploadedFile,
  getSignedUrl,
  getFileInfo,
  formatFileSize,
  uploadConfig,
  ...require('../utils/filenameUtils'),
};
