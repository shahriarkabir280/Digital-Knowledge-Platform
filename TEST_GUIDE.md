# Testing Guide: Department, Course, and Year Storage

## How to Test the Fixes

### Test Case 1: Upload with "Genetic Engineering" Department

**Steps:**
1. Go to Repository Page → "Submit Research" button
2. Upload a file (PDF, ZIP, etc.)
3. Fill in the form:
   - **Title**: "Genetic Engineering Research Paper"
   - **Author(s)**: "Dr. Ahmed Khan"
   - **Course Code**: "GEN-401" 
   - **Department**: Select "Genetic Engineering"
   - **Type**: "Research Paper"
   - **Tags**: "genetics, dna, research"
   - **Abstract**: "A study on genetic engineering..."
4. Click "Submit Research"

**Expected Result:**
- ✓ Form submits successfully
- ✓ Success modal appears
- ✓ Document shows "pending" state

**Verification:**
1. Go to "My Uploads" page
2. Look at your uploaded document
3. Check that it shows:
   - Department: **"Genetic Engineering"** (NOT truncated)
   - Course: **"GEN-401"**
   - Year: **2026** (current year)

---

### Test Case 2: Upload Academic Resource

**Steps:**
1. Go to Library Page → "Submit Resource" button
2. Upload a PDF
3. Fill form with:
   - **Title**: "Lecture Slides - Advanced Topics"
   - **Author(s)**: "Prof. Sarah"
   - **Department**: "Computer Science and Engineering"
   - **Course**: "CSE-201"
   - **Type**: "Lecture Slides"
4. Submit

**Verification:**
- Check My Uploads
- Department shows full name: "Computer Science and Engineering"
- Course shows: "CSE-201"

---

### Test Case 3: Research vs Academic Resources

**Test Research Resource:**
1. Repository → Submit with resourceCategory "research-paper"
2. Set Department: "Physics"
3. Database should store in `research_resources` table

**Test Academic Resource:**
1. Library → Submit with resourceCategory "textbook"
2. Set Department: "Mathematics"
3. Database should store in `academic_resources` table

**Verify Both:**
- Check database tables directly:
  ```sql
  SELECT id, title, department, course, published_year 
  FROM research_resources LIMIT 1;
  
  SELECT id, title, department, course, published_year 
  FROM academic_resources LIMIT 1;
  ```

---

### Test Case 4: Year Defaults to Upload Year

**When Year is NOT Provided:**
1. Upload form sends current year
2. Year should be: `new Date().getFullYear()` (2026 for 2026)
3. Database stores in `published_year` column

**When Year IS Provided:**
1. User provides a year in form (if form has year field)
2. That year is used instead

---

### Test Case 5: Empty Course Field

**Steps:**
1. Upload a document
2. Leave **Course Code** field empty
3. Submit

**Expected:**
- ✓ Form submits (course is optional)
- ✓ Database stores `NULL` for course
- ✓ API returns `course: null`

---

## Database Verification

### Check Research Resources:
```sql
SELECT 
  id,
  title,
  department,
  course,
  published_year,
  author,
  created_at
FROM research_resources
ORDER BY created_at DESC
LIMIT 5;
```

### Check Academic Resources:
```sql
SELECT 
  id,
  title,
  department,
  course,
  published_year,
  author,
  created_at
FROM academic_resources
ORDER BY created_at DESC
LIMIT 5;
```

### Expected Output:
```
id | title                    | department                  | course   | published_year | author
---|--------------------------|-----------------------------|-----------|----|--------
1  | Genetic Engineering Res. | Genetic Engineering         | GEN-401   | 2026 | Dr. Khan
2  | Lecture Slides          | Computer Science and Eng.   | CSE-201   | 2026 | Prof. Sarah
```

**Key Points:**
- ✓ `department` shows FULL name (not abbreviation)
- ✓ `course` shows user input exactly
- ✓ `published_year` is an INTEGER (not string)

---

## API Response Verification

### Test the API endpoints:

**My Uploads Endpoint:**
```bash
GET /api/documents/my-uploads
Authorization: Bearer {token}
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": 1,
        "title": "Genetic Engineering Research",
        "department": "Genetic Engineering",
        "course": "GEN-401",
        "year": 2026,
        "author": "Dr. Khan",
        ...
      }
    ]
  }
}
```

---

## Common Issues & Solutions

### Issue: Department appears truncated
**Cause:** Old code was storing department as VARCHAR(20)
**Solution:** Check that `research_resources.department` is TEXT (not VARCHAR)
**Fix:** Run migration if needed

### Issue: Course field is NULL when it shouldn't be
**Cause:** Frontend not sending course value
**Solution:** Check browser Network tab in DevTools
**Should see:** `course=GEN-401` in FormData

### Issue: Year shows as 0 or null
**Cause:** Backend not handling year correctly
**Solution:** Check uploadController handles year conversion
**Already fixed:** `const uploadYear = req.body.year ? Number(req.body.year) : currentYear;`

---

## Rollback Plan (if needed)

If there are issues, the changes are minimal and don't affect table structure:

1. **Frontend**: Changes are CSS classes and form values (revert RepositoryPage.jsx)
2. **Backend**: Changes are in data handling (revert uploadController.js, resourceStorage.js, listController.js)
3. **Database**: No schema changes made, all fields already exist

---

## Success Criteria

✅ All departments display in full (no truncation)
✅ "Genetic Engineering" is selectable in all forms
✅ Course field stores user input correctly
✅ Published year always has a value (defaults to upload year)
✅ Works for both Research and Academic resources
✅ API responses include all three fields
✅ Database stores values without modification

---

**Once testing passes, update CHANGES_SUMMARY.md to indicate all fixes are complete.**
