# Implementation Checklist - Department, Course, Year Fix

## Pre-Deployment Tasks

### Code Review
- [ ] Review all 8 files modified
- [ ] Check for syntax errors
- [ ] Verify no unintended changes
- [ ] Run linter on modified files
- [ ] Check TypeScript/JSDoc comments (if applicable)

### Testing - Manual
- [ ] Test RepositoryPage upload with Genetic Engineering
  - [ ] Upload file
  - [ ] Select "Genetic Engineering" from dropdown
  - [ ] Enter course code
  - [ ] Submit form
  - [ ] Check success message
- [ ] Test MetadataFormPage with new department
  - [ ] Create metadata with Genetic Engineering
  - [ ] Verify all departments appear
- [ ] Test SubmissionWizardPage
  - [ ] Go through all 4 steps
  - [ ] Verify Genetic Engineering appears
- [ ] Test LibraryUploadPage
  - [ ] Upload document
  - [ ] Verify department dropdown
  - [ ] Test Clear button
- [ ] Test LibraryPage
  - [ ] Upload resource
  - [ ] Verify department defaults correctly

### Testing - Database
- [ ] Check research_resources table
  ```sql
  SELECT id, title, department, course, published_year 
  FROM research_resources 
  ORDER BY created_at DESC LIMIT 5;
  ```
- [ ] Check academic_resources table
  ```sql
  SELECT id, title, department, course, published_year 
  FROM academic_resources 
  ORDER BY created_at DESC LIMIT 5;
  ```
- [ ] Verify no departments are truncated
  ```sql
  SELECT DISTINCT department FROM research_resources;
  SELECT DISTINCT department FROM academic_resources;
  ```
- [ ] Verify "Genetic Engineering" exists
  ```sql
  SELECT COUNT(*) FROM research_resources 
  WHERE department = 'Genetic Engineering';
  ```
- [ ] Verify year is INTEGER (not NULL)
  ```sql
  SELECT published_year, COUNT(*) 
  FROM research_resources 
  GROUP BY published_year;
  ```

### Testing - API
- [ ] Test `/documents/my-uploads` endpoint
  - [ ] GET request with auth token
  - [ ] Verify response includes year, department, course
  - [ ] Verify department is full name
- [ ] Test `/documents/review-queue` (staff view)
  - [ ] Verify all fields present
- [ ] Test `/documents/all-uploads` (admin view)
  - [ ] Verify all fields present
- [ ] Test error handling
  - [ ] Upload with invalid department
  - [ ] Upload with very long course name

### Testing - UI Display
- [ ] Check My Uploads page
  - [ ] Verify department displays fully
  - [ ] Verify course code displays
  - [ ] Verify year displays
- [ ] Check Repository page
  - [ ] Verify published docs show all fields
- [ ] Check Library page
  - [ ] Verify shared resources show all fields
- [ ] Check Review Queue (staff only)
  - [ ] Verify all fields visible

### Testing - Edge Cases
- [ ] Upload with empty course (should work)
- [ ] Upload with spaces in department (should trim)
- [ ] Upload with special characters in course
- [ ] Upload with very long department name (>100 chars)
- [ ] Upload with past year (e.g., 1990)
- [ ] Upload with future year (e.g., 2099)
- [ ] Upload with no year provided (should default)

---

## Deployment Steps

### 1. Backend Deployment
```bash
# Step 1: Backup database (if applicable)
pg_dump -Fc dkp_db > backup_$(date +%Y%m%d_%H%M%S).sql

# Step 2: Deploy backend changes
cd backend
git add src/modules/documents/uploadController.js
git add src/modules/documents/resourceStorage.js
git add src/modules/documents/listController.js
git commit -m "Fix: Store published_year, course, department fields correctly"
git push

# Step 3: Restart backend server
npm run dev  # or your production restart command
```

### 2. Frontend Deployment
```bash
# Step 1: Deploy frontend changes
cd frontend
git add src/pages/RepositoryPage.jsx
git add src/pages/MetadataFormPage.jsx
git add src/pages/SubmissionWizardPage.jsx
git add src/pages/LibraryUploadPage.jsx
git add src/pages/LibraryPage.jsx
git commit -m "Fix: Update department options to include full names and Genetic Engineering"
git push

# Step 2: Rebuild frontend
npm run build
npm run deploy  # or your deployment command
```

### 3. Post-Deployment Verification
```bash
# Verify backend is running
curl http://localhost:3000/api/documents/my-uploads \
  -H "Authorization: Bearer {token}"

# Check database
psql dkp_db -c "SELECT COUNT(*) FROM research_resources;"
psql dkp_db -c "SELECT COUNT(*) FROM academic_resources;"

# Test frontend
# - Navigate to Repository page
# - Try uploading document
# - Verify department dropdown works
```

---

## Rollback Plan

### If Issues Found

#### Option 1: Quick Rollback (within 1 hour)
```bash
# Revert to previous commit
git revert HEAD --no-edit
git push

# Restart services
npm run dev  # Backend
npm run build && npm run deploy  # Frontend
```

#### Option 2: Restore from Backup (if data corruption)
```bash
# Restore database
pg_restore -Fc -d dkp_db backup_YYYYMMDD_HHMMSS.sql
```

