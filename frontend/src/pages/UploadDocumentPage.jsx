import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../app/use-auth'
import DragDropZone from '../components/common/DragDropZone'
import UploadProgressBar from '../components/common/UploadProgressBar'
import { uploadDocument } from '../services/api/documents'
import './UploadDocumentPage.css'

export default function UploadDocumentPage() {
  const navigate = useNavigate()
  const { authState } = useAuth()
  const [selectedFiles, setSelectedFiles] = useState([])
  const [uploadProgress, setUploadProgress] = useState({})
  const [uploadStatus, setUploadStatus] = useState({})
  const [uploading, setUploading] = useState(false)
  const [metadata, setMetadata] = useState({
    title: '',
    description: '',
  })
  const [error, setError] = useState(null)
  const [successMessage, setSuccessMessage] = useState(null)
  const [lastUploadedDocumentId, setLastUploadedDocumentId] = useState(null)

  const handleFilesSelected = (files) => {
    setSelectedFiles((prev) => [...prev, ...files])
    setError(null)
  }

  const removeFile = (index) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index))
    setUploadProgress((prev) => {
      const newProgress = { ...prev }
      delete newProgress[index]
      return newProgress
    })
    setUploadStatus((prev) => {
      const newStatus = { ...prev }
      delete newStatus[index]
      return newStatus
    })
  }

  const handleMetadataChange = (e) => {
    const { name, value } = e.target
    setMetadata((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  const handleUpload = async (e) => {
    e.preventDefault()

    if (selectedFiles.length === 0) {
      setError('Please select at least one file to upload')
      return
    }

    if (!metadata.title.trim()) {
      setError('Please provide a title for the document')
      return
    }

    setError(null)
    setSuccessMessage(null)
    setLastUploadedDocumentId(null)
    setUploading(true)

    let successCount = 0
    let failureCount = 0

    for (let i = 0; i < selectedFiles.length; i++) {
      const file = selectedFiles[i]
      setUploadStatus((prev) => ({
        ...prev,
        [i]: 'uploading',
      }))

      try {
        const response = await uploadDocument(
          file,
          {
            title: metadata.title,
            description: metadata.description,
          },
          (progress) => {
            setUploadProgress((prev) => ({
              ...prev,
              [i]: progress.percent,
            }))
          },
          authState.token
        )

        const uploadedId = response?.data?.document?.id
        if (uploadedId) {
          setLastUploadedDocumentId(uploadedId)
        }

        setUploadStatus((prev) => ({
          ...prev,
          [i]: 'success',
        }))
        setUploadProgress((prev) => ({
          ...prev,
          [i]: 100,
        }))
        successCount++
      } catch (err) {
        setUploadStatus((prev) => ({
          ...prev,
          [i]: 'error',
        }))
        failureCount++
        console.error(`Upload error for ${file.name}:`, err)
      }
    }

    setUploading(false)

    if (successCount > 0) {
      setSuccessMessage(
        `Successfully uploaded ${successCount} file${successCount > 1 ? 's' : ''}${
          failureCount > 0 ? `. ${failureCount} failed.` : ''
        }`
      )
    } else if (failureCount > 0) {
      setError(`Failed to upload ${failureCount} file${failureCount > 1 ? 's' : ''}`)
    }

    if (successCount === selectedFiles.length) {
      // Clear successful uploads after a delay
      setTimeout(() => {
        setSelectedFiles([])
        setUploadProgress({})
        setUploadStatus({})
        setMetadata({ title: '', description: '' })
      }, 2000)
    }
  }

  return (
    <section className="page-block upload-document-page">
      <div className="upload-header">
        <p className="brand-kicker">Repository</p>
        <h2>Upload Document</h2>
        <p className="page-description">
          Add documents to the platform, attach metadata, and prepare them for review.
        </p>
      </div>

      <form className="upload-form" onSubmit={handleUpload}>
        {/* Metadata Fields */}
        <div className="form-section">
          <h3>Document Information</h3>

          <div className="form-group">
            <label htmlFor="title">Document Title *</label>
            <input
              id="title"
              type="text"
              name="title"
              value={metadata.title}
              onChange={handleMetadataChange}
              placeholder="e.g., Research Paper on Digital Archives"
              className="form-input"
              disabled={uploading}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="description">Description</label>
            <textarea
              id="description"
              name="description"
              value={metadata.description}
              onChange={handleMetadataChange}
              placeholder="Optional: Provide additional context about this document"
              className="form-textarea"
              rows={4}
              disabled={uploading}
            />
          </div>
        </div>

        {/* File Upload Section */}
        <div className="form-section">
          <h3>Choose Files</h3>
          <DragDropZone
            onFilesSelected={handleFilesSelected}
            disabled={uploading}
          />
        </div>

        {/* Selected Files List */}
        {selectedFiles.length > 0 && (
          <div className="form-section">
            <h3>Files to Upload ({selectedFiles.length})</h3>
            <div className="files-list">
              {selectedFiles.map((file, index) => (
                <div key={index} className="file-item">
                  <div className="file-info">
                    <div className="file-details">
                      <p className="file-name">{file.name}</p>
                      <p className="file-size">
                        {(file.size / (1024 * 1024)).toFixed(2)} MB
                      </p>
                    </div>
                    {uploadStatus[index] && (
                      <UploadProgressBar
                        progress={uploadProgress[index] || 0}
                        status={uploadStatus[index]}
                      />
                    )}
                  </div>
                  <button
                    type="button"
                    className="remove-button"
                    onClick={() => removeFile(index)}
                    disabled={uploading}
                    aria-label={`Remove ${file.name}`}
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="alert alert-error">
            <span className="alert-icon">⚠</span>
            <p>{error}</p>
          </div>
        )}

        {/* Success Message */}
        {successMessage && (
          <div className="alert alert-success">
            <span className="alert-icon">✓</span>
            <div>
              <p>{successMessage}</p>
              {lastUploadedDocumentId ? (
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => navigate(`/submit-paper?documentId=${lastUploadedDocumentId}`)}
                >
                  Continue Metadata (Doc #{lastUploadedDocumentId})
                </button>
              ) : null}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="form-actions">
          <button
            type="submit"
            className="btn btn-primary"
            disabled={uploading || selectedFiles.length === 0}
          >
            {uploading ? 'Uploading...' : 'Upload Files'}
          </button>
          {selectedFiles.length > 0 && !uploading && (
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => {
                setSelectedFiles([])
                setUploadProgress({})
                setUploadStatus({})
              }}
            >
              Clear All
            </button>
          )}
        </div>
      </form>
    </section>
  )
}
