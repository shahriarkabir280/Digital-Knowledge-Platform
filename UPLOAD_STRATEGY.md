# File Upload Storage Strategy

## Overview
The Digital Knowledge Platform implements a secure, scalable local file storage strategy for document and media uploads with comprehensive validation, safe filename handling, and directory traversal protection.

## Architecture

### Directory Structure
```
uploads/
├── .gitignore              # Ignore all uploaded files in git
├── documents/              # PDF, DOCX, PPTX files
│   └── .gitkeep           # Placeholder for git tracking
├── media/                  # Images (JPG, PNG), Audio (MP3), Video (MP4)
│   └── .gitkeep           # Placeholder for git tracking
└── temp/                   # Temporary uploads during processing
    └── .gitkeep           # Placeholder for git tracking
```

### File Naming Strategy
All uploaded files follow a safe naming pattern to prevent collision and security issues:

**Format**: `<sanitized_name>_<timestamp>_<random_hex>.ext`

Example: `research-paper_1713193200000_a1b2c3d4.pdf`

**Benefits**:
- ✅ Unique filenames (avoids overwrites)
- ✅ Preserves readability (sanitized original name)
- ✅ Timestamp allows sorting by upload time
- ✅ Random suffix prevents prediction attacks
- ✅ Original filename stored separately in database metadata

## Configuration

### Environment Variables
```bash
# Maximum upload file size (default: 500MB)
UPLOAD_MAX_SIZE_MB=500

# Base upload directory (can be absolute path for production)
UPLOAD_DIR=./uploads

# Allowed file extensions (comma-separated)
UPLOAD_ALLOWED_EXTENSIONS=pdf,docx,pptx,mp3,mp4,jpg,jpeg,png

# MIME type validation strictness
UPLOAD_STRICT_MIME_VALIDATION=true

# Auto-cleanup temp files older than N hours
UPLOAD_TEMP_CLEANUP_HOURS=24
```

### Allowed File Types (SRS FR-DKP-003)

| Category | Format | MIME Type | Extension |
|----------|--------|-----------|-----------|
| Documents | PDF | application/pdf | .pdf |
| Documents | Word | application/vnd.openxmlformats-officedocument.wordprocessingml.document | .docx |
| Documents | PowerPoint | application/vnd.openxmlformats-officedocument.presentationml.presentation | .pptx |
| Audio | MP3 | audio/mpeg, audio/mp3 | .mp3 |
| Video | MP4 | video/mp4 | .mp4 |
| Images | JPEG | image/jpeg | .jpg, .jpeg |
| Images | PNG | image/png | .png |

**Maximum Size**: 500MB per file (NFR-DKP-003)

## Security Features

### 1. Filename Sanitization
- **Removes**: Null bytes, control characters, path separators (`/`, `\`, `..`)
- **Replaces**: Special characters with hyphens
- **Preserves**: Alphanumeric, hyphens, underscores, spaces
- **Limits**: 255 chars total with extension

Example sanitization:
```
Input:  "../../../evil.pdf" + "my file (1).pdf"
Output: "my-file-1.pdf"
```

### 2. Directory Traversal Prevention
- Validates relative paths stay within upload directory
- Resolves all `.` and `..` references
- Rejects paths containing separators
- Checks final resolved path is within base directory

### 3. File Type Validation
- **Extension Check**: Verifies `.ext` against allowed list
- **MIME Type Check**: Validates `Content-Type` header (can be disabled if needed)
- **Size Check**: Enforces 500MB limit before storing
- **Empty File Check**: Rejects zero-byte uploads

### 4. Unique Naming
- Timestamps prevent collision from multiple uploads with same name
- Random hex suffix ensures cryptographic uniqueness
- Original filename preserved in database metadata (not in filesystem)

## Usage Examples

### Basic Upload
```javascript
const uploadService = require('../services/uploadService');

// Validate file before storing
const validation = uploadService.validateUploadedFile(req.file);
if (!validation.valid) {
  return res.status(400).json({ errors: validation.errors });
}

// Store file
const result = await uploadService.storeUploadedFile(
  req.file,
  'documents'  // category: 'documents' or 'media'
);

if (result.success) {
  // Save to database
  await db('documents').insert({
    file_path: result.data.relativePath,
    file_size: result.data.size,
    original_filename: result.data.originalFilename,
  });
}
```

### Get File Size (Formatted)
```javascript
const sizeStr = uploadService.formatFileSize(1048576); // "1 MB"
```

### Cleanup Old Temporary Files
```javascript
const cleanup = await uploadService.cleanupTempDir(24); // Delete > 24h old
console.log(`Deleted ${cleanup.deletedCount} temporary files`);
```

### Delete Uploaded File
```javascript
const result = await uploadService.deleteUploadedFile('documents/myfile_123_abc.pdf');
if (result.success) {
  console.log('File deleted');
}
```

## Integration with Express Multer

### Setup Middleware
```javascript
const multer = require('multer');
const uploadService = require('../services/uploadService');

// Configure multer for memory storage (file in req.file.buffer)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: uploadService.uploadConfig.MAX_FILE_SIZE },
});

