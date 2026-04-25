import { useState } from 'react'
import './LibrarySection.css'

const ACCESS_OPTIONS = ['public', 'private', 'restricted']

export default function LibraryUploadPage() {
  const [access, setAccess] = useState('restricted')

  return (
    <section className="library-page">
      <header className="library-panel">
        <p className="library-kicker">Faculty and Staff Upload</p>
        <h2 style={{ margin: '6px 0', color: '#173042' }}>Upload resource with metadata and access control</h2>
        <p style={{ color: '#355064' }}>
          Drag and drop files, define visibility, add tags, and submit for moderation or direct publishing.
        </p>
      </header>

      <section className="library-panel" style={{ display: 'grid', gap: '12px' }}>
        <div className="library-dropzone">
          <p style={{ margin: 0, fontWeight: 700 }}>Drop PDF, DOC, PPT files or video links here</p>
          <p style={{ margin: '8px 0 0', fontSize: '0.9rem' }}>Supports bulk uploads and auto metadata extraction.</p>
        </div>

        <div className="library-form-grid">
          <div className="library-form-field">
            <label htmlFor="upload-title">Title</label>
            <input id="upload-title" className="library-input" placeholder="Example: Software Architecture Handbook" />
          </div>
          <div className="library-form-field">
            <label htmlFor="upload-author">Author/Uploader</label>
            <input id="upload-author" className="library-input" placeholder="Name" />
          </div>
          <div className="library-form-field">
            <label htmlFor="upload-course">Course</label>
            <input id="upload-course" className="library-input" placeholder="CSE-410" />
          </div>
          <div className="library-form-field">
            <label htmlFor="upload-department">Department</label>
            <input id="upload-department" className="library-input" placeholder="CSE" />
          </div>
          <div className="library-form-field">
            <label htmlFor="upload-year">Year</label>
            <input id="upload-year" className="library-input" placeholder="2026" />
          </div>
          <div className="library-form-field">
            <label htmlFor="upload-type">File Type</label>
            <select id="upload-type" className="library-select">
              <option>PDF</option>
              <option>DOC</option>
              <option>PPT</option>
              <option>Video</option>
              <option>Notes</option>
            </select>
          </div>
        </div>

        <div className="library-form-field">
          <label htmlFor="upload-tags">Tags</label>
          <input id="upload-tags" className="library-input" placeholder="ai, security, thesis" />
        </div>

        <div className="library-form-field">
          <label htmlFor="upload-description">Description</label>
          <textarea id="upload-description" className="library-textarea" placeholder="Short summary for discovery and preview." />
        </div>

        <div className="library-form-field">
          <label htmlFor="upload-access">Access Control</label>
          <select
            id="upload-access"
            className="library-select"
            value={access}
            onChange={(event) => setAccess(event.target.value)}
          >
            {ACCESS_OPTIONS.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </div>

        <div className="library-card-actions">
          <button type="button" className="library-btn library-btn-primary">
            Submit for Review
          </button>
          <button type="button" className="library-btn library-btn-ghost">
            Save Draft
          </button>
        </div>
      </section>
    </section>
  )
}
