/**
 * Upload Controller
 * Handles file upload endpoints with validation, storage, and database operations
 * 
 * SRS Reference: FR-DKP-003, FR-DKP-004 (Document Metadata)
 */

const uploadService = require('../../services/uploadService');
const db = require('../../db');

/**
 * Determine upload category from file extension
 * @param {string} ext - File extension
 * @returns {string} 'documents' or 'media'
 */
function getCategoryFromExtension(ext) {
  const category = uploadService.uploadConfig.getCategoryByExtension(ext);
  return category || 'documents';
}

/**
 * POST /api/repository/upload
 * Upload a single file with validation and metadata storage
 * 
 * Request:
 *   - file: multipart/form-data file input
 *   - title (optional): Custom title for the document
 *   - description (optional): Document description
 * 
 * Response: {success, data: {document, file}, error}
 */
async function uploadFile(req, res, next) {
  try {
    // Check if file was provided
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No file provided',
        code: 'NO_FILE',
      });
    }

    // Get authenticated user
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required',
        code: 'UNAUTHENTICATED',
      });
    }

    // Validate uploaded file
    const validation = uploadService.validateUploadedFile(req.file, {
      strictMimeValidation: true,
    });

    if (!validation.valid) {
      return res.status(400).json({
        success: false,
        error: validation.errors[0] || 'File validation failed',
        errors: validation.errors,
        code: 'VALIDATION_FAILED',
      });
    }

    // Log warnings if any
    if (validation.warnings && validation.warnings.length > 0) {
      console.warn('Upload warnings:', validation.warnings);
    }

    // Determine category based on file type
    const ext = req.file.originalname.split('.').pop().toLowerCase();
    const category = getCategoryFromExtension(ext);

    // Store file to disk
    const storeResult = await uploadService.storeUploadedFile(req.file, category);

    if (!storeResult.success) {
      return res.status(500).json({
        success: false,
        error: storeResult.error || 'Failed to store file',
        code: 'STORAGE_ERROR',
      });
    }

    const fileData = storeResult.data;

    // Get or create document record in database
    const title = req.body.title || extractTitleFromFilename(fileData.originalFilename);
    const description = req.body.description || null;

    // Determine document type and format
    const docType = category === 'documents' ? extractDocumentType(ext) : 'media';
    const format = ext.toLowerCase();

    // Create document record
    const insertedDocs = await db('documents')
      .insert({
        uploader_id: userId,
        title,
        type: docType,
        format,
        file_path: fileData.relativePath,
        version: 1,
        state: 'draft', // New uploads start as draft
        access_tier: 'REGISTERED', // Default access
        created_at: db.fn.now(),
        updated_at: db.fn.now(),
      })
      .returning('id');

    const documentId = Array.isArray(insertedDocs) ? insertedDocs[0].id || insertedDocs[0] : insertedDocs.id || insertedDocs;

    // Create metadata record for the document
    // Get user name from database for metadata
    const user = await db('users').where({ id: userId }).first(['name', 'email']);
    const authorName = user?.name || user?.email || 'Unknown';

    await db('metadata')
      .insert({
        document_id: documentId,
        author: authorName,
        abstract: description,
        created_at: db.fn.now(),
        updated_at: db.fn.now(),
      })
      .catch((err) => {
        console.warn('Failed to create metadata:', err.message);
        // Don't fail the upload if metadata fails - just warn
      });

    // Retrieve complete document record
    const document = await db('documents').where({ id: documentId }).first();

    return res.status(201).json({
      success: true,
      data: {
        document: {
          id: document.id,
          title: document.title,
          type: document.type,
          format: document.format,
          state: document.state,
          accessTier: document.access_tier,
          uploadedBy: userId,
          uploadedAt: document.created_at,
        },
        file: {
          originalFilename: fileData.originalFilename,
          filename: fileData.filename,
          path: fileData.relativePath,
          size: fileData.size,
          sizeFormatted: uploadService.formatFileSize(fileData.size),
          mimetype: fileData.mimetype,
        },
      },
      message: 'File uploaded successfully',
    });
  } catch (error) {
    console.error('Upload error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'An error occurred during upload',
      code: 'UPLOAD_ERROR',
    });
  }
}

