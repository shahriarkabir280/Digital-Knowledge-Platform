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
const { createResourceRecord, findResourceById, parseResourceId } = require('./resourceStorage');
const metadataExtractionService = require('../../services/metadataExtractionService');

const PRIVILEGED_REPOSITORY_ROLES = new Set(['STAFF', 'LAB_MANAGER', 'REVIEWER', 'ADMIN']);
const RESOURCE_CATEGORY_ALIASES = {
  'textbook': 'textbook',
  'lecture-slides': 'lecture-slides',
  'lecture slides': 'lecture-slides',
  'slides': 'lecture-slides',
  'lab-manual': 'lab-manual',
  'lab manual': 'lab-manual',
  'question-bank': 'question-bank',
  'question bank': 'question-bank',
  'assignment': 'assignment',
  'lab-report': 'lab-report',
  'lab report': 'lab-report',
  'research-paper': 'research-paper',
  'research paper': 'research-paper',
  'thesis': 'thesis',
  'dataset': 'dataset',
  'media': 'media',
  'documents': 'documents',
};

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

function normalizeResourceCategory(value) {
  if (typeof value !== 'string') {
    console.log('[normalizeResourceCategory] value is not string:', typeof value, value);
    return '';
  }

  const normalized = value.toLowerCase().trim().replace(/[^a-z0-9-]/g, '');
  console.log('[normalizeResourceCategory] value:', value, 'normalized:', normalized);
  if (!normalized) {
    console.log('[normalizeResourceCategory] normalized is empty');
    return '';
  }

  const result = RESOURCE_CATEGORY_ALIASES[normalized] || RESOURCE_CATEGORY_ALIASES[value.toLowerCase().trim()] || normalized;
  console.log('[normalizeResourceCategory] final result:', result);
  return result;
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
    // Get authenticated user
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required',
        code: 'UNAUTHENTICATED',
      });
    }

    // Check if file was provided or if it's a URL upload
    const linkUrl = req.body.linkUrl;
    const isUrlUpload = linkUrl && (linkUrl.startsWith('http://') || linkUrl.startsWith('https://'));

    if (!req.file && !isUrlUpload) {
      return res.status(400).json({
        success: false,
        error: 'No file or valid URL provided',
        code: 'NO_FILE_OR_URL',
      });
    }

    if (req.file) {
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
    }

    console.log('[uploadController.uploadFile] req.body fields:', Object.keys(req.body));
    console.log('[uploadController.uploadFile] req.body.resourceCategory:', req.body.resourceCategory);
    console.log('[uploadController.uploadFile] req.body.keywords:', req.body.keywords, 'type:', typeof req.body.keywords);
    console.log('[uploadController.uploadFile] req.body.tags:', req.body.tags, 'type:', typeof req.body.tags);
    console.log('[uploadController.uploadFile] req.body.department:', req.body.department, 'type:', typeof req.body.department);
    console.log('[uploadController.uploadFile] req.body.course:', req.body.course, 'type:', typeof req.body.course);
    console.log('[uploadController.uploadFile] FULL req.body:', JSON.stringify(req.body, null, 2));

    // Parse keywords from FormData (they come as JSON string)
    let parsedKeywords = [];
    if (req.body.keywords) {
      try {
        const keywordValue = req.body.keywords;
        if (typeof keywordValue === 'string') {
          // Try to parse as JSON first
          try {
            const parsed = JSON.parse(keywordValue);
            parsedKeywords = Array.isArray(parsed) ? parsed : [keywordValue];
          } catch {
            // If not JSON, treat as comma-separated string
            parsedKeywords = keywordValue.split(',').map(t => t.trim()).filter(Boolean);
          }
        } else if (Array.isArray(keywordValue)) {
          parsedKeywords = keywordValue;
        }
        console.log('[uploadController.uploadFile] parsedKeywords:', parsedKeywords);
      } catch (err) {
        console.warn('[uploadController.uploadFile] Error parsing keywords:', err);
      }
    } else if (req.body.tags) {
      try {
        const tagValue = req.body.tags;
        if (typeof tagValue === 'string') {
          try {
            const parsed = JSON.parse(tagValue);
            parsedKeywords = Array.isArray(parsed) ? parsed : [tagValue];
          } catch {
            parsedKeywords = tagValue.split(',').map(t => t.trim()).filter(Boolean);
          }
        } else if (Array.isArray(tagValue)) {
          parsedKeywords = tagValue;
        }
      } catch (err) {
        console.warn('[uploadController.uploadFile] Error parsing tags:', err);
      }
    }

    const ext = isUrlUpload ? 'url' : req.file.originalname.split('.').pop().toLowerCase();
    const ALLOWED_RESOURCE_CATEGORIES = new Set([
      'documents', 'media',
      'textbook', 'lecture-slides', 'lab-manual',
      'research-paper', 'thesis', 'dataset',
      'question-bank', 'assignment', 'lab-report', 'project',
    ]);
    const rawCategory = normalizeResourceCategory(req.body.resourceCategory);
    console.log('[uploadController] req.body.resourceCategory:', req.body.resourceCategory, 'rawCategory:', rawCategory);
    const category = ALLOWED_RESOURCE_CATEGORIES.has(rawCategory)
      ? rawCategory
      : getCategoryFromExtension(ext);
    console.log('[uploadController] category:', category, 'ALLOWED_RESOURCE_CATEGORIES.has(rawCategory):', ALLOWED_RESOURCE_CATEGORIES.has(rawCategory));
    const resourceType = ['research-paper', 'thesis', 'dataset'].includes(rawCategory)
      ? 'research'
      : 'academic';
    const storedResourceCategory = rawCategory || (category === 'documents' ? extractDocumentType(ext) : 'media');
    console.log('[uploadController] storedResourceCategory:', storedResourceCategory);

    let fileData;
    let format;

    if (isUrlUpload) {
      fileData = {
        originalFilename: req.body.title || 'Link Resource',
        filename: 'link',
        relativePath: linkUrl,
        size: 0,
        mimetype: 'text/html',
      };
      format = 'url';
    } else {
      // Store file to Supabase Storage
      const storeResult = await uploadService.storeUploadedFile(req.file, category);

      if (!storeResult.success) {
        return res.status(500).json({
          success: false,
          error: storeResult.error || 'Failed to store file',
          code: 'STORAGE_ERROR',
        });
      }

      fileData = storeResult.data;
      format = ext.toLowerCase();
    }

    const title = req.body.title || extractTitleFromFilename(fileData.originalFilename);
    const description = req.body.description || null;

    const user = await db('users').where({ id: userId }).first(['name', 'email']);
    const defaultAuthorName = user?.name || user?.email || 'Unknown';
    // Use provided author from form, fallback to logged-in user
    const authorName = req.body.author ? req.body.author.trim() : defaultAuthorName;

    // Get current year as default if not provided
    const currentYear = new Date().getFullYear();
    const uploadYear = req.body.year ? Number(req.body.year) : currentYear;
    const publishedYear = req.body.publishedYear ? Number(req.body.publishedYear) : uploadYear;

    console.log('[uploadController] Processing department:', {
      raw: req.body.department,
      type: typeof req.body.department,
      trimmed: req.body.department?.trim?.(),
      condition: req.body.department && req.body.department.trim() ? 'WILL_STORE' : 'WILL_BE_NULL'
    });

    console.log('[uploadController] Processing course:', {
      raw: req.body.course,
      type: typeof req.body.course,
      trimmed: req.body.course?.trim?.(),
      condition: req.body.course && req.body.course.trim() ? 'WILL_STORE' : 'WILL_BE_NULL'
    });

    const initialState = req.body.state === 'draft' ? 'draft' : 'pending';

    const resourceRecord = await createResourceRecord({
      resourceType,
      uploaderId: userId,
      title,
      description,
      filePath: fileData.relativePath,
      format,
      state: initialState,
      accessTier: req.body.accessTier || 'PUBLIC',
      metadata: {
        author: authorName,
        department: req.body.department && req.body.department.trim() ? req.body.department.trim() : null,
        course: req.body.course && req.body.course.trim() ? req.body.course.trim() : null,
        year: uploadYear,
        publishedYear: publishedYear,
        language: req.body.language || 'English',
        keywords: parsedKeywords,
        type: storedResourceCategory,
        resourceCategory: storedResourceCategory,
      },
    });

    const resourceId = resourceRecord.id;
    const resourceTable = resourceRecord.table;

    // Fire-and-forget: extract metadata from document text using local heuristics
    // Only run for PDF and DOCX files where we can extract text
    if (!isUrlUpload && ['pdf', 'docx'].includes(ext) && req.file.buffer) {
      metadataExtractionService.extractAndSaveMetadata(
        resourceId,
        req.file.buffer,
        ext,
        req.file.originalname
      ).catch((err) => {
        console.warn('[uploadController] Background metadata extraction failed:', err.message);
      });
    }

    // Only notify admins for direct submissions (pending state), not drafts
    if (initialState === 'pending') {
      try {
        const adminUsers = await db('users').where({ role: 'ADMIN' }).select('id');
        if (adminUsers.length > 0) {
          const notifications = adminUsers.map((admin) => ({
            user_id: admin.id,
            document_id: null,
            event_type: 'document_pending',
            title: 'New resource pending approval',
            message: `"${resourceRecord.title || 'Untitled'}" uploaded by ${authorName} is pending moderation review.`,
            is_read: false,
            created_at: db.fn.now(),
          }));

          await db('notifications').insert(notifications).catch((err) => {
            console.warn('Failed to create notifications:', err.message);
          });
        }
      } catch (err) {
        console.warn('Failed to notify admins:', err.message);
      }
    }

    return res.status(201).json({
      success: true,
      data: {
        document: {
          id: resourceId,
          title: resourceRecord.title,
          type: resourceRecord.type,
          format,
          version: 1,
          state: initialState,
          accessTier: 'REGISTERED',
          uploadedBy: userId,
          uploadedAt: new Date().toISOString(),
          resourceTable,
          resourceType,
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

    const resourceLookup = await findResourceById(documentId);
    const existingDocument = resourceLookup?.document;
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
    const rawCategory = normalizeResourceCategory(req.body.resourceCategory);
    const category = rawCategory || getCategoryFromExtension(ext);
    const storedResourceCategory = rawCategory || (category === 'documents' ? extractDocumentType(ext) : 'media');

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
      const result = await db(resourceLookup.table)
        .where({ id: documentId })
        .update({
          resource_type: storedResourceCategory,
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
          type: updatedDocument.resource_type || updatedDocument.type,
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
    const parsedDocumentId = parseResourceId(documentId);

    const resourceLookup = await findResourceById(parsedDocumentId || documentId);
    const document = resourceLookup?.document;

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

    // Check if external link
    const isUrl = document.file_path && (document.file_path.startsWith('http://') || document.file_path.startsWith('https://'));

    let fileInfo;
    if (isUrl) {
      fileInfo = {
        data: {
          size: 0,
          exists: true,
          createdAt: document.created_at,
          modifiedAt: document.updated_at,
        }
      };
    } else {
      fileInfo = await uploadService.getFileInfo(document.file_path);
    }

    return res.status(200).json({
      success: true,
      data: {
        document: {
          id: document.id,
          title: document.title,
          type: document.resource_type || document.type,
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
 * GET /api/repository/files/:documentId/signed-url
 * Get a long-lived signed URL for downloading the file (valid for 1 hour)
 */
async function getSignedFileUrl(req, res, next) {
  try {
    const { documentId } = req.params;
    const parsedDocumentId = parseResourceId(documentId);

    const resourceLookup = await findResourceById(parsedDocumentId || documentId);
    const document = resourceLookup?.document;

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

    // Check if external link
    const isUrl = document.file_path && (document.file_path.startsWith('http://') || document.file_path.startsWith('https://'));

    if (isUrl) {
      return res.status(200).json({
        success: true,
        data: {
          signedUrl: document.file_path,
          expiresIn: 3600,
        },
      });
    }

    // Generate a long-lived signed URL (3600 seconds = 1 hour)
    const signedUrl = await uploadService.getSignedUrl(document.file_path, 3600);

    return res.status(200).json({
      success: true,
      data: {
        signedUrl,
        expiresIn: 3600, // seconds
      },
    });
  } catch (error) {
    console.error('Get signed URL error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to generate signed URL',
      code: 'SIGNED_URL_ERROR',
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
    const parsedDocumentId = parseResourceId(documentId);
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required',
        code: 'UNAUTHENTICATED',
      });
    }

    const resourceLookup = await findResourceById(parsedDocumentId || documentId);
    const document = resourceLookup?.document;

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

    // Delete the resource record from its table
    await db(resourceLookup.table).where({ id: parsedDocumentId || documentId }).delete();

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
    const parsedDocumentId = parseResourceId(documentId);

    const resourceLookup = await findResourceById(parsedDocumentId || documentId);
    const document = resourceLookup?.document;
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

    // Check if external link
    const isUrl = document.file_path && (document.file_path.startsWith('http://') || document.file_path.startsWith('https://'));

    if (isUrl) {
      return res.redirect(302, document.file_path);
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
  getSignedFileUrl,
  streamFileContent,
  deleteFile,
};
