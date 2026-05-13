# Supabase Migration Guide

Complete guide to migrate from Docker + Local PostgreSQL to Supabase.

## Prerequisites

- Node.js 18+
- Supabase account (free tier available at https://supabase.com)

---

## Step 1: Create Supabase Project

1. Go to [supabase.com](https://supabase.com) and sign up/login
2. Click **"New Project"**
3. Fill in project details:
   - **Name**: `digital-knowledge-platform`
   - **Database Password**: Create a strong password (save it!)
   - **Region**: Choose closest to your location
   - **Plan**: Free tier is fine for development

4. Wait for project to initialize (2-3 minutes)

---

## Step 2: Get Connection Credentials

1. Go to **Project Settings** → **Database**
2. Find **Connection String** section
3. Copy the connection string (starts with `postgresql://`)
4. You'll also need:
   - **SUPABASE_URL** (from Settings → API)
   - **SUPABASE_ANON_KEY** (from Settings → API)
   - **SUPABASE_SERVICE_ROLE_KEY** (from Settings → API) - keep this secret!

---

## Step 3: Update Backend Environment

1. **Remove Docker:**
   ```bash
   # You don't need docker-compose anymore
   # Delete or backup: docker-compose.yml
   rm docker-compose.yml
   ```

2. **Update `.env`:**
   ```bash
   # Add these variables
   DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@your-project.supabase.co:5432/postgres
   
   SUPABASE_URL=https://your-project.supabase.co
   SUPABASE_ANON_KEY=your_anon_key_here
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
   ```

3. **Keep existing auth variables (optional):**
   ```bash
   JWT_SECRET=your_secret_here
   JWT_EXPIRES_IN=30m
   JWT_REFRESH_SECRET=your_refresh_secret
   JWT_REFRESH_EXPIRES_IN=7d
   ```

---

## Step 4: Install Dependencies

```bash
cd backend
npm install
```

New package added: `@supabase/supabase-js`

---

## Step 5: Run Database Migrations

Your existing Knex migrations work with Supabase unchanged!

```bash
cd backend
npm run db:migrate
```

This will:
- Create all tables (users, documents, metadata, loans, etc.)
- Add constraints and relationships
- Set up the schema identical to your local database

---

## Step 6: Create Storage Buckets (Optional)

If using Supabase Storage instead of local file uploads:

```bash
npm run db:seed  # Optional: seed initial data
```

Then initialize storage in your app (see below).

---

## Step 7: Start Backend

```bash
npm run dev
```

The app will connect to Supabase instead of Docker!

---

## Step 8: Update Frontend (Optional - Supabase Auth)

If you want to use Supabase Auth instead of your current JWT system:

### Option A: Keep Existing JWT Auth (Recommended for now)
- No changes needed
- Your backend JWT system continues working
- Simpler migration path

### Option B: Use Supabase Auth
1. Add Supabase client to frontend:
   ```bash
   cd frontend
   npm install @supabase/supabase-js
   ```

2. Create `src/lib/supabase.js`:
   ```javascript
   import { createClient } from '@supabase/supabase-js'
   
   export const supabase = createClient(
     import.meta.env.VITE_SUPABASE_URL,
     import.meta.env.VITE_SUPABASE_ANON_KEY
   )
   ```

3. Create `frontend/.env`:
   ```
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_ANON_KEY=your_anon_key_here
   ```

4. Update auth services to use Supabase (optional)

---

## Using Supabase Storage (Optional)

Replace local file uploads with Supabase Storage:

### 1. Create Buckets in Supabase

```sql
-- Run in Supabase SQL Editor
INSERT INTO storage.buckets (id, name, public) VALUES
  ('documents', 'documents', false),
  ('media', 'media', false);
```

Or use the UI: Storage → Create Bucket

### 2. Update Upload Service

The new `supabaseStorage.js` service handles uploads:

```javascript
const supabaseStorage = require('../services/supabaseStorage');

// Initialize on app start
supabaseStorage.initSupabase();

// Upload file
const result = await supabaseStorage.uploadFile(
  fileBuffer,
  'documents',
  'doc-123/filename.pdf',
  { contentType: 'application/pdf' }
);

console.log(result.url); // Public URL
```

### 3. Update uploadController.js

```javascript
const supabaseStorage = require('../../services/supabaseStorage');

// In your upload handler:
const result = await supabaseStorage.uploadFile(
  file.buffer,
  'documents',
  `${documentId}/${file.originalname}`,
  { contentType: file.mimetype }
);

// Save to database
await db('documents').insert({
  file_path: result.path,
  file_url: result.url,
  // ... other fields
});
```

---

## Using Supabase Auth (Optional)

For admin operations without JWT:

```javascript
const supabaseAuth = require('../services/supabaseAuth');

// Initialize
supabaseAuth.initSupabaseAuth();

// Create user
await supabaseAuth.createUser('user@example.com', 'password123', {
  full_name: 'John Doe',
  role: 'MEMBER'
});

// Update user role
await supabaseAuth.updateUser(userId, {
  user_metadata: { role: 'ADMIN' }
});

// List all users
const { users } = await supabaseAuth.listUsers();
```

---

## Database Management

### Access Database via SQL Editor

1. Go to Supabase Dashboard
2. Click **SQL Editor**
3. Run queries directly:

```sql
SELECT * FROM users;
SELECT * FROM documents WHERE state = 'published';
-- etc.
```

### Backup & Restore

Supabase provides:
- **Daily backups** (free tier: 7-day retention)
- **Point-in-time recovery**
- Manual export via Settings → Backups

### Connection Pooling

Supabase handles connection pooling automatically. Your Knex pool config is optimized for this.

---

## Troubleshooting

### Database Connection Error
```
Error: ECONNREFUSED
```

**Fix:**
- Check `DATABASE_URL` format is correct
- Verify credentials in Supabase dashboard
- Check firewall/network (Supabase uses port 5432)

### Auth Key Errors
```
Error: Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY
```

**Fix:**
- Get keys from Supabase Dashboard → Settings → API
- Add to `.env` file
- Restart backend: `npm run dev`

### Migrations Won't Run
```
Error: relation "users" already exists
```

**Fix:**
```bash
npm run db:rollback  # Go back to previous state
npm run db:migrate   # Re-run migrations
```

### Can't Upload to Storage

**Fix:**
- Ensure buckets exist (check Supabase Storage UI)
- Verify `SUPABASE_SERVICE_ROLE_KEY` is correct
- Check bucket policies allow uploads

---

## Performance Tips

1. **Connection Pooling**: Use Supabase's built-in connection pooling
2. **Indexes**: Supabase creates indexes automatically for PK/FK
3. **Migrations**: Run migrations offline to avoid connection timeouts
4. **Storage**: Use CDN-backed Storage for fast file downloads

---

## Next Steps

- [ ] Create Supabase project
- [ ] Update `.env` with credentials
- [ ] Run `npm install` in backend
- [ ] Run `npm run db:migrate`
- [ ] Start backend with `npm run dev`
- [ ] Test API endpoints
- [ ] Optionally migrate file uploads to Storage
- [ ] Optionally switch frontend to Supabase Auth

---

## Support

- **Supabase Docs**: https://supabase.com/docs
- **Knex.js Docs**: https://knexjs.org
- **PostgreSQL Docs**: https://www.postgresql.org/docs/

---

## Rollback to Docker (if needed)

```bash
# Restore docker-compose.yml from git
git checkout docker-compose.yml

# Update .env back to local settings
# Run docker
docker-compose up -d

# Database will still have data from Supabase
# (can export/import if needed)
```