#### Option 3: Manual Fix
If only frontend issue:
- Update form values in RepositoryPage.jsx
- Rebuild and redeploy
- No backend downtime

If only backend issue:
- Revert uploadController.js, resourceStorage.js, listController.js
- Restart backend
- No frontend downtime needed

---

## Monitoring After Deployment

### First Hour
- [ ] Monitor backend logs for errors
- [ ] Monitor database for connection issues
- [ ] Check file upload success rate
- [ ] Test upload in all 5 forms

### First Day
- [ ] Monitor for any error spikes
- [ ] Check API response times
- [ ] Verify all uploaded documents have year/dept/course
- [ ] Check Review Queue shows fields correctly

### First Week
- [ ] Verify no data corruption
- [ ] Monitor storage usage
- [ ] Check user feedback for issues
- [ ] Run full test suite

### Metrics to Track
- Upload success rate (should be ~100%)
- API response time (should be <200ms)
- Database query time (should be <100ms)
- Error rate (should be ~0%)

---

## Sign-Off

### Developer
- [ ] Code reviewed by: ________________
- [ ] Tests passed on: ________________
- [ ] Date: ________________

### QA
- [ ] Testing completed on: ________________
- [ ] Test results: ✅ PASS / ❌ FAIL
- [ ] QA sign-off: ________________
- [ ] Date: ________________

### DevOps
- [ ] Deployment completed on: ________________
- [ ] Post-deployment verification: ✅ PASS / ❌ FAIL
- [ ] DevOps sign-off: ________________
- [ ] Date: ________________

### Product
- [ ] Feature approved for production: ✅ YES / ❌ NO
- [ ] Product owner: ________________
- [ ] Date: ________________

---

## Post-Deployment Report Template

```markdown
# Deployment Report - Published Year, Course, Department Fix

**Deployment Date:** YYYY-MM-DD HH:MM
**Deployed By:** [Name]
**Environment:** [Development/Staging/Production]

## Changes Deployed
- uploadController.js
- resourceStorage.js
- listController.js
- RepositoryPage.jsx
- MetadataFormPage.jsx
- SubmissionWizardPage.jsx
- LibraryUploadPage.jsx
- LibraryPage.jsx

## Pre-Deployment Checklist
- [x] All tests passing
- [x] Code review completed
- [x] Database backup taken
- [x] No merge conflicts
- [x] Documentation updated

## Deployment Process
1. Backend deployed at [TIME]
2. Frontend deployed at [TIME]
3. Post-deployment verification at [TIME]

## Issues Encountered
- None / [Describe any issues]

## Verification Results
- Backend API: ✅ Working
- Frontend Forms: ✅ Working
- Database: ✅ Data stored correctly
- API Responses: ✅ All fields present

## Performance Impact
- API response time: [X]ms (target: <200ms)
- Database query time: [X]ms (target: <100ms)
- Upload success rate: [X]% (target: 99%+)

## Rollback Status
- ✅ Ready (can rollback within X minutes)
- Rollback procedure documented in DETAILED_CHANGES.md

## Next Steps
1. Monitor for 24 hours
2. Check user feedback
3. Run automated tests daily
4. Archive deployment logs

## Sign-off
- Deployed By: __________ Date: __________
- Verified By: __________ Date: __________
```

---

## Success Criteria (Final Verification)

Before marking deployment as complete, verify:

```
✅ All 5 forms display "Genetic Engineering" option
✅ Department dropdown shows 9 full options (not 4 short codes)
✅ Database contains full department names (no truncation)
✅ Course field stores user input correctly
✅ Published year is set on all uploads
✅ Year defaults to current year if not provided
✅ API returns year, department, course in responses
✅ Works for both Research and Academic resources
✅ No errors in backend logs
✅ No errors in browser console
✅ Database backups taken
✅ All tests passing
✅ Users report no issues
```

---

## Appendix: Quick Reference

### Files Modified
```
frontend/src/pages/RepositoryPage.jsx
frontend/src/pages/MetadataFormPage.jsx
frontend/src/pages/SubmissionWizardPage.jsx
frontend/src/pages/LibraryUploadPage.jsx
frontend/src/pages/LibraryPage.jsx
backend/src/modules/documents/uploadController.js
backend/src/modules/documents/resourceStorage.js
backend/src/modules/documents/listController.js
```

### Department Options (9 Total)
1. Computer Science and Engineering
2. Information Science and Library Management
3. Electrical and Electronic Engineering
4. **Genetic Engineering** ← NEW
5. Mathematics
6. Physics
7. Chemistry
8. Business Administration
9. Other

### Database Schema (No Changes)
```sql
research_resources:
  published_year INTEGER
  department TEXT
  course TEXT

academic_resources:
  published_year INTEGER
  department TEXT
  course TEXT
```

### Test Users Needed
- Admin (for Review Queue access)
- Staff/Reviewer (for all-uploads access)
- Regular Member (for my-uploads)

### Backup Commands
```bash
# PostgreSQL
pg_dump -Fc dkp_db > backup.sql
pg_restore -Fc -d dkp_db backup.sql

# MongoDB (if used)
mongodump --db dkp_db --archive=backup.archive
mongorestore --archive=backup.archive
```

---

**Document Version:** 1.0
**Last Updated:** 2026-01-XX
**Status:** Ready for Deployment
