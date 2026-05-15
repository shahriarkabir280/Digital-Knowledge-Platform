import { useState } from 'react'
import { UploadCloud } from 'lucide-react'
import './LibrarySection.css'

const ACCESS_OPTIONS = ['public', 'restricted', 'private']

export default function LibraryUploadPage() {
  const [access, setAccess] = useState('restricted')
  const [dragging, setDragging] = useState(false)

  return (
    <section className="library-page">
      <header className="library-panel">
        <p className="library-kicker">Faculty &amp; Staff Upload</p>
        <h2 style={{ margin: '6px 0', color: 'var(--ink)', fontSize: 'clamp(1.3rem,2vw,1.8rem)', fontWeight: 800, letterSpacing: '-.02em' }}>
          Upload resource with metadata &amp; access control
        </h2>
        <p style={{ color: 'var(--muted)', fontSize: '.9rem', lineHeight: 1.6 }}>
          Drag and drop files, define visibility, add tags, and submit for moderation or direct publishing.
        </p>
      </header>

      <section className="library-panel" style={{ display: 'grid', gap: '20px' }}>
        {/* Drop zone */}
        <div
          onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => { e.preventDefault(); setDragging(false) }}
          style={{
            border: `2px dashed ${dragging ? 'var(--accent)' : 'hsl(var(--border))'}`,
            borderRadius: '14px',
            background: dragging ? 'var(--accent-bg)' : '#fafcff',
            padding: '40px 24px',
            textAlign: 'center',
            cursor: 'pointer',
            transition: 'border-color .15s, background .15s',
            display: 'grid',
            gap: '10px',
            placeItems: 'center',
          }}
        >
          <div style={{
            width: '52px',
            height: '52px',
            borderRadius: '12px',
            background: 'var(--accent-bg)',
            border: '1px solid var(--accent-soft)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <UploadCloud size={24} style={{ color: 'var(--accent)' }} />
          </div>
          <div>
            <p style={{ margin: 0, fontWeight: 700, color: 'var(--ink)', fontSize: '.95rem' }}>
              Drop PDF, DOC, PPT files or video links here
            </p>
            <p style={{ margin: '4px 0 0', fontSize: '.85rem', color: 'var(--muted)' }}>
              Supports bulk uploads and auto metadata extraction · Max 500 MB
            </p>
          </div>
          <label style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: '8px 18px',
            borderRadius: '8px',
            background: 'var(--accent)',
            color: '#fff',
            fontWeight: 600,
            fontSize: '.85rem',
            cursor: 'pointer',
          }}>
            <input type="file" multiple style={{ display: 'none' }} />
            Browse files
          </label>
        </div>

        {/* Metadata form */}
        <div style={{ display: 'grid', gap: '16px' }}>
          <h3 className="library-section-title">Resource Metadata</h3>

          <div className="library-form-grid">
            <div className="library-form-field">
              <label htmlFor="upload-title">Title</label>
              <input id="upload-title" className="library-input" placeholder="e.g. Software Architecture Handbook" />
            </div>
            <div className="library-form-field">
              <label htmlFor="upload-author">Author / Uploader</label>
              <input id="upload-author" className="library-input" placeholder="Full name" />
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
              <input id="upload-year" className="library-input" placeholder="2026" type="number" />
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
            <input id="upload-tags" className="library-input" placeholder="ai, security, thesis (comma-separated)" />
          </div>

          <div className="library-form-field">
            <label htmlFor="upload-description">Description</label>
            <textarea
              id="upload-description"
              className="library-textarea submission-textarea"
              placeholder="Short summary for discovery and preview."
              rows={4}
            />
          </div>

          <div className="library-form-field" style={{ maxWidth: '280px' }}>
            <label htmlFor="upload-access">Access Control</label>
            <select
              id="upload-access"
              className="library-select"
              value={access}
              onChange={(e) => setAccess(e.target.value)}
            >
              {ACCESS_OPTIONS.map((item) => (
                <option key={item} value={item}>{item.charAt(0).toUpperCase() + item.slice(1)}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: '10px', paddingTop: '4px', borderTop: '1px solid hsl(var(--border))' }}>
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
