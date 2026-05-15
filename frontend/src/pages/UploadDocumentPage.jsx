import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Alert } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAuth } from '../app/use-auth'
import DragDropZone from '../components/common/DragDropZone'
import UploadProgressBar from '../components/common/UploadProgressBar'
import { uploadDocument } from '../services/api/documents'

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
    <section className="mx-auto grid w-full max-w-5xl gap-4">
      <div className="grid gap-2">
        <p className="brand-kicker">Repository</p>
        <h2 className="text-2xl font-semibold tracking-tight">Upload Document</h2>
        <p className="text-sm text-muted-foreground">
          Add documents to the platform, attach metadata, and prepare them for review.
        </p>
      </div>

      <form className="grid gap-4" onSubmit={handleUpload}>
        <Card>
          <CardHeader>
            <CardTitle>Document Information</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div className="grid gap-1.5">
              <Label htmlFor="title">Document Title *</Label>
              <Input
                id="title"
                type="text"
                name="title"
                value={metadata.title}
                onChange={handleMetadataChange}
                placeholder="e.g., Research Paper on Digital Archives"
                disabled={uploading}
                required
              />
            </div>

            <div className="grid gap-1.5">
              <Label htmlFor="description">Description</Label>
              <textarea
                id="description"
                name="description"
                value={metadata.description}
                onChange={handleMetadataChange}
                placeholder="Optional: Provide additional context about this document"
                rows={4}
                disabled={uploading}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Choose Files</CardTitle>
          </CardHeader>
          <CardContent>
            <DragDropZone onFilesSelected={handleFilesSelected} disabled={uploading} />
          </CardContent>
        </Card>

        {selectedFiles.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Files to Upload ({selectedFiles.length})</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3">
              {selectedFiles.map((file, index) => (
                <div key={index} className="flex items-start justify-between gap-3 rounded-md border border-border p-3">
                  <div className="grid min-w-0 flex-1 gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-foreground">{file.name}</p>
                      <p className="text-xs text-muted-foreground">
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
                    className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-input text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground disabled:opacity-50"
                    onClick={() => removeFile(index)}
                    disabled={uploading}
                    aria-label={`Remove ${file.name}`}
                  >
                    x
                  </button>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {error && (
          <Alert variant="error">{error}</Alert>
        )}

        {successMessage && (
          <Alert variant="success" className="grid gap-2">
            <div className="grid gap-2">
              <p>{successMessage}</p>
              {lastUploadedDocumentId ? (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate(`/submit-paper?documentId=${lastUploadedDocumentId}`)}
                >
                  Continue Metadata (Doc #{lastUploadedDocumentId})
                </Button>
              ) : null}
            </div>
          </Alert>
        )}

        <div className="flex flex-wrap gap-2">
          <Button
            type="submit"
            disabled={uploading || selectedFiles.length === 0}
          >
            {uploading ? 'Uploading...' : 'Upload Files'}
          </Button>
          {selectedFiles.length > 0 && !uploading && (
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setSelectedFiles([])
                setUploadProgress({})
                setUploadStatus({})
              }}
            >
              Clear All
            </Button>
          )}
        </div>
      </form>
    </section>
  )
}
