import { useState, useRef } from 'react'
import { UploadCloud, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react'
import { useAuth } from '../app/use-auth.js'
import { apiRequest } from '../services/api/client'
import { uploadDocument } from '../services/api/documents.js'
import './LibrarySection.css'

const ACCESS_OPTIONS = ['public', 'restricted', 'private']

// Map user-facing type labels to backend resource categories
const TYPE_TO_RESOURCE_CATEGORY = {
  'PDF Document / E-Book': 'textbook',
  'Presentation Slides (PPT/PPTX)': 'lecture-slides',
  'Question Bank': 'question-bank',
  'Assignment': 'assignment',
  'Lab Report': 'lab-report',
  'Video Content': 'media',
  'External Online Resource': 'media',
}

export default function LibraryUploadPage() {
  const { authState } = useAuth()
  const fileInputRef = useRef(null)
  
  const [access, setAccess] = useState('restricted')
  const [dragging, setDragging] = useState(false)
  const [selectedFile, setSelectedFile] = useState(null)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [uploadStatus, setUploadStatus] = useState(null) // 'success', 'error', null
  const [uploadMessage, setUploadMessage] = useState('')
  const [showSuccessModal, setShowSuccessModal] = useState(false)
  const [successTitle, setSuccessTitle] = useState('')
  
  const [formData, setFormData] = useState({
    title: '',
    author: '',
    course: '',
    department: 'Computer Science and Engineering',
    year: new Date().getFullYear(),
    type: 'PDF Document / E-Book',
    tags: '',
    description: '',
  })

  const handleDrop = (e) => {
    e.preventDefault()
    setDragging(false)
    const files = e.dataTransfer.files
    if (files.length > 0) {
      setSelectedFile(files[0])
      // Auto-fill title if empty
      if (!formData.title) {
        setFormData(p => ({
          ...p,
          title: files[0].name.replace(/\.[^.]+$/, '').replace(/[-_]/g, ' ')
        }))
      }
    }
  }

  const handleFileInput = (e) => {
    const files = e.target.files
    if (files.length > 0) {
      setSelectedFile(files[0])
      if (!formData.title) {
        setFormData(p => ({
          ...p,
          title: files[0].name.replace(/\.[^.]+$/, '').replace(/[-_]/g, ' ')
        }))
      }
    }
  }

  const handleInputChange = (e) => {
    const { id, value } = e.target
    const key = id.replace('upload-', '')
    setFormData(p => ({ ...p, [key]: value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!selectedFile) {
      setUploadStatus('error')
      setUploadMessage('Please select a file to upload')
      return
    }

    if (!formData.title.trim() || !formData.author.trim()) {
      setUploadStatus('error')
      setUploadMessage('Please fill in Title and Author')
      return
    }

    if (!authState?.token) {
      setUploadStatus('error')
      setUploadMessage('You must be logged in to upload resources')
      return
    }

    setIsUploading(true)
    setUploadStatus(null)
    setUploadMessage('')
    setUploadProgress(0)

    try {
      // Upload file to backend - will be stored as pending by default
      const resourceCategory = TYPE_TO_RESOURCE_CATEGORY[formData.type] || 'textbook'
      console.log('[LibraryUpload] Starting upload with type:', formData.type, 'resourceCategory:', resourceCategory)
      const result = await uploadDocument(
        selectedFile,
        { 
          title: formData.title.trim(), 
          description: formData.description.trim(),
          resourceCategory: resourceCategory,
          keywords: formData.tags.split(',').map(t => t.trim()).filter(Boolean),
          author: formData.author.trim(),
          department: formData.department,
          course: formData.course.trim(),
          year: formData.year,
          language: 'English',
        },
        ({ percent }) => setUploadProgress(percent),
        authState.token
      )

      console.log('[LibraryUpload] Upload successful, result:', result)
      const docId = result?.data?.document?.id
      const docState = result?.data?.document?.state

      if (docId) {
        // Create/update metadata for the document
        try {
          console.log('[LibraryUpload] Creating metadata for docId:', docId)
          await apiRequest(`/repository/${docId}/metadata`, {
            method: 'POST',
            authToken: authState.token,
            body: JSON.stringify({
              author: formData.author.trim(),
              abstract: formData.description.trim(),
              keywords: formData.tags.split(',').map(t => t.trim()).filter(Boolean),
              language: 'English',
              published_year: formData.year,
              department: formData.department,
            }),
          })
          console.log('[LibraryUpload] Metadata created successfully')
        } catch (metaErr) {
          console.warn('[LibraryUpload] Failed to create metadata:', metaErr)
        }

        setUploadStatus('success')
        setUploadMessage(`Resource submitted successfully! It's now pending admin approval.`)
        setSuccessTitle(formData.title.trim())
        setShowSuccessModal(true)
        
        // Reset form after showing modal
        setTimeout(() => {
          setSelectedFile(null)
          setFormData({
            title: '',
            author: '',
            course: '',
            department: 'Computer Science and Engineering',
            year: new Date().getFullYear(),
            type: 'PDF Document / E-Book',
            tags: '',
            description: '',
          })
          setUploadProgress(0)
        }, 500)
      }
    } catch (error) {
      console.error('[LibraryUpload] Upload failed:', error)
      setUploadStatus('error')
      setUploadMessage(error.message || 'Upload failed. Please try again.')
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <section className="library-page">
      <header className="library-panel">
        <p className="library-kicker">Faculty &amp; Staff Upload</p>
        <h2 style={{ margin: '6px 0', color: 'var(--ink)', fontSize: 'clamp(1.3rem,2vw,1.8rem)', fontWeight: 800, letterSpacing: '-.02em' }}>
          Upload resource with metadata &amp; access control
        </h2>
        <p style={{ color: 'var(--muted)', fontSize: '.9rem', lineHeight: 1.6 }}>
          Drag and drop files, add metadata, and submit for admin approval. Resources will appear in the library after review.
        </p>
      </header>

      <section className="library-panel" style={{ display: 'grid', gap: '20px' }}>
        
        {/* Status Messages */}
        {uploadStatus && (
          <div style={{
            padding: '12px 16px',
            borderRadius: '8px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            background: uploadStatus === 'success' ? '#dcfce7' : '#fee2e2',
            border: `1px solid ${uploadStatus === 'success' ? '#86efac' : '#fca5a5'}`,
          }}>
            {uploadStatus === 'success' ? (
              <CheckCircle2 size={20} style={{ color: '#16a34a' }} />
            ) : (
              <AlertCircle size={20} style={{ color: '#dc2626' }} />
            )}
            <p style={{ margin: 0, fontSize: '.9rem', color: uploadStatus === 'success' ? '#166534' : '#991b1b' }}>
              {uploadMessage}
            </p>
          </div>
        )}

        {/* Drop zone */}
        <div
          onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
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
              {selectedFile ? `Selected: ${selectedFile.name}` : 'Drop PDF, DOC, PPT files here'}
            </p>
            <p style={{ margin: '4px 0 0', fontSize: '.85rem', color: 'var(--muted)' }}>
              {selectedFile ? 'Click browse to change' : 'Supports PDF, DOC, PPT · Max 500 MB'}
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
            <input 
              ref={fileInputRef}
              type="file" 
              style={{ display: 'none' }}
              onChange={handleFileInput}
              accept=".pdf,.doc,.docx,.ppt,.pptx"
            />
            Browse files
          </label>
        </div>

        {/* Metadata form */}
        <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '16px' }}>
          <h3 className="library-section-title">Resource Metadata</h3>

          <div className="library-form-grid">
            <div className="library-form-field">
              <label htmlFor="upload-title">Title *</label>
              <input 
                id="upload-title" 
                className="library-input" 
                placeholder="e.g. Software Architecture Handbook"
                value={formData.title}
                onChange={handleInputChange}
                required
              />
            </div>
            <div className="library-form-field">
              <label htmlFor="upload-author">Author / Uploader *</label>
              <input 
                id="upload-author" 
                className="library-input" 
                placeholder="Full name"
                value={formData.author}
                onChange={handleInputChange}
                required
              />
            </div>
            <div className="library-form-field">
              <label htmlFor="upload-course">Course</label>
              <input 
                id="upload-course" 
                className="library-input" 
                placeholder="CSE-410"
                value={formData.course}
                onChange={handleInputChange}
              />
            </div>
            <div className="library-form-field">
              <label htmlFor="upload-department">Department</label>
              <select 
                id="upload-department" 
                className="library-select"
                value={formData.department}
                onChange={handleInputChange}
              >
                <option>Computer Science and Engineering</option>
                <option>Information Science and Library Management</option>
                <option>Electrical and Electronic Engineering</option>
                <option>Genetic Engineering</option>
                <option>Mathematics</option>
                <option>Physics</option>
                <option>Chemistry</option>
                <option>Business Administration</option>
                <option>Other</option>
              </select>
            </div>
            <div className="library-form-field">
              <label htmlFor="upload-year">Year</label>
              <input 
                id="upload-year" 
                className="library-input" 
                placeholder="2026" 
                type="number"
                value={formData.year}
                onChange={handleInputChange}
              />
            </div>
            <div className="library-form-field">
              <label htmlFor="upload-type">Resource Type *</label>
              <select 
                id="upload-type" 
                className="library-select"
                value={formData.type}
                onChange={handleInputChange}
                required
              >
                <option value="">Select resource type</option>
                <option value="PDF Document / E-Book">PDF Document / E-Book</option>
                <option value="Presentation Slides (PPT/PPTX)">Presentation Slides (PPT/PPTX)</option>
                <option value="Question Bank">Question Bank</option>
                <option value="Assignment">Assignment</option>
                <option value="Lab Report">Lab Report</option>
                <option value="Video Content">Video Content</option>
                <option value="External Online Resource">External Online Resource</option>
              </select>
            </div>
          </div>

          <div className="library-form-field">
            <label htmlFor="upload-tags">Tags</label>
            <input 
              id="upload-tags" 
              className="library-input" 
              placeholder="ai, security, thesis (comma-separated)"
              value={formData.tags}
              onChange={handleInputChange}
            />
          </div>

          <div className="library-form-field">
            <label htmlFor="upload-description">Description</label>
            <textarea
              id="upload-description"
              className="library-textarea submission-textarea"
              placeholder="Short summary for discovery and preview."
              rows={4}
              value={formData.description}
              onChange={handleInputChange}
            />
          </div>

          {/* Status Info */}
          <div style={{
            padding: '12px 14px',
            borderRadius: '8px',
            background: '#f0f9ff',
            border: '1px solid #e0f2fe',
            fontSize: '.85rem',
            color: '#0369a1',
          }}>
            ℹ️ Your resource will be submitted for admin approval. It will appear in the library after review.
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', gap: '10px', paddingTop: '4px', borderTop: '1px solid hsl(var(--border))' }}>
            <button 
              type="submit" 
              className="library-btn library-btn-primary"
              disabled={isUploading || !selectedFile}
              style={{ display: 'flex', alignItems: 'center', gap: '6px', opacity: isUploading || !selectedFile ? 0.6 : 1 }}
            >
              {isUploading ? (
                <>
                  <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />
                  Uploading...
                </>
              ) : (
                'Submit for Review'
              )}
            </button>
            <button 
              type="button" 
              className="library-btn library-btn-ghost"
              onClick={() => {
                setSelectedFile(null)
                setFormData({
                  title: '',
                  author: '',
                  course: '',
                  department: 'Computer Science and Engineering',
                  year: new Date().getFullYear(),
                  type: 'PDF Document / E-Book',
                  tags: '',
                  description: '',
                })
              }}
            >
              Clear
            </button>
          </div>
        </form>
      </section>

      {/* Success Modal */}
      {showSuccessModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          zIndex: 50,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'rgba(0,0,0,0.6)',
          padding: '16px',
        }}>
          <div style={{
            background: 'var(--card-bg)',
            border: '1px solid hsl(var(--border))',
            borderRadius: '12px',
            padding: '32px',
            maxWidth: '420px',
            width: '100%',
            textAlign: 'center',
            boxShadow: '0 10px 40px rgba(0,0,0,0.2)',
          }}>
            <div style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              background: 'rgba(34, 197, 94, 0.1)',
              border: '2px solid #22c55e',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px',
            }}>
              <CheckCircle2 size={36} style={{ color: '#22c55e' }} />
            </div>
            <h3 style={{ margin: '0 0 8px', fontSize: '1.1rem', fontWeight: 700, color: 'var(--ink)' }}>
              Submitted Successfully!
            </h3>
            <p style={{ margin: '0 0 16px', fontSize: '.9rem', color: 'var(--muted)' }}>
              Your resource "<strong>{successTitle}</strong>" has been submitted for admin review.
            </p>
            <div style={{
              background: 'rgba(59, 130, 246, 0.1)',
              border: '1px solid rgba(59, 130, 246, 0.2)',
              borderRadius: '8px',
              padding: '12px',
              marginBottom: '16px',
              textAlign: 'left',
              fontSize: '.85rem',
            }}>
              <p style={{ margin: '0 0 8px', fontWeight: 600, color: '#1e40af' }}>📋 What happens next?</p>
              <ul style={{ margin: 0, paddingLeft: '20px', color: '#1e40af', lineHeight: 1.6 }}>
                <li>An admin will review your resource</li>
                <li>You'll be notified once it's approved</li>
                <li>Once approved, it appears in the Library</li>
              </ul>
            </div>
            <button
              onClick={() => setShowSuccessModal(false)}
              style={{
                width: '100%',
                padding: '10px 16px',
                borderRadius: '8px',
                background: '#22c55e',
                color: '#fff',
                fontWeight: 600,
                fontSize: '.9rem',
                border: 'none',
                cursor: 'pointer',
              }}
            >
              ✓ Done
            </button>
          </div>
        </div>
      )}
    </section>
  )
}