/**
 * Extract document type from file extension
 * @param {string} ext - File extension
 * @returns {string} Document type
 */
function extractDocumentType(ext) {
  const typeMap = {
    pdf: 'research-paper',
    docx: 'report',
    pptx: 'presentation',
    doc: 'report',
    ppt: 'presentation',
  };
  return typeMap[ext.toLowerCase()] || 'document';
}

/**
 * Extract title from filename
 * Removes extension and replaces hyphens/underscores with spaces
 * @param {string} filename - Original filename
 * @returns {string} Extracted title
 */
function extractTitleFromFilename(filename) {
  if (!filename) return 'Untitled Document';

  // Remove extension
  const title = filename
    .replace(/\.[^.]+$/, '')
    // Replace underscores and hyphens with spaces
    .replace(/[\-_]/g, ' ')
    // Capitalize words
    .split(' ')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ')
    .trim();

  return title || 'Untitled Document';
}

/**
 * GET /api/repository/files/:documentId
 * Retrieve file information
 */
async function getFileInfo(req, res, next) {
  try {
    const { documentId } = req.params;

    // Get document record
    const document = await db('documents').where({ id: documentId }).first();

    if (!document) {
      return res.status(404).json({
        success: false,
        error: 'Document not found',
        code: 'NOT_FOUND',
      });
    }

    // Check access (all authenticated users can view published files, others see only own)
    if (document.state !== 'published' && document.uploader_id !== req.user?.id) {
      return res.status(403).json({
        success: false,
        error: 'Access denied',
        code: 'FORBIDDEN',
      });
    }

    // Get file info
    const fileInfo = await uploadService.getFileInfo(document.file_path);

    return res.status(200).json({
      success: true,
      data: {
        document: {
          id: document.id,
          title: document.title,
          type: document.type,
          format: document.format,
          state: document.state,
        },
        file: {
          path: document.file_path,
          size: fileInfo.data.size,
          sizeFormatted: uploadService.formatFileSize(fileInfo.data.size),
          exists: fileInfo.data.exists,
          createdAt: fileInfo.data.createdAt,
          modifiedAt: fileInfo.data.modifiedAt,
        },
      },
    });
  } catch (error) {
    console.error('Get file info error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to retrieve file info',
      code: 'RETRIEVE_ERROR',
    });
  }
}

/**
 * DELETE /api/repository/files/:documentId
 * Delete a file and document record
 */
async function deleteFile(req, res, next) {
  try {
    const { documentId } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required',
        code: 'UNAUTHENTICATED',
      });
    }

    // Get document record
    const document = await db('documents').where({ id: documentId }).first();

    if (!document) {
      return res.status(404).json({
        success: false,
        error: 'Document not found',
        code: 'NOT_FOUND',
      });
    }

    // Check ownership
    if (document.uploader_id !== userId && req.user?.role !== 'ADMIN') {
      return res.status(403).json({
        success: false,
        error: 'Only the uploader can delete this file',
        code: 'FORBIDDEN',
      });
    }

    // Delete file from disk
    const deleteResult = await uploadService.deleteUploadedFile(document.file_path);

    if (!deleteResult.success) {
      console.warn('Failed to delete file:', deleteResult.error);
      // Continue anyway - remove database record
    }

    // Delete document record and associated metadata
    await db('metadata').where({ document_id: documentId }).delete();
    await db('documents').where({ id: documentId }).delete();

    return res.status(200).json({
      success: true,
      message: 'Document and file deleted successfully',
    });
  } catch (error) {
    console.error('Delete file error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to delete file',
      code: 'DELETE_ERROR',
    });
  }
}

module.exports = {
  uploadFile,
  getFileInfo,
  deleteFile,
};
