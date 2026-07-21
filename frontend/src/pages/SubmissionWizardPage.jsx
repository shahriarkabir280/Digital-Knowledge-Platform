import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Alert } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { useAuth } from '../app/use-auth.js'
import DragDropZone from '../components/common/DragDropZone'
import UploadProgressBar from '../components/common/UploadProgressBar'
import {
  getDocument,
  getDocumentMetadata,
  patchDocumentState,
  saveDocumentMetadata,
  uploadDocument,
} from '../services/api/documents.js'
import { extractFileMetadata } from '../services/metadataExtractor.js'
import { toast } from 'sonner'
import { Sparkles } from 'lucide-react'

const steps = [
  { id: 1, title: 'File Upload', description: 'Choose a document to start the submission.' },
  { id: 2, title: 'Metadata', description: 'Complete title, authors, abstract, and keywords.' },
  { id: 3, title: 'Access Tier', description: 'Choose who can view the submission.' },
  { id: 4, title: 'Review', description: 'Check everything before submitting for review.' },
]

const languageOptions = ['English', 'Bangla', 'Arabic', 'Hindi', 'Other']
const accessTierOptions = [
  { value: 'PUBLIC', label: 'Public' },
  { value: 'REGISTERED', label: 'Private' },
  { value: 'RESTRICTED', label: 'Restricted' },
]
const departmentOptions = [
  'Computer Science and Engineering',
  'Information Science and Library Management',
  'Electrical and Electronic Engineering',
  'Genetic Engineering',
  'Mathematics',
  'Physics',
  'Chemistry',
  'Business Administration',
  'Other',
]

function getCurrentYear() {
  return new Date().getFullYear()
}

function splitKeywords(value) {
  return value
    .split(',')
    .map((keyword) => keyword.trim())
    .filter(Boolean)
}

function createEmptyForm(name = '') {
  return {
    title: '',
    author: name || '',
    abstract: '',
    keywords: '',
    language: 'English',
    year: String(getCurrentYear()),
    department: 'Computer Science and Engineering',
    accessTier: 'REGISTERED',
  }
}

function getDraftKey(authState) {
  return `submission-wizard-draft:${authState.name || authState.role || 'anonymous'}`
}

function formatFileSize(size) {
  if (!size && size !== 0) return 'Unknown size'
  return `${(size / (1024 * 1024)).toFixed(2)} MB`
}

