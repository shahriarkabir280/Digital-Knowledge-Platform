# Fix: Academic Resources Tags, Department, Course Not Storing in Supabase

## Issues Found

### 1. **Department Field Mismatch (Frontend)**
**Problem:** Initial state had `department: 'CSE'` but the select dropdown only had full department names like `"Computer Science and Engineering"`. This mismatch meant the initial value didn't match any dropdown option.

**Location:** `frontend/src/pages/RepositoryPage.jsx` line 65

**Fix:** Changed initial department value from `'CSE'` to `'Computer Science and Engineering'` and course from `'N/A'` to empty string `''`.

### 2. **FormData Not Always Appending Department/Course (Frontend)**
**Problem:** The `uploadDocument()` function in `documents.js` only appended department and course if they were truthy. This caused issues when fields had empty values or when the form validation needed them to be explicitly sent.

**Location:** `frontend/src/services/api/documents.js` lines 67-73

**Fix:** Now always appending department and course to FormData, even if empty, with fallback to empty string:
```javascript
// Always append department (can be empty string, backend will handle it)
formData.append('department', metadata.department || '')

// Always append course (can be empty string, backend will handle it)
formData.append('course', metadata.course || '')
```

### 3. **Enhanced Logging (Backend)**
**Problem:** It was hard to debug whether department and course values were reaching the backend.

**Location:** `backend/src/modules/documents/uploadController.js` line 226-242

**Fix:** Added detailed logging to show exactly what values are being processed:
```javascript
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
```

## How the Data Flows

1. **Frontend Form** → User selects department and enters course
2. **Form Submission** → `uploadDocument()` converts form data to FormData with:
   - `keywords` (from tags, converted to JSON array)
   - `author`, `department`, `course`
   - All other metadata fields
3. **Backend Upload Handler** → `POST /api/repository/upload`
   - Parses FormData fields via multer into `req.body`
   - Logs all incoming values for debugging
   - Validates and normalizes the data
4. **Resource Storage** → `createResourceRecord()` in resourceStorage.js
   - Normalizes strings (trim whitespace)
   - Converts keywords to JSON array
   - Stores in appropriate table (research_resources or academic_resources)
5. **Database** → Supabase
   - Columns: `department` (TEXT), `course` (TEXT), `keywords` (TEXT as JSON)
   - All fields properly indexed

## Testing the Fix

1. **Upload a new academic resource** with:
   - Department: Select any department from dropdown
   - Course: Enter a course code (e.g., "CS301")
   - Tags: Enter comma-separated tags (e.g., "machine-learning, ai, neural-networks")

2. **Check Supabase Console:**
   - Navigate to `academic_resources` or `research_resources` table
   - Verify the new record has:
     - `department` field populated
     - `course` field populated
     - `keywords` field with JSON array of tags

3. **Check Server Logs:**
   - Look for the new logging statements showing what values were processed
   - Should show the raw values, trimmed values, and storage decision

## Database Schema (Verified Correct)

Both `research_resources` and `academic_resources` tables have these relevant columns:
```sql
- department TEXT
- course TEXT
- keywords TEXT  -- stored as JSON string e.g. '["tag1","tag2"]'
```

## Files Modified

1. `frontend/src/pages/RepositoryPage.jsx`
   - Line 65: Fixed initial state for department and course

2. `frontend/src/services/api/documents.js`
   - Lines 67-73: Now always append department and course to FormData

3. `backend/src/modules/documents/uploadController.js`
   - Line 126: Added full req.body logging for debugging
   - Lines 226-242: Added detailed department/course processing logs

## Next Steps for Debugging

If tags/department/course still aren't storing after this fix:

1. Check server logs (when uploading a resource):
   - Look for `[uploadController] FULL req.body:` to see all form data received
   - Look for `[uploadController] Processing department:` and `course:` logs

2. If `req.body.department` is `undefined`:
   - This means multer isn't parsing the FormData fields
   - Check if there's a body-parser middleware issue
   - Verify multer configuration is correct

3. If values are received but not stored:
   - Check Supabase table for the actual data
   - Verify the INSERT query in resourceStorage.js

4. If keywords are empty:
   - Verify the `keywords`/`tags` FormData append is working
   - Check the parsing logic for JSON vs comma-separated

## Related Code Files

- Database schema: `backend/scripts/create_resource_tables.sql`
- Resource storage logic: `backend/src/modules/documents/resourceStorage.js`
- Metadata handling: `backend/src/modules/documents/metadataValidator.js`
- Metadata controller: `backend/src/modules/documents/metadataController.js`
