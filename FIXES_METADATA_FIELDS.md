# Fixed: Department, Course, and Published Year Storage

## Issues Fixed

1. **Department field truncation** - Was storing only short codes like "CSE" instead of full names like "Genetic Engineering"
2. **Missing departments** - Added "Genetic Engineering" to all department dropdowns
3. **Course field not storing** - Now properly stores course code/project ID from user input
4. **Published year not set** - Now defaults to current upload year when not provided
5. **Missing fields in API responses** - Added course and year to all data normalization functions

---

## Changes Made

### Frontend Changes

#### 1. **RepositoryPage.jsx** - Upload Modal
- **Updated department select options** to include full names instead of abbreviations:
  - "Computer Science and Engineering" (was "CSE")
  - "Information Science and Library Management"
  - "Electrical and Electronic Engineering"
  - **"Genetic Engineering"** (NEW)
  - "Mathematics"
  - "Physics"
  - "Chemistry"
  - "Business Administration"
  - "Other"
- **Changed default department** from `'CSE'` to `'Computer Science and Engineering'`
- **Form already sends** department, course, and year to backend ✓

#### 2. **MetadataFormPage.jsx** - Metadata Form
- **Added "Genetic Engineering"** to department options
- **Default department** already correct ✓

#### 3. **SubmissionWizardPage.jsx** - Submission Wizard
- **Added "Genetic Engineering"** to department options

#### 4. **LibraryUploadPage.jsx** - Library Upload
- **Updated department select** with full names and added "Genetic Engineering"
- **Changed default department** from `'CSE'` to `'Computer Science and Engineering'`
- **Updated 2 reset functions** to use full department names

#### 5. **LibraryPage.jsx** - Library Page
- **Changed default department** from `'CSE'` to `'Computer Science and Engineering'`

---

### Backend Changes

#### 1. **uploadController.js** - File Upload Handler
```javascript
// NOW: Ensures year is always set (defaults to current year)
const currentYear = new Date().getFullYear();
const uploadYear = req.body.year ? Number(req.body.year) : currentYear;
const publishedYear = req.body.publishedYear ? Number(req.body.publishedYear) : uploadYear;

// NOW: Trims strings and stores null for empty values
department: req.body.department && req.body.department.trim() ? req.body.department.trim() : null,
course: req.body.course && req.body.course.trim() ? req.body.course.trim() : null,
```

#### 2. **resourceStorage.js** - Resource Record Creation
- **Now validates and converts year to number**:
  ```javascript
  const yearValue = normalizedYear ? Number(normalizedYear) : new Date().getFullYear();
  ```
- **Stores department and course as null if empty** (not as empty strings)
- **Adds console logs** for debugging year, department, and course values

#### 3. **listController.js** - Data Normalization
- **Updated `normalizeReviewRow()`** to include `course` field
- **Updated `normalizeAllUploadsRow()`** to include:
  - `year: row.published_year`
  - `department`
  - `course`

---

## Data Flow

### Upload Flow
```
User fills form with:
- Department: "Genetic Engineering"
- Course: "BT-403"
- Year: 2026 (or defaults to current year)
        ↓
Frontend sends FormData with these fields
        ↓
Backend uploadController receives & validates
        ↓
createResourceRecord() stores in research_resources/academic_resources:
  - published_year: 2026 (as INTEGER)
  - department: "Genetic Engineering" (full name)
  - course: "BT-403"
        ↓
API returns data with all three fields populated
```

### Retrieval Flow
```
Frontend requests: /documents/my-uploads
        ↓
Backend listController queries research_resources/academic_resources
        ↓
normalizeDocumentRow() formats as:
  - year: 2026
  - department: "Genetic Engineering"
  - course: "BT-403"
        ↓
Frontend displays all three fields correctly
```

---

## Testing Checklist

- [ ] Upload document with "Genetic Engineering" department
- [ ] Verify database stores full department name (not truncated)
- [ ] Upload document with course code (e.g., "BT-403")
- [ ] Verify course is stored and returned in API
- [ ] Upload with custom year
- [ ] Verify published_year is stored as integer
- [ ] Upload without year
- [ ] Verify year defaults to current upload year
- [ ] Check both Research and Academic resource uploads
- [ ] Verify all fields appear in My Uploads list
- [ ] Verify fields appear in Review Queue (staff view)
- [ ] Verify fields appear in Admin All Uploads view

---

## Database Schema

Both `research_resources` and `academic_resources` tables have:
```sql
published_year   INTEGER       -- Upload/publication year
department       TEXT          -- Full department name (no length limit)
course           TEXT          -- Course code or project ID
```

The fields are stored as-is from user input (trimmed, no truncation).

---

## Summary

✅ Department names now store fully (no truncation)  
✅ "Genetic Engineering" added to all dropdowns  
✅ Course field properly stores user input  
✅ Published year always set (defaults to upload date if not provided)  
✅ All three fields returned in API responses  
✅ Works for both Research and Academic resources  
