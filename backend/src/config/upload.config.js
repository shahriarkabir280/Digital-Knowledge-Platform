/**
 * File Upload Configuration
 * Defines allowed file types, sizes, and MIME types for the Digital Knowledge Platform
 * Files are stored in Supabase Storage — no local disk usage.
 *
 * SRS Reference: FR-DKP-003 - Document Upload
 */

const UPLOAD_CONFIG = {
  // Maximum file size in bytes (500MB)
  MAX_FILE_SIZE: 500 * 1024 * 1024,

  // Supabase Storage bucket name
  BUCKET_NAME: 'documents',

  // Folder prefixes inside the bucket
  DOCUMENTS_FOLDER: 'documents', // PDF, DOCX, PPTX
  MEDIA_FOLDER: 'media',         // MP4, MP3, JPG, PNG

  // Allowed file types with MIME types
  ALLOWED_TYPES: {
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
        'application/msword',
      ],
      category: 'documents',
      description: 'Word Document',
    },
    PPTX: {
      ext: 'pptx',
      mimeTypes: [
        'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        'application/vnd.ms-powerpoint',
      ],
      category: 'documents',
      description: 'PowerPoint Presentation',
    },
    MP3: {
      ext: 'mp3',
      mimeTypes: ['audio/mpeg', 'audio/mp3'],
      category: 'media',
      description: 'MP3 Audio',
    },
    MP4: {
      ext: 'mp4',
      mimeTypes: ['video/mp4'],
      category: 'media',
      description: 'MP4 Video',
    },
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

  getAllowedMimeTypes() {
    const mimeTypes = [];
    Object.values(this.ALLOWED_TYPES).forEach((type) => mimeTypes.push(...type.mimeTypes));
    return [...new Set(mimeTypes)];
  },

  getAllowedExtensions() {
    return Object.values(this.ALLOWED_TYPES).map((type) => type.ext);
  },

  getCategoryByExtension(ext) {
    const normalized = ext.toLowerCase().replace(/^\./, '');
    const typeKey = Object.keys(this.ALLOWED_TYPES).find(
      (key) => this.ALLOWED_TYPES[key].ext === normalized
    );
    return typeKey ? this.ALLOWED_TYPES[typeKey].category : null;
  },

  isAllowedMimeType(mimeType) {
    return this.getAllowedMimeTypes().includes(mimeType);
  },

  isAllowedExtension(ext) {
    const normalized = ext.toLowerCase().replace(/^\./, '');
    return this.getAllowedExtensions().includes(normalized);
  },
};

module.exports = UPLOAD_CONFIG;
