# Document Separation Test Checklist

## Setup Complete ✅
- SQL migration run in Supabase
- `resource_category` column exists with values
- Backend filtering logic in place
- Frontend sending correct parameters
- Debug logging added

## Step-by-Step Test

### 1. Clear Browser Cache & Logs
- Open DevTools (F12)
- Go to Console tab
- Clear the console
- Hard refresh: Ctrl+Shift+R

### 2. Test Research Paper Upload
- Go to `/repository-upload`
- Upload a PDF with title "TEST_RESEARCH_01"
- **Check backend terminal** for log: `[uploadFile] Created document X with resource_category='research-paper'`
- **Check browser console** for upload success
- Note the document ID

### 3. Test Academic Resource Upload
- Go to `/library-upload`
- Upload a PDF with title "TEST_LIBRARY_01"
- Select any resource type from dropdown (e.g., "Lab Report")
- **Check backend terminal** for log: `[uploadFile] Created document Y with resource_category='textbook'`
- **Check browser console** for upload success
- Note the document ID

### 4. Check Research Moderation Queue
- Go to `/moderation-queue`
- **Check browser console** for:
  - `🔍 ModerationQueue: Fetching from /documents/pending?resourceCategory=research-paper`
  - `📋 ModerationQueue response:` showing items
- **Verify:**
  - Only TEST_RESEARCH_01 appears
  - TEST_LIBRARY_01 does NOT appear
- **Check backend terminal** for log: `[getPendingDocuments] Found X documents with resource_category='research-paper'`

### 5. Check Library Moderation Queue
- Go to `/library-moderation-queue`
- **Check browser console** for:
  - `🔍 LibraryModeration: Fetching from /documents/pending?resourceCategory=textbook`
  - `📋 LibraryModeration response:` showing items
- **Verify:**
  - Only TEST_LIBRARY_01 appears
  - TEST_RESEARCH_01 does NOT appear
- **Check backend terminal** for log: `[getPendingDocuments] Found X documents with resource_category='textbook'`

### 6. Check Admin Dashboard
- Go to `/admin`
- Should show:
  - "Pending Approvals" badge
  - "X research · Y library" breakdown
- Both numbers should be > 0 if you uploaded both types

## Expected Results

✅ Research papers should ONLY appear in `/moderation-queue`
✅ Academic resources should ONLY appear in `/library-moderation-queue`
✅ No mixing between sections
✅ Resource type should display in both moderation pages
✅ Backend logs should show filtering is working

## If Tests Fail

### If everything appears in research queue:
- Check backend logs for `resource_category='textbook'` being saved
- Verify Supabase column exists: SELECT * FROM documents LIMIT 1;
- Check if resourceCategory parameter is being sent (look at Network tab)

### If nothing appears in either queue:
- Check if documents were created (go to Supabase SQL Editor)
- Verify documents have state='pending'
- Check backend error logs

### If type field doesn't display:
- Verify it's being returned in API response
- Check if the field is NULL in database
- Make sure backend is including it in SELECT

## Debug Commands

Run in Supabase SQL Editor:

```sql
-- Check resource_category values
SELECT id, title, type, resource_category, state FROM documents WHERE state='pending';

-- Check if textbook documents exist
SELECT COUNT(*) FROM documents WHERE resource_category='textbook' AND state='pending';

-- Check if research documents exist
SELECT COUNT(*) FROM documents WHERE resource_category='research-paper' AND state='pending';
```

## Browser Console Quick Copy

After running tests, copy this from console to check raw data:
```javascript
// In any moderation queue page:
console.log('Pending docs:', pendingDocs);
console.log('Pending resources:', pendingResources);
```
