# Task 2.5 Testing Guide - Upload Progress UI

## Quick Start

### Prerequisites
- Backend running: `http://localhost:3001`
- Frontend running: `http://localhost:5174`
- PostgreSQL: Running (Docker container)

### Test User Credentials
```
Email: test@cs.du.ac.bd
Password: TestPassword123!
```

### Step-by-Step Test

#### 1. Login
1. Open http://localhost:5174/login
2. Enter test user credentials
3. Click "Login"
4. Should redirect to dashboard

#### 2. Navigate to Upload
1. From dashboard, click "Upload Document" in sidebar
2. Or navigate to http://localhost:5174/upload-document
3. Should see upload form with:
   - Document Title input (required)
   - Description textarea (optional)
   - Drag-drop zone
   - Upload button

#### 3. Test Drag-Drop
Option A - Click to Browse:
1. Click anywhere in the drag-drop zone
2. File dialog opens
3. Select a PDF, image, or document file
4. File appears in "Files to Upload" list

Option B - Drag Files:
1. From Finder/File Explorer, drag file(s) onto the zone
2. File(s) appear in "Files to Upload" list

#### 4. Fill Metadata
1. Enter title: "Test Research Paper"
2. Optionally add description
3. Click "Upload Files"

#### 5. Watch Progress
- Individual progress bars appear for each file
- Bar animates from 0-100%
- Percentage number updates in real-time
- Status changes from "Uploading..." → "Complete"

#### 6. Handle Results

Success Case:
- Progress bars turn green
- Status shows "Complete"
- Success message appears: "Successfully uploaded 1 file"
- File list clears after 2 seconds

Error Case:
- Progress bar turns red
- Status shows "Failed"
- Error message appears with details
- File remains in list for retry

#### 7. Test File Removal
- While uploading: "Remove" button disabled
- After upload: Click "✕" to remove file from list
- Or click "Clear All" to remove all files

### Edge Cases to Test

1. **No File Selected**
   - Click "Upload Files" without selecting
   - Error: "Please select at least one file"

2. **No Title**
   - Select file but leave title empty
   - Click upload
   - Error: "Please provide a title"

3. **Invalid File Type**
   - Try to upload .exe or other unsupported type
   - Should be rejected by backend
   - Error message appears

4. **Large File**
   - Try file > 500MB
   - Should be rejected with error
   - File remains selected for retry

5. **Multiple Files**
   - Select 3-5 files at once
   - Each shows individual progress bar
   - Can see which ones succeed/fail

6. **Network Interruption**
   - Start upload then disconnect network
   - Error message appears
   - File marked as failed
   - Can retry

### Expected Behavior

#### DragDropZone
- Hover: Border turns accent color, background lightens
- Dragging: Inset shadow appears, more prominent styling
- File selected: Disappears, file appears in list

#### Progress Bar
- Starts at 0%
- Animates smoothly to 100%
- Color: Gradient accent → accent-strong
- Status text: "Uploading..." during upload

#### Form
- Title field: Text input, required
- Description: Optional textarea
- Disable all inputs during upload
- Enable after upload completes

#### File List
- Shows filename
- Shows file size in MB
- Shows individual progress bar
- Remove button (✕) on the right

### Debugging Tips

**If upload fails:**
1. Check Network tab in DevTools
2. Look for 401 (auth) or 400/413 (file) errors
3. Check Browser Console for JS errors
4. Verify backend is running and healthy

**If styles look wrong:**
1. Hard refresh page (Cmd+Shift+R on Mac)
2. Check that CSS files are loaded
3. Verify color variables in theme/colors.css

**If progress doesn't update:**
1. Check XMLHttpRequest in Network tab
2. Verify upload event listeners are firing
3. Check browser DevTools console for errors

### Success Indicators

✅ File appears in list after selection
✅ Progress bar animates during upload
✅ Percentage updates in real-time
✅ Success message appears on completion
✅ File stored in backend/uploads/documents/
✅ Document record created in database
✅ Metadata record created with author

### API Response Format

Expected success response (201 Created):
```json
{
  "success": true,
  "data": {
    "document": {
      "id": 21,
      "title": "Test Research Paper",
      "type": "research-paper",
      "format": "pdf",
      "state": "draft",
      "accessTier": "REGISTERED",
      "uploadedBy": 131,
      "uploadedAt": "2026-04-15T17:00:00.000Z"
    },
    "file": {
      "originalFilename": "test.pdf",
      "filename": "test_1776272400000_abc123.pdf",
      "path": "documents/test_1776272400000_abc123.pdf",
      "size": 102400,
      "sizeFormatted": "100.00 KB",
      "mimetype": "application/pdf"
    }
  },
  "message": "File uploaded successfully"
}
```

### Performance Notes

- Progress updates: ~1/second during upload
- Large files (100+ MB): Progress visible, smooth animation
- Multiple files: Sequential upload, can handle 5+ files
- Memory: Stream-based, not limited by RAM

### Mobile Testing

- Responsive design adapts to mobile screens
- Touch-friendly drag zones and buttons
- Works on 320px+ width screens
- Buttons stack vertically on small screens
- File list adapts to narrow views
