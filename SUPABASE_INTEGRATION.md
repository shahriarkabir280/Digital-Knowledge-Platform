# Supabase Integration Examples

Quick examples showing how to use Supabase services in your app.

## Backend Integration

### 1. Initialize Supabase in your app.js

```javascript
// src/app.js
const app = require("./app");
const supabaseStorage = require("./services/supabaseStorage");
const supabaseAuth = require("./services/supabaseAuth");

// Initialize Supabase services on app start
try {
  supabaseStorage.initSupabase();
  supabaseAuth.initSupabaseAuth();
  console.log("✅ Supabase services initialized");
} catch (error) {
  console.error("❌ Failed to initialize Supabase:", error.message);
  process.exit(1);
}

module.exports = app;
```

### 2. Update uploadController.js to use Supabase Storage

```javascript
// src/modules/documents/uploadController.js
const supabaseStorage = require("../../services/supabaseStorage");

async function handleDocumentUpload(req, res, next) {
  try {
    const { file } = req;
    const { userId } = req.user; // From auth middleware

    // 1. Save document record to database
    const [documentId] = await db("documents").insert({
      uploader_id: userId,
      title: file.originalname,
      file_format: path.extname(file.originalname).slice(1),
      state: "draft",
      access_tier: "REGISTERED",
    });

    // 2. Upload file to Supabase Storage
    const storagePath = `documents/${documentId}/${file.originalname}`;
    const result = await supabaseStorage.uploadFile(
      file.buffer,
      "documents",
      storagePath,
      { contentType: file.mimetype }
    );

    // 3. Update document with storage URL
    await db("documents")
      .where({ id: documentId })
      .update({
        file_path: result.path,
        file_url: result.url,
      });

    res.json({
      success: true,
      document: {
        id: documentId,
        title: file.originalname,
        url: result.url,
      },
    });
  } catch (error) {
    next(error);
  }
}

module.exports = { handleDocumentUpload };
```

### 3. Update document deletion to remove from storage

```javascript
// src/modules/documents/deleteController.js
const supabaseStorage = require("../../services/supabaseStorage");

async function deleteDocument(req, res, next) {
  try {
    const { documentId } = req.params;

    // 1. Get document from database
    const doc = await db("documents").where({ id: documentId }).first();

    if (!doc) {
      return res.status(404).json({ error: "Document not found" });
    }

    // 2. Delete from Supabase Storage
    if (doc.file_path) {
      await supabaseStorage.deleteFile("documents", doc.file_path);
    }

    // 3. Delete from database
    await db("documents").where({ id: documentId }).delete();

    res.json({ success: true });
  } catch (error) {
    next(error);
  }
}

module.exports = { deleteDocument };
```

### 4. Use Supabase Auth for admin operations (optional)

```javascript
// src/modules/auth/adminUserService.js
const supabaseAuth = require("../../services/supabaseAuth");

async function createUserWithAuth(email, password, userData) {
  // Create in Supabase Auth
  const authUser = await supabaseAuth.createUser(
    email,
    password,
    userData
  );

  // Create in your database
  const [userId] = await db("users").insert({
    email,
    name: userData.full_name,
    role: userData.role,
  });

  return { authId: authUser.user.id, dbId: userId };
}

async function updateUserRole(userId, newRole) {
  // Update in Supabase Auth metadata
  await supabaseAuth.updateUser(userId, {
    user_metadata: { role: newRole },
  });

  // Update in database
  await db("users").where({ id: userId }).update({ role: newRole });
}

module.exports = {
  createUserWithAuth,
  updateUserRole,
};
```

---

## Frontend Integration

### 1. Optional: Switch to Supabase Auth

```javascript
// src/app/auth-session.js
import { supabase, signIn, signOut, getCurrentUser } from '../lib/supabase'

export async function loginWithSupabase(email, password) {
  const { user, session, error } = await signIn(email, password)
  if (error) throw error
  return { user, session }
}

export async function logoutWithSupabase() {
  const { error } = await signOut()
  if (error) throw error
}

export async function getSupabaseUser() {
  const { user, error } = await getCurrentUser()
  if (error) throw error
  return user
}
```