export default function SubmissionWizardPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { authState } = useAuth()

  const [currentStep, setCurrentStep] = useState(1)
  const [form, setForm] = useState(() => createEmptyForm(authState.name || ''))
  const [selectedFile, setSelectedFile] = useState(null)
  const [pendingFileMeta, setPendingFileMeta] = useState(null)
  const [pendingFileStatus, setPendingFileStatus] = useState('idle')
  const [isExtracting, setIsExtracting] = useState(false)
  const [uploadedDocument, setUploadedDocument] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [saving, setSaving] = useState(false)
  const [restoringDraft, setRestoringDraft] = useState(true)
  const [draftState, setDraftState] = useState('restoring')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const draftKey = useMemo(() => getDraftKey(authState), [authState])
  const keywordList = useMemo(() => splitKeywords(form.keywords), [form.keywords])
  const completion = useMemo(() => Math.round((currentStep / steps.length) * 100), [currentStep])

  const loadDocumentContext = async (documentId, nextForm = null) => {
    const [documentResult, metadataResult] = await Promise.all([
      getDocument(documentId, authState.token),
      getDocumentMetadata(documentId, authState.token).catch(() => null),
    ])

    const document = documentResult?.data?.document || null
    const metadata = metadataResult?.data?.metadata || null

    setUploadedDocument(document || { id: Number(documentId) })
    setPendingFileMeta(null)
    setSelectedFile(null)

    setForm((current) => {
      const base = nextForm || current
      return {
        ...base,
        title: document?.title || base.title || '',
        author: metadata?.author || base.author || authState.name || '',
        abstract: metadata?.abstract || base.abstract || '',
        keywords: Array.isArray(metadata?.keywords) ? metadata.keywords.join(', ') : base.keywords || '',
        language: metadata?.language || base.language || 'English',
        year: metadata?.year ? String(metadata.year) : base.year || String(getCurrentYear()),
        department: metadata?.department || base.department || 'Computer Science and Engineering',
        accessTier: document?.accessTier || base.accessTier || 'REGISTERED',
      }
    })
  }

  useEffect(() => {
    let isMounted = true

    const restoreDraft = async () => {
      try {
        const rawDraft = window.localStorage.getItem(draftKey)
        const draft = rawDraft ? JSON.parse(rawDraft) : null
        const queryDocumentId = searchParams.get('documentId')
        const preferredDocumentId = queryDocumentId || ''

        if (draft?.form) {
          setForm((current) => ({
            ...current,
            ...draft.form,
            author: draft.form.author || authState.name || current.author,
          }))
        }

        if (draft?.pendingFileMeta) {
          setPendingFileMeta(null)
          setMessage('A previous upload was interrupted. Please reselect the file to continue.')
        }

        if (preferredDocumentId) {
          await loadDocumentContext(preferredDocumentId, draft?.form || null)
          if (isMounted) {
            setCurrentStep(Math.max(Number(draft?.currentStep || 2), 2))
          }
        } else if (isMounted) {
          // Opening /submit-paper without a documentId should always start fresh file upload.
          setUploadedDocument(null)
          setSelectedFile(null)
          setPendingFileMeta(null)
          setPendingFileStatus('idle')
          setUploadProgress(0)
          setCurrentStep(1)
        }
      } catch (_error) {
        if (isMounted) {
          setMessage('You can start a new submission if the draft cannot be restored.')
        }
      } finally {
        if (isMounted) {
          setRestoringDraft(false)
          setDraftState('saved')
        }
      }
    }

    restoreDraft()

    return () => {
      isMounted = false
    }
  }, [authState.name, authState.token, draftKey, searchParams])

  useEffect(() => {
    if (restoringDraft) return

    setDraftState('saving')
    const timeout = window.setTimeout(() => {
      try {
        const draft = {
          currentStep,
          uploadedDocumentId: uploadedDocument?.id || null,
          form,
          savedAt: new Date().toISOString(),
        }
        window.localStorage.setItem(draftKey, JSON.stringify(draft))
        setDraftState('saved')
      } catch (_error) {
        setDraftState('error')
      }
    }, 350)

    return () => window.clearTimeout(timeout)
  }, [currentStep, draftKey, form, pendingFileMeta, restoringDraft, uploadedDocument?.id])

  const canContinueFromMetadata =
    form.title.trim() && form.author.trim() && form.abstract.trim() && keywordList.length > 0

  const canContinueFromTier = Boolean(form.accessTier.trim())

  const clearDraft = () => {
    window.localStorage.removeItem(draftKey)
    setDraftState('saved')
  }

  const handleFileSelected = async (files) => {
    const [file] = files
    if (!file) return

    setError('')
    setMessage('')
    setSelectedFile(file)
    setPendingFileStatus('pending')
    setPendingFileMeta({
      name: file.name,
      size: file.size,
      type: file.type,
    })

    // Extract metadata using Gemini AI (runs in parallel with upload)
    setIsExtracting(true)
    const fileMeta = extractFileMetadata(file)

    // Start upload immediately after selecting a file
    await uploadSelectedFile(file, fileMeta)

    setIsExtracting(false)
  }

  const handleFieldChange = (event) => {
    const { name, value } = event.target
    setForm((current) => ({
      ...current,
      [name]: value,
    }))
    setMessage('')
    setError('')
  }

  const uploadSelectedFile = async (fileOverride = null, pendingExtraction = null) => {
    const fileToUpload = fileOverride || selectedFile

    if (!fileToUpload) {
      setError('Please choose a file to upload first.')
      return
    }

    try {
      setUploading(true)
      setPendingFileStatus('uploading')
      setError('')
      setMessage('')
      setUploadProgress(0)

      const response = await uploadDocument(
        fileToUpload,
        {},
        (progress) => {
          setUploadProgress(progress.percent)
        },
        authState.token,
      )

      const document = response?.data?.document || null
      if (!document?.id) {
        throw new Error('Upload completed but no document was returned.')
      }

      setUploadedDocument(document)
      setSelectedFile(null)
      setPendingFileMeta(null)
      setPendingFileStatus('idle')
      await loadDocumentContext(document.id, form)

      // Update message based on document state
      let uploadMsg = document.state === 'pending'
        ? `Document #${document.id} uploaded and is awaiting admin approval before appearing in the repository.`
        : `File uploaded successfully as document #${document.id}.`

      // Merge AI-extracted metadata into the form if available
      if (pendingExtraction) {
        const meta = await pendingExtraction
        if (meta.success && (meta.title || meta.author || meta.summary || meta.tags)) {
          setForm(current => ({
            ...current,
            title: meta.title || current.title || '',
            author: meta.author || current.author || authState.name || '',
            abstract: meta.summary || current.abstract || '',
            keywords: meta.tags || current.keywords || '',
          }))
          uploadMsg = 'Document uploaded and fields auto-populated from AI analysis. Review the metadata and continue.'
        } else if (meta.error) {
          uploadMsg += ` Auto-fill note: ${meta.error}`
        }
      }

      setMessage(uploadMsg)

      setCurrentStep(2)
    } catch (uploadError) {
      setPendingFileStatus('error')
      setError(uploadError.message || 'Failed to upload file.')
    } finally {
      setUploading(false)
    }
  }

  const canVisitStep = (step) => {
    if (step === 1) return true
    if (step === 2) return Boolean(uploadedDocument?.id)
    if (step === 3) return Boolean(uploadedDocument?.id) && canContinueFromMetadata
    if (step === 4) return Boolean(uploadedDocument?.id) && canContinueFromMetadata && canContinueFromTier
    return false
  }

  const goToStep = (step) => {
    if (step < 1 || step > steps.length) return
    if (!canVisitStep(step)) return
    setCurrentStep(step)
    setMessage('')
    setError('')
  }

  const handleNext = () => {
    if (currentStep === 1) {
      if (!uploadedDocument?.id) {
        setError('Upload a file before continuing to metadata.')
        return
      }
      goToStep(2)
      return
    }

    if (currentStep === 2) {
      if (!canContinueFromMetadata) {
        setError('Please complete title, author, abstract, and keywords before continuing.')
        return
      }
      goToStep(3)
      return
    }

    if (currentStep === 3) {
      if (!canContinueFromTier) {
        setError('Please choose an access tier before continuing.')
        return
      }
      goToStep(4)
    }
  }

  const handlePrevious = () => {
    if (currentStep > 1) {
      goToStep(currentStep - 1)
    }
  }

  const submitForReview = async () => {
    if (!uploadedDocument?.id) {
      setCurrentStep(1)
      setError('Upload a file first.')
      return
    }

    if (!canContinueFromMetadata) {
      setCurrentStep(2)
      setError('Please complete the metadata fields before submitting.')
      return
    }

    if (!canContinueFromTier) {
      setCurrentStep(3)
      setError('Please choose an access tier before submitting.')
      return
    }

    const payload = {
      title: form.title.trim(),
      author: form.author.trim(),
      abstract: form.abstract.trim(),
      keywords: keywordList,
      language: form.language,
      year: Number(form.year),
      department: form.department,
      accessTier: form.accessTier,
    }

    try {
      setSaving(true)
      setError('')
      setMessage('')
      await saveDocumentMetadata(uploadedDocument.id, payload, authState.token)
      await patchDocumentState(uploadedDocument.id, 'review', authState.token)
      clearDraft()
      toast.success('Submitted for review', {
        description: `Document #${uploadedDocument.id} is now in the review queue.`,
      })
      navigate('/dashboard', { replace: true })
    } catch (submitError) {
      setError(submitError.message || 'Failed to submit the document for review.')
    } finally {
      setSaving(false)
    }
  }

  const saveAsDraft = async () => {
    if (!uploadedDocument?.id) {
      setCurrentStep(1)
      setError('Upload a file first.')
      return
    }

    if (!canContinueFromMetadata) {
      setCurrentStep(2)
      setError('Please complete the metadata fields before saving.')
      return
    }

    if (!canContinueFromTier) {
      setCurrentStep(3)
      setError('Please choose an access tier before saving.')
      return
    }

    const payload = {
      title: form.title.trim(),
      author: form.author.trim(),
      abstract: form.abstract.trim(),
      keywords: keywordList,
      language: form.language,
      year: Number(form.year),
      department: form.department,
      accessTier: form.accessTier,
    }

    try {
      setSaving(true)
      setError('')
      setMessage('')
      await saveDocumentMetadata(uploadedDocument.id, payload, authState.token)
      await patchDocumentState(uploadedDocument.id, 'draft', authState.token)
      clearDraft()
      toast.success('Saved as draft', {
        description: `Document #${uploadedDocument.id} — submit for review from the Dashboard when ready.`,
      })
      navigate('/dashboard', { replace: true })
    } catch (saveError) {
      setError(saveError.message || 'Failed to save the document as draft.')
    } finally {
      setSaving(false)
    }
  }

  const isStepAccessible = (step) => canVisitStep(step)

  return (
    <section className="mx-auto grid w-full max-w-6xl gap-4">
      <div className="grid gap-3 lg:grid-cols-[1fr_320px] lg:items-start">
        <div className="grid gap-2">
          <p className="brand-kicker">Repository Submission</p>
          <h2 className="text-2xl font-semibold tracking-tight">Submission Wizard</h2>
          <p className="text-sm text-muted-foreground">
            Complete the flow in clear steps: file upload, metadata, access tier, and final review.
          </p>
        </div>

        <Card>
          <CardContent className="grid gap-2 p-4">
            <span className="text-xs uppercase tracking-widest text-muted-foreground">Progress</span>
            <strong className="text-2xl">
              Step {currentStep} of {steps.length}
            </strong>
            <div className="h-2 w-full rounded-full bg-muted" aria-hidden="true">
              <span
                className="block h-full rounded-full bg-primary transition-all duration-300"
                style={{ width: `${completion}%` }}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              {draftState === 'saving'
                ? 'Saving draft...'
                : draftState === 'error'
                  ? 'Draft autosave failed.'
                  : 'Draft autosave is on.'}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-2 md:grid-cols-4">
        {steps.map((step) => {
          const active = currentStep === step.id
          const complete = currentStep > step.id
          const accessible = isStepAccessible(step.id)

          return (
            <button
              key={step.id}
              type="button"
              onClick={() => goToStep(step.id)}
              disabled={!accessible}
              className={`rounded-lg border p-3 text-left transition-colors ${
                active
                  ? 'border-primary bg-primary/5'
                  : complete
                    ? 'border-border bg-muted/40'
                    : 'border-border bg-background'
              } ${accessible ? 'hover:border-primary/60' : 'cursor-not-allowed opacity-60'}`}
            >
              <div className="flex items-center justify-between gap-2">
                <Badge variant={active ? 'secondary' : complete ? 'success' : 'outline'}>
                  Step {step.id}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  {active ? 'Current' : complete ? 'Done' : 'Next'}
                </span>
              </div>
              <p className="mt-2 font-medium">{step.title}</p>
              <p className="mt-1 text-xs text-muted-foreground">{step.description}</p>
            </button>
          )
        })}
      </div>

      {message ? <Alert variant="success">{message}</Alert> : null}
      {error ? <Alert variant="error">{error}</Alert> : null}

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="rounded-2xl border border-border bg-card shadow-sm min-w-0">
          {currentStep === 1 ? (
            <section className="p-4 sm:p-6">
              <Card className="border-0 shadow-none">
                <CardHeader className="px-0 pt-0">
                  <CardTitle>Step 1: File Upload</CardTitle>
                </CardHeader>
                <CardContent className="grid gap-4 px-0 pb-0">
                  {uploadedDocument?.id ? (
                    <div className="grid gap-2 rounded-md border border-border bg-muted/30 p-3">
                      <div className="flex items-center justify-between gap-2">
                        <strong>Uploaded document #{uploadedDocument.id}</strong>
                        <Badge variant="outline">{uploadedDocument.state || 'draft'}</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground break-words">
                        {uploadedDocument.title || 'Untitled'}
                        {uploadedDocument.format ? ` • ${uploadedDocument.format.toUpperCase()}` : ''}
                        {uploadedDocument.accessTier ? ` • ${uploadedDocument.accessTier}` : ''}
                      </p>
                      <Button type="button" variant="outline" onClick={() => setUploadedDocument(null)}>
                        Replace file
                      </Button>
                    </div>
                  ) : null}

                  {!uploadedDocument?.id ? (
                    <>
                      <DragDropZone onFilesSelected={handleFileSelected} disabled={uploading} />

                      {pendingFileMeta ? (
                        <div className="grid gap-2 rounded-md border border-border p-3 text-sm">
                          <div className="flex items-center justify-between gap-2">
                            <strong className="truncate">{pendingFileMeta.name}</strong>
                            <Badge variant="outline">
                              {pendingFileStatus === 'uploading'
                                ? 'Uploading'
                                : pendingFileStatus === 'error'
                                  ? 'Failed'
                                  : 'Pending'}
                            </Badge>
                          </div>
                          <p className="text-muted-foreground">
                            {formatFileSize(pendingFileMeta.size)}{pendingFileMeta.type ? ` • ${pendingFileMeta.type}` : ''}
                          </p>
                          {isExtracting && (
                            <p className="flex items-center gap-1.5 text-xs text-accent font-semibold mt-1">
                              <Sparkles size={12} className="animate-pulse" />
                              AI analyzing document for auto-fill...
                            </p>
                          )}
                        </div>
                      ) : null}

                      {selectedFile ? (
                        <UploadProgressBar
                          progress={uploadProgress}
                          status={pendingFileStatus === 'error' ? 'error' : uploading ? 'uploading' : 'idle'}
                        />
                      ) : null}

                      <div className="flex flex-wrap gap-2">
                        <Button type="button" disabled={!selectedFile || uploading} onClick={uploadSelectedFile}>
                          {uploading ? 'Uploading...' : pendingFileStatus === 'error' ? 'Retry Upload' : 'Upload File'}
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          disabled={!selectedFile || uploading}
                          onClick={() => {
                            setSelectedFile(null)
                            setPendingFileMeta(null)
                            setPendingFileStatus('idle')
                            setUploadProgress(0)
                          }}
                        >
                          Clear Selection
                        </Button>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Uploaded files are saved immediately. The rest of the wizard is auto-saved as a draft.
                      </p>
                    </>
                  ) : (
                    <div className="grid gap-2 rounded-md border border-border bg-muted/20 p-3 text-sm text-muted-foreground">
                      <p>The file upload step is complete. Continue to metadata review.</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </section>
          ) : null}

          {currentStep === 2 ? (
            <section className="p-4 sm:p-6">
              <Card className="border-0 shadow-none">
                <CardHeader className="px-0 pt-0">
                  <CardTitle>Step 2: Metadata</CardTitle>
                </CardHeader>
                <CardContent className="grid gap-3 px-0 pb-0">
                  <div className="grid gap-1.5">
                    <Label htmlFor="title">Title *</Label>
                    <Input id="title" name="title" value={form.title} onChange={handleFieldChange} placeholder="Enter the document title" />
                  </div>

                  <div className="grid gap-1.5">
                    <Label htmlFor="author">Author *</Label>
                    <Input id="author" name="author" value={form.author} onChange={handleFieldChange} placeholder="Primary author or contributor" />
                  </div>

                  <div className="grid gap-1.5">
                    <Label htmlFor="abstract">Abstract *</Label>
                    <Textarea
                      id="abstract"
                      name="abstract"
                      rows={8}
                      value={form.abstract}
                      onChange={handleFieldChange}
                      placeholder="Write a short summary of the document"
                      className="submission-textarea"
                    />
                  </div>

                  <div className="grid gap-1.5">
                    <Label htmlFor="keywords">Keywords *</Label>
                    <Input id="keywords" name="keywords" value={form.keywords} onChange={handleFieldChange} placeholder="digital library, archive, metadata" />
                    <p className="text-xs text-muted-foreground">Separate keywords with commas.</p>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="grid gap-1.5">
                      <Label htmlFor="language">Language</Label>
                      <Select id="language" name="language" value={form.language} onChange={handleFieldChange}>
                        {languageOptions.map((language) => (
                          <option key={language} value={language}>
                            {language}
                          </option>
                        ))}
                      </Select>
                    </div>

                    <div className="grid gap-1.5">
                      <Label htmlFor="year">Year</Label>
                      <Input id="year" name="year" type="number" min="1900" max={getCurrentYear() + 1} value={form.year} onChange={handleFieldChange} />
                    </div>
                  </div>

                  <div className="grid gap-1.5">
                    <Label htmlFor="department">Department</Label>
                    <Select id="department" name="department" value={form.department} onChange={handleFieldChange}>
                      {departmentOptions.map((department) => (
                        <option key={department} value={department}>
                          {department}
                        </option>
                      ))}
                    </Select>
                  </div>

                  <div className="flex flex-wrap gap-2 pt-1">
                    <Button type="button" variant="outline" onClick={handlePrevious} disabled={currentStep === 1 || saving}>
                      Back
                    </Button>
                    <Button type="button" onClick={handleNext} disabled={!canContinueFromMetadata || saving}>
                      Save and Continue
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </section>
          ) : null}

          {currentStep === 3 ? (
            <section className="p-4 sm:p-6">
              <Card className="border-0 shadow-none">
                <CardHeader className="px-0 pt-0">
                  <CardTitle>Step 3: Access Tier</CardTitle>
                </CardHeader>
                <CardContent className="grid gap-3 px-0 pb-0">
                  <div className="grid gap-1.5">
                    <Label htmlFor="accessTier">Access Tier *</Label>
                    <Select id="accessTier" name="accessTier" value={form.accessTier} onChange={handleFieldChange}>
                      {accessTierOptions.map((tier) => (
                        <option key={tier.value} value={tier.value}>
                          {tier.label}
                        </option>
                      ))}
                    </Select>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <Button type="button" variant="outline" onClick={handlePrevious} disabled={saving}>
                      Back
                    </Button>
                    <Button type="button" onClick={handleNext} disabled={!canContinueFromTier || saving}>
                      Review Submission
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </section>
          ) : null}

          {currentStep === 4 ? (
            <section className="p-4 sm:p-6">
              <Card className="border-0 shadow-none">
                <CardHeader className="px-0 pt-0">
                  <CardTitle>Step 4: Review</CardTitle>
                </CardHeader>
                <CardContent className="grid gap-3 px-0 pb-0 text-sm min-w-0">
                  <div className="grid gap-1 rounded-md border border-border p-3 min-w-0">
                    <span className="text-xs uppercase tracking-wide text-muted-foreground">Document</span>
                    <strong className="break-words">{uploadedDocument?.title || form.title || 'Untitled document'}</strong>
                    <span className="text-muted-foreground">
                      {uploadedDocument?.id ? `Document #${uploadedDocument.id}` : 'Upload not completed yet'}
                    </span>
                  </div>

                  <div className="grid gap-1 rounded-md border border-border p-3">
                    <span className="text-xs uppercase tracking-wide text-muted-foreground">Author</span>
                    <strong>{form.author || 'Not set'}</strong>
                  </div>

                  <div className="grid gap-1 rounded-md border border-border p-3">
                    <span className="text-xs uppercase tracking-wide text-muted-foreground">Abstract</span>
                    <p className="text-muted-foreground">{form.abstract || 'No abstract provided yet.'}</p>
                  </div>

                  <div className="grid gap-1 rounded-md border border-border p-3">
                    <span className="text-xs uppercase tracking-wide text-muted-foreground">Keywords</span>
                    <div className="flex flex-wrap gap-1.5">
                      {keywordList.length > 0 ? keywordList.map((keyword) => <Badge key={keyword} variant="secondary">{keyword}</Badge>) : <span className="text-muted-foreground">No keywords yet</span>}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="grid gap-1 rounded-md border border-border p-3">
                      <span className="text-xs uppercase tracking-wide text-muted-foreground">Language</span>
                      <strong>{form.language}</strong>
                    </div>
                    <div className="grid gap-1 rounded-md border border-border p-3">
                      <span className="text-xs uppercase tracking-wide text-muted-foreground">Year</span>
                      <strong>{form.year}</strong>
                    </div>
                  </div>

                  <div className="grid gap-1 rounded-md border border-border p-3">
                    <span className="text-xs uppercase tracking-wide text-muted-foreground">Department</span>
                    <strong>{form.department}</strong>
                  </div>

                  <div className="grid gap-1 rounded-md border border-border p-3">
                    <span className="text-xs uppercase tracking-wide text-muted-foreground">Access Tier</span>
                    <strong>{accessTierOptions.find((tier) => tier.value === form.accessTier)?.label || form.accessTier}</strong>
                  </div>

                  <div className="flex flex-wrap gap-2 pt-1">
                    <Button type="button" variant="outline" onClick={handlePrevious} disabled={saving}>
                      Back
                    </Button>
      <Button type="button" variant="outline" onClick={saveAsDraft} disabled={saving || !uploadedDocument?.id}>
        {saving ? 'Saving...' : 'Save as Draft'}
      </Button>
      <Button type="button" onClick={submitForReview} disabled={saving || !uploadedDocument?.id}>
        {saving ? 'Submitting...' : 'Submit for Review'}
      </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => navigate('/submit-paper')}
                    >
                      Start Over
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </section>
          ) : null}
        </div>

        <Card className="self-start">
          <CardHeader>
            <CardTitle>Wizard Snapshot</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div className="grid gap-2 rounded-md border border-border bg-muted/20 p-3">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs uppercase tracking-widest text-muted-foreground">Active step</span>
                <Badge variant="secondary">{steps[currentStep - 1]?.title}</Badge>
              </div>
              <p className="text-sm text-muted-foreground">Only one step is visible at a time, which keeps the flow focused and easier to scan on smaller screens.</p>
            </div>

            <div className="grid gap-2">
              {steps.map((step) => {
                const active = currentStep === step.id
                const complete = currentStep > step.id
                const accessible = isStepAccessible(step.id)

                return (
                  <button
                    key={step.id}
                    type="button"
                    onClick={() => goToStep(step.id)}
                    disabled={!accessible}
                    className={`grid gap-1 rounded-md border p-3 text-left transition-colors ${
                      active
                        ? 'border-primary bg-primary/5'
                        : complete
                          ? 'border-border bg-muted/40'
                          : 'border-border bg-background'
                    } ${accessible ? 'hover:border-primary/60' : 'cursor-not-allowed opacity-60'}`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-medium">{step.title}</span>
                      <Badge variant={active ? 'secondary' : complete ? 'success' : 'outline'}>
                        {active ? 'Now' : complete ? 'Done' : 'Locked'}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">{step.description}</p>
                  </button>
                )
              })}
            </div>

            <div className="rounded-md border border-border bg-muted/20 p-3 text-xs text-muted-foreground">
              <p>
                Draft status: {draftState}. {pendingFileMeta && !uploadedDocument?.id ? 'If upload was interrupted, reselect the file to continue. File content is never stored in local draft.' : 'Autosave stores wizard form state locally while you work.'}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </section>
  )
}
