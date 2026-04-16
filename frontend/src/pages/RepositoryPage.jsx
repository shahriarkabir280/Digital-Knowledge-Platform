import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../app/use-auth.js'
import {
  fetchMyUploads,
  openDocumentInNewTab,
  patchDocumentState,
} from '../services/api/documents.js'
import './RepositoryPage.css'

export default function RepositoryPage() {
  const { authState } = useAuth()
  const [status, setStatus] = useState('loading')
  const [items, setItems] = useState([])
  const [error, setError] = useState('')
  const [filters, setFilters] = useState({
    state: '',
    type: '',
  })

  const loadItems = async (nextFilters = filters) => {
    try {
      setStatus('loading')
      setError('')
      const result = await fetchMyUploads(nextFilters, authState.token)
      const uploads = result?.data?.items || []
      setItems(uploads)
      setStatus(uploads.length ? 'success' : 'empty')
    } catch (err) {
      setStatus('error')
      setError(err.message || 'Request failed')
    }
  }

  useEffect(() => {
    loadItems()
  }, [])

  const onFilterChange = (event) => {
    const { name, value } = event.target
    setFilters((current) => ({
      ...current,
      [name]: value,
    }))
  }

  const onApplyFilters = async () => {
    await loadItems(filters)
  }

  const onResetFilters = async () => {
    const reset = {
      state: '',
      type: '',
    }
    setFilters(reset)
    await loadItems(reset)
  }

  const onOpenDocument = async (documentId) => {
    try {
      setError('')
      await openDocumentInNewTab(documentId, authState.token)
    } catch (err) {
      setError(err.message || 'Failed to open document')
    }
  }

  const onSubmitForReview = async (documentId) => {
    try {
      setError('')
      await patchDocumentState(documentId, 'review', authState.token)
      await loadItems(filters)
    } catch (err) {
      setError(err.message || 'Failed to move document to review')
    }
  }

  const renderBadge = (state) => {
    const className = `status-badge status-badge--${state}`
    return <span className={className}>{state}</span>
  }

  return (
    <section className="page-block repository-page">
      <p className="brand-kicker">Repository</p>
      <h2>My Uploads</h2>
      <p>View and filter only the documents you uploaded.</p>

      <div className="repo-filters">
        <select name="state" value={filters.state} onChange={onFilterChange}>
          <option value="">All states</option>
          <option value="draft">draft</option>
          <option value="review">review</option>
          <option value="published">published</option>
          <option value="archived">archived</option>
        </select>

        <select name="type" value={filters.type} onChange={onFilterChange}>
          <option value="">All types</option>
          <option value="research-paper">research-paper</option>
          <option value="report">report</option>
          <option value="presentation">presentation</option>
          <option value="document">document</option>
          <option value="media">media</option>
        </select>

        <button type="button" className="ghost-btn" onClick={onApplyFilters}>
          Apply
        </button>
        <button type="button" className="ghost-btn" onClick={onResetFilters}>
          Reset
        </button>
      </div>

      {status === 'loading' && <p className="state-text">Loading uploads...</p>}
      {status === 'error' && <p className="state-error">{error}</p>}
      {status === 'empty' && (
        <p className="state-text">No uploaded documents found for current filters.</p>
      )}

      {status === 'success' && (
        <div className="upload-list">
          {items.map((item) => (
            <article key={item.id} className="upload-card">
              <div className="upload-card-head">
                <h3>
                  <button
                    type="button"
                    className="title-link-btn"
                    onClick={() => onOpenDocument(item.id)}
                  >
                    {item.title}
                  </button>
                </h3>
                {renderBadge(item.state)}
              </div>

              <div className="upload-meta">
                <span>Type: {item.type}</span>
                <span>Format: {item.format}</span>
                <span>Version: v{item.version}</span>
                <span>Access: {item.accessTier}</span>
              </div>

              <p className="upload-time">
                Uploaded: {new Date(item.createdAt).toLocaleString()}
              </p>

              <div className="upload-actions">
                {item.state === 'draft' ? (
                  <button
                    type="button"
                    className="ghost-btn"
                    onClick={() => onSubmitForReview(item.id)}
                  >
                    Submit to Review
                  </button>
                ) : null}
                <Link className="ghost-btn" to={`/submit-paper?documentId=${item.id}`}>
                  Edit Metadata
                </Link>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  )
}
