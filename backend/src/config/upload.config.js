/**
 * File Upload Configuration
 * Defines allowed file types, sizes, and MIME types for the Digital Knowledge Platform
 * 
 * SRS Reference: FR-DKP-003 - Document Upload
 * - Maximum file upload size: 500MB per file
 * - Supported formats: PDF, DOCX, PPTX, MP4, MP3, JPG, PNG
 */

const UPLOAD_CONFIG = {
  // Maximum file size in bytes (500MB)
  MAX_FILE_SIZE: 500 * 1024 * 1024, // 500MB
  
  // Upload directories
  UPLOAD_BASE_DIR: process.env.UPLOAD_DIR || './uploads',
  DOCUMENTS_DIR: 'documents',  // PDF, DOCX, PPTX
  MEDIA_DIR: 'media',           // MP4, MP3, JPG, PNG
  TEMP_DIR: 'temp',             // Temporary upload files
  
  // Allowed file types with MIME types
  ALLOWED_TYPES: {
    // Documents
    PDF: {
      ext: 'pdf',
      mimeTypes: ['application/pdf'],
      category: 'documents',
      description: 'PDF Document',
    },
    DOCX: {
      ext: 'docx',
      mimeTypes: [
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/msword', // Legacy .doc
      ],
      category: 'documents',
      description: 'Word Document',
    },
    PPTX: {
      ext: 'pptx',
      mimeTypes: [
        'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        'application/vnd.ms-powerpoint', // Legacy .ppt
      ],
      category: 'documents',
      description: 'PowerPoint Presentation',
    },

    // Audio
    MP3: {
      ext: 'mp3',
      mimeTypes: ['audio/mpeg', 'audio/mp3'],
      category: 'media',
      description: 'MP3 Audio',
    },

    // Video
    MP4: {
      ext: 'mp4',
      mimeTypes: ['video/mp4'],
      category: 'media',
      description: 'MP4 Video',
    },

    // Images
    JPG: {
      ext: 'jpg',
      mimeTypes: ['image/jpeg'],
      category: 'media',
      description: 'JPEG Image',
    },
    JPEG: {
      ext: 'jpeg',
      mimeTypes: ['image/jpeg'],
      category: 'media',
      description: 'JPEG Image',
    },
    PNG: {
      ext: 'png',
      mimeTypes: ['image/png'],
      category: 'media',
      description: 'PNG Image',
    },
  },

  /**
   * Get all allowed MIME types as a flat array
   * @returns {string[]} Array of all allowed MIME types
   */
  getAllowedMimeTypes() {
    const mimeTypes = [];
    Object.values(this.ALLOWED_TYPES).forEach((type) => {
      mimeTypes.push(...type.mimeTypes);
    });
    return [...new Set(mimeTypes)]; // Remove duplicates
  },

  /**
   * Get all allowed file extensions
   * @returns {string[]} Array of allowed extensions (without dot)
   */
  getAllowedExtensions() {
    return Object.values(this.ALLOWED_TYPES).map((type) => type.ext);
  },

  /**
   * Get allowed extensions for a category
   * @param {string} category - 'documents' or 'media'
   * @returns {string[]} Array of allowed extensions for category
   */
  getExtensionsByCategory(category) {
    return Object.values(this.ALLOWED_TYPES)
      .filter((type) => type.category === category)
      .map((type) => type.ext);
  },

  /**
   * Get category for file type
   * @param {string} ext - File extension
   * @returns {string|null} Category ('documents' or 'media') or null if not found
   */
  getCategoryByExtension(ext) {
    const normalized = ext.toLowerCase().replace(/^\./, '');
    const typeKey = Object.keys(this.ALLOWED_TYPES).find(
      (key) => this.ALLOWED_TYPES[key].ext === normalized
    );
    return typeKey ? this.ALLOWED_TYPES[typeKey].category : null;
  },

  /**
   * Validate MIME type
   * @param {string} mimeType - Declared MIME type
   * @returns {boolean} True if MIME type is allowed
   */
  isAllowedMimeType(mimeType) {
    return this.getAllowedMimeTypes().includes(mimeType);
  },

  /**
   * Validate file extension
   * @param {string} ext - File extension
   * @returns {boolean} True if extension is allowed
   */
  isAllowedExtension(ext) {
    const normalized = ext.toLowerCase().replace(/^\./, '');
    return this.getAllowedExtensions().includes(normalized);
  },

  /**
   * Get description for file type
   * @param {string} ext - File extension
   * @returns {string|null} Description or null if not found
   */
  getTypeDescription(ext) {
    const normalized = ext.toLowerCase().replace(/^\./, '');
    const typeKey = Object.keys(this.ALLOWED_TYPES).find(
      (key) => this.ALLOWED_TYPES[key].ext === normalized
    );
    return typeKey ? this.ALLOWED_TYPES[typeKey].description : null;
  },
};

module.exports = UPLOAD_CONFIG;
