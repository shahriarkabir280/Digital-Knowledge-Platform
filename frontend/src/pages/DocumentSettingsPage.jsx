import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Alert } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { useAuth } from '../app/use-auth.js'
import {
  getDocumentMetadata,
  saveDocumentMetadata,
  patchDocumentState,
  replaceDocumentFile,
  deleteDocument,
} from '../services/api/documents.js'
import {
  ArrowLeft, Loader2, Save, PauseCircle, SendHorizontal, UploadCloud, Trash2, AlertCircle,
} from 'lucide-react'

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

const STATE_BADGES = {
  draft: 'bg-slate-500/10 text-slate-600 border-slate-500/20',
  pending: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
  review: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
  published: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
  paused: 'bg-orange-500/10 text-orange-600 border-orange-500/20',
  archived: 'bg-muted text-muted-foreground border-border',
}

function getCurrentYear() {
  return new Date().getFullYear()
}

function splitKeywords(value) {
  return value.split(',').map((keyword) => keyword.trim()).filter(Boolean)
}

const emptyForm = {
  title: '',
  author: '',
  abstract: '',
  keywords: '',
  language: 'English',
  year: String(getCurrentYear()),
  department: '',
  course: '',
  accessTier: 'REGISTERED',
}

export default function DocumentSettingsPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { authState } = useAuth()

  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [document, setDocument] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [message, setMessage] = useState(null)

  const [saving, setSaving] = useState(false)
  const [transitioning, setTransitioning] = useState(false)
  const [pauseNote, setPauseNote] = useState('')

  const [selectedFile, setSelectedFile] = useState(null)
  const [replacingFile, setReplacingFile] = useState(false)
  const fileInputRef = useRef(null)

  const [deleting, setDeleting] = useState(false)
  const [confirmingDelete, setConfirmingDelete] = useState(false)

  const loadDocument = async () => {
    const result = await getDocumentMetadata(id, authState.token)
    const doc = result?.data?.document || null
    const meta = result?.data?.metadata || null
    setDocument(doc)
    setForm({
      title: meta?.title || doc?.title || '',
      author: meta?.author || '',
      abstract: meta?.abstract || '',
      keywords: Array.isArray(meta?.keywords) ? meta.keywords.join(', ') : '',
      language: meta?.language || 'English',
      year: meta?.year ? String(meta.year) : String(getCurrentYear()),
      department: meta?.department || '',
      course: meta?.course || '',
      accessTier: meta?.accessTier || doc?.accessTier || 'REGISTERED',
    })
  }

  useEffect(() => {
    let isMounted = true

    const run = async () => {
      try {
        setLoading(true)
        setLoadError('')
        await loadDocument()
      } catch (error) {
        if (isMounted) setLoadError(error.message || 'Failed to load this document.')
      } finally {
        if (isMounted) setLoading(false)
      }
    }

    run()
    return () => { isMounted = false }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, authState.token])

  const keywordList = useMemo(() => splitKeywords(form.keywords), [form.keywords])

  const handleChange = (event) => {
    const { name, value } = event.target
    setForm((current) => ({ ...current, [name]: value }))
  }

  const handleSaveMetadata = async (event) => {
    event.preventDefault()
    setMessage(null)

    if (!form.title.trim() || !form.author.trim() || !form.abstract.trim()) {
      setMessage({ type: 'error', text: 'Title, author, and abstract are required.' })
      return
    }
    if (keywordList.length === 0) {
      setMessage({ type: 'error', text: 'Add at least one keyword.' })
      return
    }

    const payload = {
      title: form.title.trim(),
      author: form.author.trim(),
      abstract: form.abstract.trim(),
      keywords: keywordList,
      language: form.language,
      year: Number(form.year),
      department: form.department.trim() || undefined,
      course: form.course.trim() || undefined,
      accessTier: form.accessTier,
    }

    try {
      setSaving(true)
      await saveDocumentMetadata(id, payload, authState.token)
      setMessage({ type: 'success', text: 'Changes saved.' })
    } catch (error) {
      setMessage({ type: 'error', text: error.message || 'Failed to save changes.' })
    } finally {
      setSaving(false)
    }
  }

  const handlePause = async () => {
    if (!pauseNote.trim()) {
      setMessage({ type: 'error', text: 'Add a short reason for pausing this document — it helps reviewers when you resubmit it.' })
      return
    }

    try {
      setTransitioning(true)
      setMessage(null)
      await patchDocumentState(id, 'paused', authState.token, pauseNote.trim())
      setPauseNote('')
      setMessage({ type: 'success', text: 'Paused. This document is now hidden from the library while you make changes.' })
      await loadDocument()
    } catch (error) {
      setMessage({ type: 'error', text: error.message || 'Failed to pause this document.' })
    } finally {
      setTransitioning(false)
    }
  }

  const handleSubmitForReview = async () => {
    try {
      setTransitioning(true)
      setMessage(null)
      await patchDocumentState(id, 'review', authState.token)
      setMessage({ type: 'success', text: 'Submitted for review.' })
      await loadDocument()
    } catch (error) {
      setMessage({ type: 'error', text: error.message || 'Failed to submit for review.' })
    } finally {
      setTransitioning(false)
    }
  }

  const handleReplaceFile = async () => {
    if (!selectedFile) return

    try {
      setReplacingFile(true)
      setMessage(null)
      await replaceDocumentFile(id, selectedFile, authState.token)
      setSelectedFile(null)
      if (fileInputRef.current) fileInputRef.current.value = ''
      setMessage({ type: 'success', text: 'File replaced — a new version has been recorded.' })
      await loadDocument()
    } catch (error) {
      setMessage({ type: 'error', text: error.message || 'Failed to replace the file.' })
    } finally {
      setReplacingFile(false)
    }
  }

  const handleDelete = async () => {
    try {
      setDeleting(true)
      await deleteDocument(id, authState.token)
      navigate('/dashboard', { replace: true })
    } catch (error) {
      setMessage({ type: 'error', text: error.message || 'Failed to delete this document.' })
      setDeleting(false)
      setConfirmingDelete(false)
    }
  }

  if (loading) {
    return (
      <section className="mx-auto grid w-full max-w-3xl gap-4 p-4">
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-7 w-7 animate-spin text-muted-foreground" />
        </div>
      </section>
    )
  }

  if (loadError) {
    return (
      <section className="mx-auto grid w-full max-w-3xl gap-4 p-4">
        <div className="flex items-center gap-3 rounded-lg border border-red-500/20 bg-red-500/10 p-4">
          <AlertCircle className="h-5 w-5 shrink-0 text-red-600" />
          <div>
            <p className="font-semibold text-red-600">Couldn't load this document</p>
            <p className="text-sm text-red-600">{loadError}</p>
          </div>
        </div>
        <Link to="/dashboard" className="text-sm font-semibold text-[hsl(var(--primary))] hover:underline">
          &larr; Back to dashboard
        </Link>
      </section>
    )
  }

  const state = document?.state
  const canReplaceFile = state === 'draft' || state === 'paused'
  const canPause = state === 'published'
  const readOnlyNotice = state === 'pending' || state === 'review' || state === 'archived'

  return (
    <section className="mx-auto grid w-full max-w-3xl gap-4">
      <div className="grid gap-1">
        <Link to="/dashboard" className="flex w-fit items-center gap-1 text-xs font-semibold text-muted-foreground hover:text-foreground">
          <ArrowLeft size={13} /> Back to dashboard
        </Link>
        <div className="flex flex-wrap items-center gap-2 pt-1">
          <h2 className="text-2xl font-semibold tracking-tight">Document settings</h2>
          {state && (
            <Badge className={`border text-[10px] font-bold uppercase ${STATE_BADGES[state] || ''}`}>
              {state}
            </Badge>
          )}
        </div>
        <p className="text-sm text-muted-foreground">
          Update this submission's details and access level. Document #{id}.
        </p>
      </div>

      {message && (
        <Alert variant={message.type === 'success' ? 'success' : 'error'}>{message.text}</Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Metadata</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSaveMetadata} className="grid gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="title">Title *</Label>
              <Input id="title" name="title" value={form.title} onChange={handleChange} placeholder="Document title" />
            </div>

            <div className="grid gap-1.5">
              <Label htmlFor="author">Author *</Label>
              <Input id="author" name="author" value={form.author} onChange={handleChange} placeholder="Primary author or contributor" />
            </div>

            <div className="grid gap-1.5">
              <Label htmlFor="abstract">Abstract *</Label>
              <Textarea id="abstract" name="abstract" rows={6} value={form.abstract} onChange={handleChange} placeholder="Short summary of the document" />
            </div>

            <div className="grid gap-1.5">
              <Label htmlFor="keywords">Keywords *</Label>
              <Input id="keywords" name="keywords" value={form.keywords} onChange={handleChange} placeholder="digital library, archive, metadata" />
              <p className="text-xs text-muted-foreground">Separate keywords with commas.</p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="grid gap-1.5">
                <Label htmlFor="language">Language</Label>
                <Select id="language" name="language" value={form.language} onChange={handleChange}>
                  {languageOptions.map((language) => (
                    <option key={language} value={language}>{language}</option>
                  ))}
                </Select>
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="year">Year</Label>
                <Input id="year" name="year" type="number" min="1900" max={getCurrentYear() + 1} value={form.year} onChange={handleChange} />
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="grid gap-1.5">
                <Label htmlFor="department">Department</Label>
                <Select id="department" name="department" value={form.department} onChange={handleChange}>
                  <option value="">Not set</option>
                  {departmentOptions.map((department) => (
                    <option key={department} value={department}>{department}</option>
                  ))}
                </Select>
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="course">Course code</Label>
                <Input id="course" name="course" value={form.course} onChange={handleChange} placeholder="e.g. CSE-401 or N/A" />
              </div>
            </div>

            <div className="grid gap-1.5">
              <Label htmlFor="accessTier">Access tier</Label>
              <Select id="accessTier" name="accessTier" value={form.accessTier} onChange={handleChange}>
                {accessTierOptions.map((tier) => (
                  <option key={tier.value} value={tier.value}>{tier.label}</option>
                ))}
              </Select>
            </div>

            <div>
              <Button type="submit" disabled={saving} className="gap-1.5">
                {saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
                {saving ? 'Saving...' : 'Save changes'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {canReplaceFile && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">File</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3">
            <p className="text-sm text-muted-foreground">
              Replace the uploaded file. This creates a new version of the same document.
            </p>
            <input
              ref={fileInputRef}
              type="file"
              onChange={(event) => setSelectedFile(event.target.files?.[0] || null)}
              className="text-sm"
            />
            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                variant="outline"
                disabled={!selectedFile || replacingFile}
                onClick={handleReplaceFile}
                className="gap-1.5"
              >
                {replacingFile ? <Loader2 size={15} className="animate-spin" /> : <UploadCloud size={15} />}
                {replacingFile ? 'Replacing...' : 'Replace file'}
              </Button>

              <Button
                type="button"
                disabled={transitioning}
                onClick={handleSubmitForReview}
                className="gap-1.5"
              >
                {transitioning ? <Loader2 size={15} className="animate-spin" /> : <SendHorizontal size={15} />}
                {state === 'paused' ? 'Resubmit for review' : 'Submit for review'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {canPause && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Make changes to this published document</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3">
            <p className="text-sm text-muted-foreground">
              This document is live. To edit the file or make substantial changes, pause it first —
              it will be hidden from the library until you resubmit it and it's re-approved.
            </p>
            <div className="grid gap-1.5">
              <Label htmlFor="pauseNote">Reason for pausing *</Label>
              <Textarea
                id="pauseNote"
                rows={2}
                value={pauseNote}
                onChange={(event) => setPauseNote(event.target.value)}
                placeholder="e.g. Fixing a data error in Table 3 before resubmitting"
              />
            </div>
            <div>
              <Button type="button" variant="outline" disabled={transitioning} onClick={handlePause} className="gap-1.5">
                {transitioning ? <Loader2 size={15} className="animate-spin" /> : <PauseCircle size={15} />}
                {transitioning ? 'Pausing...' : 'Pause to make changes'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {readOnlyNotice && (
        <Alert>
          {state === 'archived'
            ? 'This document is archived. You can still update its metadata above.'
            : "This document is currently in the moderation queue. You can update its metadata above, but it can't be paused or resubmitted until moderation finishes."}
        </Alert>
      )}

      <Card className="border-red-500/20">
        <CardHeader>
          <CardTitle className="text-base text-red-600">Danger zone</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3">
          <p className="text-sm text-muted-foreground">
            Permanently delete this document and its file. This cannot be undone.
          </p>
          {!confirmingDelete ? (
            <div>
              <Button type="button" variant="outline" className="gap-1.5 border-red-500/30 text-red-600 hover:bg-red-500/10" onClick={() => setConfirmingDelete(true)}>
                <Trash2 size={15} /> Delete this document
              </Button>
            </div>
          ) : (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-medium text-red-600">Are you sure? This is permanent.</span>
              <Button type="button" disabled={deleting} className="gap-1.5 bg-red-600 hover:bg-red-600/90" onClick={handleDelete}>
                {deleting ? <Loader2 size={15} className="animate-spin" /> : <Trash2 size={15} />}
                {deleting ? 'Deleting...' : 'Yes, delete it'}
              </Button>
              <Button type="button" variant="outline" disabled={deleting} onClick={() => setConfirmingDelete(false)}>
                Cancel
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </section>
  )
}
