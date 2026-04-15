/**
 * Safe Filename Generator and Sanitizer
 * Ensures uploaded filenames are safe, unique, and prevent directory traversal attacks
 * 
 * Security Features:
 * - Removes/replaces dangerous characters
 * - Prevents directory traversal (../, /, \)
 * - Generates unique filenames to avoid collisions
 * - Preserves original filename for reference
 */

const crypto = require('crypto');
const path = require('path');

/**
 * Sanitize filename to prevent security issues
 * @param {string} filename - Original filename
 * @returns {object} {original, sanitized, ext}
 */
function sanitizeFilename(filename) {
  if (!filename || typeof filename !== 'string') {
    throw new Error('Invalid filename provided');
  }

  // Get file extension
  const ext = path.extname(filename).toLowerCase();
  const basename = path.basename(filename, ext);

  // Remove null bytes and control characters
  let sanitized = basename.replace(/[\x00-\x1F\x7F]/g, '');

  // Replace or remove dangerous characters
  // Allow only: letters, numbers, hyphens, underscores, and spaces
  sanitized = sanitized.replace(/[^a-zA-Z0-9_\- ]/g, '');

  // Replace multiple spaces with single space, then trim
  sanitized = sanitized.replace(/\s+/g, '-').trim();

  // Remove leading/trailing dots and hyphens
  sanitized = sanitized.replace(/^[\.\-]+|[\.\-]+$/g, '');

  // Ensure minimum length
  if (!sanitized || sanitized.length === 0) {
    sanitized = 'file';
  }

  // Limit filename length (max 255 bytes total with extension)
  const maxLength = 255 - ext.length - 1; // -1 for the dot
  if (sanitized.length > maxLength) {
    sanitized = sanitized.substring(0, maxLength);
  }

  return {
    original: filename,
    sanitized,
    ext: ext,
  };
}

/**
 * Generate unique safe filename with timestamp and random suffix
 * Format: <sanitized_name>_<timestamp>_<random>.ext
 * 
 * @param {string} filename - Original filename
 * @param {object} options - Configuration options
 * @param {boolean} options.includeOriginal - Add original filename in metadata (default: true)
 * @param {boolean} options.hashBased - Use hash-based naming instead of timestamp (default: false)
 * @returns {object} {filename, ext, original, hash}
 */
function generateSafeFilename(filename, options = {}) {
  const { includeOriginal = true, hashBased = false } = options;

  const { original, sanitized, ext } = sanitizeFilename(filename);

  let uniqueName;
  if (hashBased) {
    // Use hash-based naming: <hash>.ext
    // Useful for deduplication - same file gets same hash
    const fileHash = crypto
      .createHash('sha256')
      .update(Buffer.from(filename + Date.now()))
      .digest('hex')
      .substring(0, 12); // First 12 chars of hash

    uniqueName = fileHash;
  } else {
    // Use timestamp + random suffix for guaranteed uniqueness
    // Format: filename_TIMESTAMP_RANDOM.ext
    const timestamp = Date.now();
    const randomSuffix = crypto.randomBytes(4).toString('hex');

    // Keep sanitized name but limit it to 50 chars for readability
    const displayName = sanitized.substring(0, 50);
    uniqueName = `${displayName}_${timestamp}_${randomSuffix}`;
  }

  const finalFilename = uniqueName + ext;

  const result = {
    filename: finalFilename,
    ext: ext.replace(/^\./, ''), // Remove leading dot
    originalFilename: includeOriginal ? original : undefined,
    sanitizedFilename: sanitized,
  };

  if (hashBased) {
    result.hash = uniqueName;
  }

  return result;
}

/**
 * Validate filename safety
 * @param {string} filename - Filename to validate
 * @returns {object} {isValid, errors[]}
 */
function validateFilename(filename) {
  const errors = [];

  if (!filename || typeof filename !== 'string') {
    errors.push('Filename must be a non-empty string');
    return { isValid: false, errors };
  }

  // Check for directory traversal attempts
  if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
    errors.push('Filename cannot contain path separators');
  }

  // Check for null bytes
  if (filename.includes('\0')) {
    errors.push('Filename cannot contain null bytes');
  }

  // Check length (OS limit is typically 255)
  if (filename.length > 255) {
    errors.push('Filename exceeds maximum length (255 characters)');
  }

  // Check for reserved names (Windows)
  const reserved = ['con', 'prn', 'aux', 'nul', 'com1', 'com2', 'lpt1', 'lpt2'];
  const baseName = path.basename(filename, path.extname(filename)).toLowerCase();
  if (reserved.includes(baseName)) {
    errors.push('Filename uses reserved system name');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Check if filename could be a directory traversal attack
 * @param {string} filename - Filename to check
 * @returns {boolean} True if potentially dangerous
 */
function isTraversalAttempt(filename) {
  if (!filename || typeof filename !== 'string') {
    return false;
  }

  return (
    filename.includes('..') ||
    filename.includes('/') ||
    filename.includes('\\') ||
    filename.startsWith('~') ||
    filename.includes('\0')
  );
}

/**
 * Get safe upload path
 * Ensures the resolved path is within the upload directory
 * 
 * @param {string} uploadDir - Base upload directory
 * @param {string} subdir - Subdirectory (e.g., 'documents', 'media')
 * @param {string} filename - Filename to validate
 * @returns {object} {safe, path, error}
 */
function getSafeUploadPath(uploadDir, subdir, filename) {
  if (!uploadDir || !filename) {
    return {
      safe: false,
      error: 'Invalid uploadDir or filename',
    };
  }

  // Normalize the upload directory
  const normalizedUploadDir = path.resolve(uploadDir);

  // Check if subdir is safe
  if (isTraversalAttempt(subdir)) {
    return {
      safe: false,
      error: 'Invalid subdirectory path',
    };
  }

  // Construct the full path
  const fullPath = path.resolve(
    normalizedUploadDir,
    subdir || '.',
    path.basename(filename)
  );

  // Verify the resolved path is within upload directory
  if (!fullPath.startsWith(normalizedUploadDir)) {
    return {
      safe: false,
      error: 'Attempted directory traversal detected',
    };
  }

  return {
    safe: true,
    path: fullPath,
    relativePath: path.relative(normalizedUploadDir, fullPath),
  };
}

module.exports = {
  sanitizeFilename,
  generateSafeFilename,
  validateFilename,
  isTraversalAttempt,
  getSafeUploadPath,
};
