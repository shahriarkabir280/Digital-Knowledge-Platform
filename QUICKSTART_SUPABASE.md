# Quick Start: Supabase Migration Checklist

Complete these steps to move from Docker to Supabase.

---

## ✅ Phase 1: Setup Supabase (15 minutes)

- [ ] Go to https://supabase.com and create account
- [ ] Create new project (choose region closest to you)
- [ ] Save the database password securely
- [ ] Wait for project to initialize
- [ ] Go to Settings → Database and copy **Connection String** (starts with `postgresql://`)
- [ ] Go to Settings → API and note down:
  - [ ] **SUPABASE_URL** (https://...supabase.co)
  - [ ] **SUPABASE_ANON_KEY** (public key)
  - [ ] **SUPABASE_SERVICE_ROLE_KEY** (secret key - don't share)

---

## ✅ Phase 2: Update Backend (10 minutes)

### 2.1 Create `.env` file (backend)

```bash
cd backend
cat > .env << EOF
BACKEND_PORT=3000
DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@your-project.supabase.co:5432/postgres

SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here

JWT_SECRET=your_jwt_secret_here
JWT_EXPIRES_IN=30m
JWT_REFRESH_SECRET=your_refresh_secret
JWT_REFRESH_EXPIRES_IN=7d

UPLOAD_MAX_SIZE_MB=500
UPLOAD_DIR=./uploads
UPLOAD_ALLOWED_EXTENSIONS=pdf,docx,pptx,mp3,mp4,jpg,jpeg,png
UPLOAD_STRICT_MIME_VALIDATION=true
UPLOAD_TEMP_CLEANUP_HOURS=24
EOF
```

Replace placeholders with actual Supabase credentials!

### 2.2 Install dependencies

```bash
npm install
# Should install @supabase/supabase-js
```

### 2.3 Run migrations

```bash
npm run db:migrate
```

This creates all tables in Supabase (should complete in 5-10 seconds).

### 2.4 Test connection

```bash
npm run db:smoke
```

Should see: "✅ Database connection successful"

---

## ✅ Phase 3: Update Frontend (5 minutes)

### 3.1 Create `.env` file (frontend)

```bash
cd ../frontend
cat > .env << EOF
VITE_API_BASE_URL=http://localhost:3000/api
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key_here
EOF
```

### 3.2 Install dependencies

```bash
npm install
# Should install @supabase/supabase-js for frontend
```

---

## ✅ Phase 4: Start & Test (5 minutes)

### 4.1 Start backend

```bash
cd ../backend
npm run dev
```

Should see: "✅ Supabase services initialized"

### 4.2 In another terminal, start frontend

```bash
cd frontend
npm run dev
```

Should see Vite dev server running on `http://localhost:5173`

### 4.3 Test basic operations

- [ ] Visit http://localhost:5173
- [ ] Test login
- [ ] Test upload document
- [ ] Test document listing

---

## 🎉 Success Indicators

- ✅ Backend starts without Docker
- ✅ Frontend connects to backend
- ✅ Database operations work (users, documents, etc.)
- ✅ File uploads work
- ✅ Login/auth works

---

## 📋 Optional: File Upload Migration

To move existing files to Supabase Storage:

```bash
cd backend
node scripts/migrate-to-supabase.js
```

This will upload all local files to Supabase Storage and update your database.

---

## 🐛 Troubleshooting

### Backend won't start: "DATABASE_URL parsing error"

**Fix:** Check connection string format:
```
postgresql://postgres:PASSWORD@PROJECT.supabase.co:5432/postgres
```

### Migrations fail: "SSL error"

**Fix:** Supabase requires SSL by default. Connection string should work automatically.

### Can't upload files: "Storage error"

**Fix:** You need to create buckets manually:
1. Go to Supabase Dashboard → Storage
2. Create bucket: `documents`
3. Create bucket: `media`

Or run this SQL in Supabase SQL Editor:
```sql
INSERT INTO storage.buckets (id, name, public) VALUES
  ('documents', 'documents', false),
  ('media', 'media', false);
```

### Frontend can't connect to Supabase

**Fix:** Check VITE variables:
- `VITE_SUPABASE_URL` - must be https://...supabase.co
- `VITE_SUPABASE_ANON_KEY` - from Settings → API
- Restart `npm run dev` after changing .env

---

## 📚 Learn More

- Full setup guide: [SUPABASE_SETUP.md](./SUPABASE_SETUP.md)
- Integration examples: [SUPABASE_INTEGRATION.md](./SUPABASE_INTEGRATION.md)
- Supabase docs: https://supabase.com/docs

---

## ⏮️ Rollback (if needed)

To go back to Docker:

```bash
# Restore docker-compose
git checkout docker-compose.yml

# Update .env back to local DB
# Update .env and point to localhost:5432

# Start docker again
docker-compose up -d

# Knex still works with local database
npm run dev
```

All your Supabase data can be exported first if needed.

---

## ✨ You're Done!

No more Docker, no more local PostgreSQL. Everything is in Supabase now!

Next steps:
- Deploy frontend to Vercel/Netlify
- Deploy backend to Railway/Heroku
- Use Supabase backups for data safety