// Route example
app.post('/api/documents/upload', upload.single('file'), async (req, res) => {
  // Validate
  const validation = uploadService.validateUploadedFile(req.file);
  if (!validation.valid) {
    return res.status(400).json({ errors: validation.errors });
  }

  // Store
  const result = await uploadService.storeUploadedFile(req.file, 'documents');
  if (!result.success) {
    return res.status(500).json({ error: result.error });
  }

  return res.json({ file: result.data });
});
```

## Database Integration

Store file metadata in `documents` and `metadata` tables:

```sql
INSERT INTO documents (uploader_id, title, type, format, file_path, state)
VALUES (
  $1,                              -- user_id
  $2,                              -- title
  'research-paper',                -- type category
  'pdf',                           -- format from file extension
  'documents/paper_123_abc.pdf',   -- relativePath from upload
  'published'
);

INSERT INTO metadata (document_id, file_path, ...)
VALUES (
  (SELECT id FROM documents WHERE ... LIMIT 1),
  'research-paper.pdf'             -- Original filename for display
);
```

## Performance Considerations

### Storage Location
- **Development**: `./uploads` (local disk, auto-created)
- **Production**: Mount external storage (NFS, SAN, S3-compatible object store)

### Scaling Strategies
1. **Local Disk**: Works for < 1TB total storage, single-server deployment
2. **Network Storage**: NFS/SMB mount for multi-server deployments
3. **Object Storage**: S3-compatible service for cloud deployments (future enhancement)

### Cleanup Policy
- Temporary files auto-deleted after 24 hours (configurable)
- Run cleanup job via cron or scheduled task:
  ```bash
  node -e "require('./src/services/uploadService').cleanupTempDir(24)"
  ```

## Monitoring

### Key Metrics
- Upload count and frequency
- Most common file types
- Storage used per category (documents vs media)
- Failed upload attempts (invalid types, size exceeded)

### Logging
Add logging to upload operations:
```javascript
logger.info('File uploaded', {
  user_id: req.user.id,
  originalFilename: result.data.originalFilename,
  filename: result.data.filename,
  size: result.data.size,
  mimetype: result.data.mimetype,
});
```

## Security Best Practices

✅ **Do**:
- Validate file type on both client and server
- Store original filenames in database, not filesystem
- Sanitize all user-provided filenames
- Enforce size limits before accepting uploads
- Log all upload attempts with user attribution
- Use HTTPS for file upload endpoints
- Require authentication for upload endpoints
- Regular backups of upload directory

❌ **Don't**:
- Execute uploaded files
- Trust file extensions as sole validation
- Store uploads in web-accessible location without restrictions
- Allow absolute paths in filenames
- Skip MIME type validation for convenience
- Mix user-uploaded files with application files

## Future Enhancements

1. **Cloud Storage Integration**
   - S3-compatible API for scalable storage
   - CDN integration for fast file delivery

2. **Advanced Validation**
   - Virus/malware scanning on upload
   - Image dimension validation
   - Video codec verification

3. **File Versioning**
   - Keep upload history per document
   - Rollback to previous versions

4. **Compression**
   - Auto-compress PDFs
   - Video transcoding for playback optimization

5. **Access Control**
   - Per-file download permissions
   - Time-limited signed URLs
   - Rate limiting on downloads

## Troubleshooting

**Issue**: "File size exceeds maximum allowed size"
```
Solution: Increase UPLOAD_MAX_SIZE_MB in .env, adjust nginx/reverse proxy limits
          Also check multer limits in Express middleware configuration
```

**Issue**: "MIME type not allowed"
```
Solution: Disable strict validation (UPLOAD_STRICT_MIME_VALIDATION=false)
          or check client is sending correct Content-Type header
```

**Issue**: "Directory traversal error"
```
Solution: This is normal - system is blocking attempted attacks
          Check filename isn't using .. or / characters
```

**Issue**: Upload directory does not exist
```
Solution: Ensure UPLOAD_DIR points to a valid location
          Run: mkdir -p ./uploads/{documents,media,temp}
```

## References
- SRS FR-DKP-003: Document Upload requirements
- SRS NFR-DKP-005: Performance - async processing for large files
- SRS NFR-DKP-017: File upload security and virus scanning
