/**
 * Safe Filename Utilities
 * Pure string/crypto helpers — no disk I/O.
 * Files are stored in Supabase Storage, not on local disk.
 */

const crypto = require('crypto');
const path = require('path');

/**
 * Sanitize a filename: strip dangerous characters, limit length.
 * @param {string} filename
 * @returns {{ original: string, sanitized: string, ext: string }}
 */
function sanitizeFilename(filename) {
  if (!filename || typeof filename !== 'string') {
    throw new Error('Invalid filename provided');
  }

  const ext = path.extname(filename).toLowerCase();
  const basename = path.basename(filename, ext);

  let sanitized = basename
    .replace(/[\x00-\x1F\x7F]/g, '')   // control chars
    .replace(/[^a-zA-Z0-9_\- ]/g, '')  // keep safe chars only
    .replace(/\s+/g, '-')
    .trim()
    .replace(/^[\.\-]+|[\.\-]+$/g, '');

  if (!sanitized) sanitized = 'file';

  const maxLength = 255 - ext.length - 1;
  if (sanitized.length > maxLength) sanitized = sanitized.substring(0, maxLength);

  return { original: filename, sanitized, ext };
}

/**
 * Generate a unique safe filename with timestamp + random suffix.
 * Format: <sanitized_name>_<timestamp>_<random8hex>.ext
 * @param {string} filename
 * @param {{ hashBased?: boolean }} options
 * @returns {{ filename: string, ext: string, originalFilename: string }}
 */
function generateSafeFilename(filename, options = {}) {
  const { hashBased = false } = options;
  const { original, sanitized, ext } = sanitizeFilename(filename);

  let uniqueName;
  if (hashBased) {
    uniqueName = crypto
      .createHash('sha256')
      .update(Buffer.from(filename + Date.now()))
      .digest('hex')
      .substring(0, 12);
  } else {
    const timestamp = Date.now();
    const randomSuffix = crypto.randomBytes(4).toString('hex');
    uniqueName = `${sanitized.substring(0, 50)}_${timestamp}_${randomSuffix}`;
  }

  return {
    filename: uniqueName + ext,
    ext: ext.replace(/^\./, ''),
    originalFilename: original,
  };
}

/**
 * Validate a filename for safety.
 * @param {string} filename
 * @returns {{ isValid: boolean, errors: string[] }}
 */
function validateFilename(filename) {
  const errors = [];

  if (!filename || typeof filename !== 'string') {
    errors.push('Filename must be a non-empty string');
    return { isValid: false, errors };
  }

  if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
    errors.push('Filename cannot contain path separators');
  }

  if (filename.includes('\0')) {
    errors.push('Filename cannot contain null bytes');
  }

  if (filename.length > 255) {
    errors.push('Filename exceeds maximum length (255 characters)');
  }

  const reserved = ['con', 'prn', 'aux', 'nul', 'com1', 'com2', 'lpt1', 'lpt2'];
  const baseName = path.basename(filename, path.extname(filename)).toLowerCase();
  if (reserved.includes(baseName)) {
    errors.push('Filename uses reserved system name');
  }

  return { isValid: errors.length === 0, errors };
}

module.exports = {
  sanitizeFilename,
  generateSafeFilename,
  validateFilename,
};
