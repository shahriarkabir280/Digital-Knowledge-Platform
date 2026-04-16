import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useAuth } from '../app/use-auth.js'
import { fetchMyUploads, saveDocumentMetadata } from '../services/api/documents.js'
import './MetadataFormPage.css'

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

        if (!isMounted) {
          return
        }

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
        if (!isMounted) {
          return
        }
        setMessage(error.message || 'Failed to load your uploaded documents.')
      } finally {
        if (isMounted) {
          setLoadingDocs(false)
        }
      }
    }

    loadDocuments()

    return () => {
      isMounted = false
    }
  }, [authState.token, searchParams])

  useEffect(() => {
    const selected = documents.find((item) => String(item.id) === String(selectedDocumentId))
    if (!selected) {
      return
    }

    setForm((current) => ({
      ...current,
      title: current.title || selected.title || '',
      year: current.year || String(getCurrentYear()),
    }))
  }, [documents, selectedDocumentId])

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
    <section className="page-block metadata-form-page">
      <div className="metadata-hero">
        <div>
          <p className="brand-kicker">Repository Submission</p>
          <h2>Metadata Form</h2>
          <p>
            Capture the core descriptive fields for a document before it is
            published or reviewed.
          </p>
        </div>

        <div className="metadata-progress-card">
          <span className="metadata-progress-label">Form completeness</span>
          <strong>{completion}%</strong>
          <div className="metadata-progress-track" aria-hidden="true">
            <span style={{ width: `${completion}%` }} />
          </div>
          <p>Basic metadata fields for the first submission step.</p>
        </div>
      </div>

      <form className="metadata-form" onSubmit={handleSubmit}>
        <div className="metadata-grid">
          <div className="metadata-card metadata-card--form">
            <h3>Basic Metadata</h3>

            <label htmlFor="documentId">Select Uploaded Document *</label>
            <select
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
            </select>
            <p className="field-hint">
              {loadingDocs
                ? 'Loading your uploaded documents...'
                : 'Metadata will be saved against the selected document ID.'}
            </p>

            <label htmlFor="title">Title *</label>
            <input
              id="title"
              name="title"
              type="text"
              value={form.title}
              onChange={handleChange}
              placeholder="Enter the document title"
            />

            <label htmlFor="author">Author *</label>
            <input
              id="author"
              name="author"
              type="text"
              value={form.author}
              onChange={handleChange}
              placeholder="Primary author or contributor"
            />

            <label htmlFor="abstract">Abstract *</label>
            <textarea
              id="abstract"
              name="abstract"
              rows={6}
              value={form.abstract}
              onChange={handleChange}
              placeholder="Write a short summary of the document"
            />

            <label htmlFor="keywords">Keywords *</label>
            <input
              id="keywords"
              name="keywords"
              type="text"
              value={form.keywords}
              onChange={handleChange}
              placeholder="digital library, archive, metadata"
            />
            <p className="field-hint">Separate keywords with commas.</p>

            <div className="two-column-fields">
              <div>
                <label htmlFor="language">Language</label>
                <select id="language" name="language" value={form.language} onChange={handleChange}>
                  {languageOptions.map((language) => (
                    <option key={language} value={language}>
                      {language}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="year">Year</label>
                <input
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

            <label htmlFor="department">Department</label>
            <select id="department" name="department" value={form.department} onChange={handleChange}>
              {departmentOptions.map((department) => (
                <option key={department} value={department}>
                  {department}
                </option>
              ))}
            </select>

            <label htmlFor="accessTier">Access Tier</label>
            <select id="accessTier" name="accessTier" value={form.accessTier} onChange={handleChange}>
              {accessTierOptions.map((tier) => (
                <option key={tier} value={tier}>
                  {tier}
                </option>
              ))}
            </select>

            <div className="metadata-actions">
              <button
                type="submit"
                className="primary-btn"
                disabled={saving || loadingDocs || documents.length === 0}
              >
                {saving ? 'Saving...' : 'Save Metadata'}
              </button>
              <p className="field-hint">
                This updates the selected document metadata in backend.
              </p>
            </div>

            {message ? <p className="metadata-message">{message}</p> : null}
          </div>

          <aside className="metadata-card metadata-card--summary">
            <h3>Live Preview</h3>
            <div className="summary-block">
              <span>Linked document</span>
              <strong>{selectedDocumentId ? `#${selectedDocumentId}` : 'No document selected'}</strong>
            </div>
            <div className="summary-block">
              <span>Title</span>
              <strong>{form.title || 'Untitled document'}</strong>
            </div>
            <div className="summary-block">
              <span>Author</span>
              <strong>{form.author || 'No author set'}</strong>
            </div>
            <div className="summary-block">
              <span>Language</span>
              <strong>{form.language}</strong>
            </div>
            <div className="summary-block">
              <span>Year</span>
              <strong>{form.year || '----'}</strong>
            </div>
            <div className="summary-block">
              <span>Department</span>
              <strong>{form.department}</strong>
            </div>
            <div className="summary-block">
              <span>Access tier</span>
              <strong>{form.accessTier}</strong>
            </div>

            <div className="summary-block summary-block--stacked">
              <span>Abstract preview</span>
              <p>{form.abstract || 'Your abstract will appear here.'}</p>
            </div>

            <div className="summary-block summary-block--stacked">
              <span>Keywords</span>
              <div className="keyword-chips">
                {keywordList.length > 0 ? (
                  keywordList.map((keyword) => <span key={keyword}>{keyword}</span>)
                ) : (
                  <span className="keyword-placeholder">No keywords yet</span>
                )}
              </div>
            </div>

            <div className="summary-note">
              <p>
                This page establishes the basic metadata layer. The next step can
                connect it to the save endpoint and document upload flow.
              </p>
            </div>
          </aside>
        </div>
      </form>
    </section>
  )
}