### 2. Upload files to Supabase Storage

```javascript
// In your upload component
import { uploadFile } from '../lib/supabase'

async function handleFileUpload(file) {
  const path = `documents/${Date.now()}/${file.name}`
  const { url, error } = await uploadFile(file, 'documents', path)
  
  if (error) {
    console.error('Upload failed:', error)
    return
  }

  // Send to your backend
  await fetch('/api/documents', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      title: file.name,
      file_url: url,
      file_path: path,
    }),
  })
}
```

### 3. Download files from Supabase Storage

```javascript
// Supabase Storage generates public URLs automatically
// Just load them directly:

function DocumentViewer({ fileUrl }) {
  return <iframe src={fileUrl} style={{ width: '100%', height: '600px' }} />
}
```

---

## Migration from Local Files to Supabase

### One-time migration script

```javascript
// scripts/migrate-to-supabase.js
const fs = require('fs').promises;
const path = require('path');
const supabaseStorage = require('../src/services/supabaseStorage');
const { getDb } = require('../src/db');

async function migrateFiles() {
  const db = getDb();
  supabaseStorage.initSupabase();

  const documents = await db('documents');

  for (const doc of documents) {
    if (!doc.file_path) continue;

    try {
      // Read file from local storage
      const localPath = path.join(__dirname, '../uploads', doc.file_path);
      const fileBuffer = await fs.readFile(localPath);

      // Upload to Supabase
      const storagePath = `documents/${doc.id}/${path.basename(localPath)}`;
      const result = await supabaseStorage.uploadFile(
        fileBuffer,
        'documents',
        storagePath
      );

      // Update database with new URL
      await db('documents')
        .where({ id: doc.id })
        .update({
          file_path: result.path,
          file_url: result.url,
        });

      console.log(`✓ Migrated: ${doc.title}`);
    } catch (error) {
      console.error(`✗ Failed to migrate ${doc.title}:`, error.message);
    }
  }

  console.log('Migration complete!');
}

migrateFiles().catch(console.error);
```

Run with:
```bash
node scripts/migrate-to-supabase.js
```

---

## Environment Variables Checklist

**Backend (.env):**
```
DATABASE_URL=postgresql://...
SUPABASE_URL=https://...supabase.co
SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
```

**Frontend (.env):**
```
VITE_SUPABASE_URL=https://...supabase.co
VITE_SUPABASE_ANON_KEY=...
```

---

## Testing

### Test Supabase connection

```bash
# Backend
curl http://localhost:3000/health

# Check database
npm run db:smoke

# Test migrations
npm run db:migrate
```

### Test file upload

```bash
curl -X POST http://localhost:3000/api/documents/upload \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "file=@test-file.pdf"
```

---

## Common Issues & Solutions

| Issue | Solution |
|-------|----------|
| `DATABASE_URL` parsing fails | Ensure format: `postgresql://user:pass@host:port/db` |
| Bucket doesn't exist | Create in Supabase UI or use `createBucket()` function |
| Can't upload files | Check SERVICE_ROLE_KEY and bucket permissions |
| Migrations fail | Run `npm run db:rollback` then `npm run db:migrate` |
| Auth fails | Verify SUPABASE_URL and ANON_KEY match your project |

---

## Performance Tips

1. **Batch uploads**: Upload multiple files in parallel using `Promise.all()`
2. **Resize images**: Use Supabase Image Transformation for thumbnails
3. **Cache files**: Use browser cache headers with Storage URLs
4. **Monitor usage**: Check Supabase dashboard for quota/performance

---

## Next: Gradual Migration

- **Phase 1**: Keep existing JWT auth + use Supabase for DB only ✅ (Recommended)
- **Phase 2**: Migrate file uploads to Supabase Storage
- **Phase 3**: Optional - Switch to Supabase Auth for user management
