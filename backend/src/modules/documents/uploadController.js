/**
 * Upload Controller
 * Handles file upload endpoints with validation, storage, and database operations
 * 
 * SRS Reference: FR-DKP-003, FR-DKP-004 (Document Metadata)
 */

const uploadService = require('../../services/uploadService');
const db = require('../../db');
const { validateDocumentId } = require('./metadataValidator');
const { versionIncrementExpression } = require('./versionService');
const { sameDocumentOwner } = require('./ownership');

const PRIVILEGED_REPOSITORY_ROLES = new Set(['STAFF', 'LAB_MANAGER', 'REVIEWER', 'ADMIN']);

function canAccessDocumentContent(document, user) {
  if (!user) {
    return false;
  }

  if (sameDocumentOwner(document, user)) {
    return true;
  }

  if (document.state === 'published') {
    return true;
  }

  return PRIVILEGED_REPOSITORY_ROLES.has(user.role);
}

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
          version: document.version,
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
 * PUT /api/documents/:id/file
 * Replace existing file and increment document version.
 */
async function replaceFile(req, res, next) {
  const documentIdResult = validateDocumentId(req.params.id);
  if (!documentIdResult.ok) {
    return next(documentIdResult.error);
  }

  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No file provided',
        code: 'NO_FILE',
      });
    }

    const documentId = documentIdResult.data;
    const userId = req.user?.id;

    const existingDocument = await db('documents').where({ id: documentId }).first();
    if (!existingDocument) {
      return res.status(404).json({
        success: false,
        error: 'Document not found',
        code: 'DOCUMENT_NOT_FOUND',
      });
    }

    if (!sameDocumentOwner(existingDocument, { id: userId }) && req.user?.role !== 'ADMIN') {
      return res.status(403).json({
        success: false,
        error: 'Only the uploader or admin can replace this file',
        code: 'FORBIDDEN',
      });
    }

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

    const ext = req.file.originalname.split('.').pop().toLowerCase();
    const category = getCategoryFromExtension(ext);
    const docType = category === 'documents' ? extractDocumentType(ext) : 'media';

    const storeResult = await uploadService.storeUploadedFile(req.file, category);
    if (!storeResult.success) {
      return res.status(500).json({
        success: false,
        error: storeResult.error || 'Failed to store replacement file',
        code: 'STORAGE_ERROR',
      });
    }

    const fileData = storeResult.data;
    const previousVersion = existingDocument.version;
    const oldPath = existingDocument.file_path;

    let updatedDocument;
    try {
      const result = await db('documents')
        .where({ id: documentId })
        .update({
          type: docType,
          format: ext,
          file_path: fileData.relativePath,
          version: versionIncrementExpression(db),
          updated_at: db.fn.now(),
        })
        .returning('*');

      updatedDocument = Array.isArray(result) ? result[0] : result;
    } catch (error) {
      await uploadService.deleteUploadedFile(fileData.relativePath);
      throw error;
    }

    if (oldPath && oldPath !== fileData.relativePath) {
      const cleanup = await uploadService.deleteUploadedFile(oldPath);
      if (!cleanup.success) {
        console.warn('Failed to remove previous file version:', cleanup.error);
      }
    }

    return res.status(200).json({
      success: true,
      message: 'Document file replaced and version incremented',
      data: {
        document: {
          id: updatedDocument.id,
          title: updatedDocument.title,
          type: updatedDocument.type,
          format: updatedDocument.format,
          version: updatedDocument.version,
          previousVersion,
          state: updatedDocument.state,
          accessTier: updatedDocument.access_tier,
          updatedAt: updatedDocument.updated_at,
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
    });
  } catch (error) {
    return next(error);
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

    if (!canAccessDocumentContent(document, req.user)) {
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

/**
 * GET /api/repository/files/:documentId/content
 * Redirect to a short-lived signed Supabase Storage URL for inline preview.
 */
async function streamFileContent(req, res, next) {
  try {
    const { documentId } = req.params;

    const document = await db('documents').where({ id: documentId }).first();
    if (!document) {
      return res.status(404).json({
        success: false,
        error: 'Document not found',
        code: 'NOT_FOUND',
      });
    }

    if (!canAccessDocumentContent(document, req.user)) {
      return res.status(403).json({
        success: false,
        error: 'Access denied',
        code: 'FORBIDDEN',
      });
    }

    const signedUrl = await uploadService.getSignedUrl(document.file_path, 120);
    return res.redirect(302, signedUrl);
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  uploadFile,
  replaceFile,
  getFileInfo,
  streamFileContent,
  deleteFile,
};
