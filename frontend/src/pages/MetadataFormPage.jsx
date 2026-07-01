import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Alert } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { useAuth } from '../app/use-auth.js'
import { fetchMyUploads, saveDocumentMetadata, getDocumentMetadata } from '../services/api/documents.js'

const languageOptions = ['English', 'Bangla', 'Arabic', 'Hindi', 'Other']

const accessTierOptions = [
  'PUBLIC',
  'REGISTERED',
  'RESTRICTED',
  'PRIVATE',
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

export default function MetadataFormPage() {
  const { authState } = useAuth()
  const [searchParams] = useSearchParams()
  const [documents, setDocuments] = useState([])
  const [selectedDocumentId, setSelectedDocumentId] = useState('')
  const [loadingDocs, setLoadingDocs] = useState(true)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    title: '',
    author: authState.name || '',
    abstract: '',
    keywords: '',
    language: 'English',
    year: String(getCurrentYear()),
    department: 'Computer Science and Engineering',
    accessTier: 'REGISTERED',
  })
  const [message, setMessage] = useState('')

  useEffect(() => {
    let isMounted = true

    const loadDocuments = async () => {
      try {
        setLoadingDocs(true)
        const result = await fetchMyUploads({}, authState.token)
        const uploads = result?.data?.items || []

        if (!isMounted) return

        setDocuments(uploads)

        if (uploads.length === 0) {
          setSelectedDocumentId('')
          return
        }

        const queryDocumentId = searchParams.get('documentId')
        const matchedFromQuery = uploads.find(
          (item) => String(item.id) === String(queryDocumentId),
        )

        const preferred = matchedFromQuery || uploads[0]
        setSelectedDocumentId(String(preferred.id))
        setForm((current) => ({
          ...current,
          title: current.title || preferred.title || '',
        }))
      } catch (error) {
        if (!isMounted) return
        setMessage(error.message || 'Failed to load your uploaded documents.')
      } finally {
        if (isMounted) setLoadingDocs(false)
      }
    }

    loadDocuments()

    return () => {
      isMounted = false
    }
  }, [authState.token, searchParams])

  useEffect(() => {
    const selected = documents.find((item) => String(item.id) === String(selectedDocumentId))
    if (!selected) return

    // Load basic document info
    setForm((current) => ({
      ...current,
      title: current.title || selected.title || '',
      year: current.year || String(getCurrentYear()),
    }))

    // Fetch existing metadata if available
    const loadExistingMetadata = async () => {
      try {
        const result = await getDocumentMetadata(selectedDocumentId, authState.token)
        if (result?.data?.metadata) {
          const meta = result.data.metadata
          // Prepopulate form with existing metadata
          setForm((current) => ({
            ...current,
            title: meta.title || current.title || '',
            author: meta.author || current.author || '',
            abstract: meta.abstract || current.abstract || '',
            keywords: Array.isArray(meta.keywords) ? meta.keywords.join(', ') : current.keywords || '',
            language: meta.language || current.language || 'English',
            year: meta.year ? String(meta.year) : current.year || String(getCurrentYear()),
            department: meta.department || current.department || '',
            accessTier: meta.accessTier || current.accessTier || 'REGISTERED',
          }))
        }
      } catch (_error) {
        // Metadata might not exist yet, which is OK
        // Form will use default values
      }
    }

    loadExistingMetadata()
  }, [documents, selectedDocumentId, authState.token])

  const keywordList = useMemo(() => splitKeywords(form.keywords), [form.keywords])

  const completion = useMemo(() => {
    const requiredFields = [
      form.title,
      form.author,
      form.abstract,
      form.keywords,
      form.language,
      form.year,
      form.department,
      form.accessTier,
    ]

    const completeCount = requiredFields.filter((value) => String(value).trim()).length
    return Math.round((completeCount / requiredFields.length) * 100)
  }, [form])

  const handleChange = (event) => {
    const { name, value } = event.target
    setForm((current) => ({
      ...current,
      [name]: value,
    }))
    setMessage('')
  }

  const handleSubmit = async (event) => {
    event.preventDefault()

    if (!selectedDocumentId) {
      setMessage('Select a document first. This metadata must be linked to one uploaded file.')
      return
    }

    if (!form.title.trim() || !form.author.trim() || !form.abstract.trim()) {
      setMessage('Please complete the required title, author, and abstract fields.')
      return
    }

    if (keywordList.length === 0) {
      setMessage('Add at least one keyword separated by commas.')
      return
    }

    const payload = {
      title: form.title,
      author: form.author,
      abstract: form.abstract,
      keywords: keywordList,
      language: form.language,
      year: Number(form.year),
      department: form.department,
      accessTier: form.accessTier,
    }

    try {
      setSaving(true)
      await saveDocumentMetadata(selectedDocumentId, payload, authState.token)
      setMessage(`Metadata saved for document #${selectedDocumentId}.`)
    } catch (error) {
      setMessage(error.message || 'Failed to save metadata.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="mx-auto grid w-full max-w-6xl gap-4">
      <div className="grid gap-4 lg:grid-cols-[1fr_320px] lg:items-start">
        <div className="grid gap-2">
          <p className="brand-kicker">Repository Submission</p>
          <h2 className="text-2xl font-semibold tracking-tight">Metadata Form</h2>
          <p className="text-sm text-muted-foreground">
            Capture the core descriptive fields for a document before it is
            published or reviewed.
          </p>
        </div>

        <Card>
          <CardContent className="grid gap-2 p-4">
            <span className="text-xs uppercase tracking-widest text-muted-foreground">Form completeness</span>
            <strong className="text-2xl">{completion}%</strong>
            <div className="h-2 w-full rounded-full bg-muted" aria-hidden="true">
              <span
                className="block h-full rounded-full bg-primary transition-all duration-300"
                style={{ width: `${completion}%` }}
              />
            </div>
            <p className="text-xs text-muted-foreground">Basic metadata fields for the first submission step.</p>
          </CardContent>
        </Card>
      </div>

      <form className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px]" onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <CardTitle>Basic Metadata</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="documentId">Select Uploaded Document *</Label>
              <Select
                id="documentId"
                name="documentId"
                value={selectedDocumentId}
                onChange={(event) => {
                  setSelectedDocumentId(event.target.value)
                  setMessage('')
                }}
                disabled={loadingDocs || documents.length === 0 || saving}
              >
                {documents.length === 0 ? (
                  <option value="">No uploaded documents found</option>
                ) : (
                  documents.map((item) => (
                    <option key={item.id} value={item.id}>
                      #{item.id} - {item.title} ({item.state})
                    </option>
                  ))
                )}
              </Select>
              <p className="text-xs text-muted-foreground">
                {loadingDocs
                  ? 'Loading your uploaded documents...'
                  : 'Metadata will be saved against the selected document ID.'}
              </p>
            </div>

            <div className="grid gap-1.5">
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                name="title"
                type="text"
                value={form.title}
                onChange={handleChange}
                placeholder="Enter the document title"
              />
            </div>

            <div className="grid gap-1.5">
              <Label htmlFor="author">Author *</Label>
              <Input
                id="author"
                name="author"
                type="text"
                value={form.author}
                onChange={handleChange}
                placeholder="Primary author or contributor"
              />
            </div>

            <div className="grid gap-1.5">
              <Label htmlFor="abstract">Abstract *</Label>
              <textarea
                id="abstract"
                name="abstract"
                rows={6}
                value={form.abstract}
                onChange={handleChange}
                placeholder="Write a short summary of the document"
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none"
              />
            </div>

            <div className="grid gap-1.5">
              <Label htmlFor="keywords">Keywords *</Label>
              <Input
                id="keywords"
                name="keywords"
                type="text"
                value={form.keywords}
                onChange={handleChange}
                placeholder="digital library, archive, metadata"
              />
              <p className="text-xs text-muted-foreground">Separate keywords with commas.</p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="grid gap-1.5">
                <Label htmlFor="language">Language</Label>
                <Select id="language" name="language" value={form.language} onChange={handleChange}>
                  {languageOptions.map((language) => (
                    <option key={language} value={language}>
                      {language}
                    </option>
                  ))}
                </Select>
              </div>

              <div className="grid gap-1.5">
                <Label htmlFor="year">Year</Label>
                <Input
                  id="year"
                  name="year"
                  type="number"
                  min="1900"
                  max={getCurrentYear() + 1}
                  value={form.year}
                  onChange={handleChange}
                />
              </div>
            </div>

            <div className="grid gap-1.5">
              <Label htmlFor="department">Department</Label>
              <Select id="department" name="department" value={form.department} onChange={handleChange}>
                {departmentOptions.map((department) => (
                  <option key={department} value={department}>
                    {department}
                  </option>
                ))}
              </Select>
            </div>

            <div className="grid gap-1.5">
              <Label htmlFor="accessTier">Access Tier</Label>
              <Select id="accessTier" name="accessTier" value={form.accessTier} onChange={handleChange}>
                {accessTierOptions.map((tier) => (
                  <option key={tier} value={tier}>
                    {tier}
                  </option>
                ))}
              </Select>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="submit"
                disabled={saving || loadingDocs || documents.length === 0}
              >
                {saving ? 'Saving...' : 'Save Metadata'}
              </Button>
              <p className="text-xs text-muted-foreground">
                This updates the selected document metadata in backend.
              </p>
            </div>

            {message ? (
              <Alert variant={message.startsWith('Metadata saved') ? 'success' : 'error'}>{message}</Alert>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Live Preview</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 text-sm">
            <div className="flex items-center justify-between gap-2 rounded-md border border-border p-2">
              <span className="text-muted-foreground">Linked document</span>
              <Badge variant="outline">{selectedDocumentId ? `#${selectedDocumentId}` : 'None'}</Badge>
            </div>

            <div className="grid gap-1 rounded-md border border-border p-3">
              <span className="text-xs uppercase tracking-wide text-muted-foreground">Title</span>
              <strong>{form.title || 'Untitled document'}</strong>
            </div>

            <div className="grid gap-1 rounded-md border border-border p-3">
              <span className="text-xs uppercase tracking-wide text-muted-foreground">Author</span>
              <strong>{form.author || 'No author set'}</strong>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="grid gap-1 rounded-md border border-border p-3">
                <span className="text-xs uppercase tracking-wide text-muted-foreground">Language</span>
                <strong>{form.language}</strong>
              </div>
              <div className="grid gap-1 rounded-md border border-border p-3">
                <span className="text-xs uppercase tracking-wide text-muted-foreground">Year</span>
                <strong>{form.year || '----'}</strong>
              </div>
            </div>

            <div className="grid gap-1 rounded-md border border-border p-3">
              <span className="text-xs uppercase tracking-wide text-muted-foreground">Department</span>
              <strong>{form.department}</strong>
            </div>

            <div className="grid gap-1 rounded-md border border-border p-3">
              <span className="text-xs uppercase tracking-wide text-muted-foreground">Access Tier</span>
              <strong>{form.accessTier}</strong>
            </div>

            <div className="grid gap-1 rounded-md border border-border p-3">
              <span className="text-xs uppercase tracking-wide text-muted-foreground">Abstract Preview</span>
              <p className="text-muted-foreground">{form.abstract || 'Your abstract will appear here.'}</p>
            </div>

            <div className="grid gap-2 rounded-md border border-border p-3">
              <span className="text-xs uppercase tracking-wide text-muted-foreground">Keywords</span>
              <div className="flex flex-wrap gap-1.5">
                {keywordList.length > 0 ? (
                  keywordList.map((keyword) => (
                    <Badge key={keyword} variant="secondary">{keyword}</Badge>
                  ))
                ) : (
                  <span className="text-xs text-muted-foreground">No keywords yet</span>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </form>
    </section>
  )
}
