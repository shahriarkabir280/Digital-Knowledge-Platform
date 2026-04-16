import { useEffect, useState } from 'react'
import { useAuth } from '../app/use-auth.js'
import {
  fetchDocumentAuditLogs,
  fetchAllUploads,
  openDocumentInNewTab,
  patchDocumentState,
} from '../services/api/documents.js'
import './AllUploadsPage.css'

const initialFilters = {
  state: '',
  type: '',
  uploaderId: '',
  accessTier: '',
}

export default function AllUploadsPage() {
  const { authState } = useAuth()
  const [status, setStatus] = useState('loading')
  const [items, setItems] = useState([])
  const [filters, setFilters] = useState(initialFilters)
  const [error, setError] = useState('')
  const [expandedMetadata, setExpandedMetadata] = useState({})
  const [expandedAudit, setExpandedAudit] = useState({})
  const [auditByDocument, setAuditByDocument] = useState({})
  const [auditLoadingByDocument, setAuditLoadingByDocument] = useState({})
  const [transitioning, setTransitioning] = useState({})

  const loadItems = async (nextFilters = filters) => {
    try {
      setStatus('loading')
      setError('')
      const result = await fetchAllUploads(nextFilters, authState.token)
      const records = result?.data?.items || []
      setItems(records)
      setStatus(records.length > 0 ? 'success' : 'empty')
    } catch (err) {
      setStatus('error')
      setError(err.message || 'Failed to load uploads')
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
    setFilters(initialFilters)
    await loadItems(initialFilters)
  }

  const onOpenDocument = async (documentId) => {
    try {
      setError('')
      await openDocumentInNewTab(documentId, authState.token)
    } catch (err) {
      setError(err.message || 'Failed to open document')
    }
  }

  const onTransition = async (documentId, targetState) => {
    const key = `${documentId}:${targetState}`
    const requiresNote = targetState === 'published' || targetState === 'draft'

    let note = ''
    if (requiresNote) {
      const promptLabel =
        targetState === 'published' ? 'Publish note (required):' : 'Reject reason (required):'
      const provided = window.prompt(promptLabel)
      if (provided === null) {
        return
      }

      note = provided.trim()
      if (!note) {
        setError(targetState === 'published' ? 'Publish reason is required' : 'Reject reason is required')
        return
      }
    }

    try {
      setTransitioning((current) => ({
        ...current,
        [key]: true,
      }))
      setError('')
      await patchDocumentState(documentId, targetState, authState.token, note)
      await loadItems(filters)
    } catch (err) {
      setError(err.message || 'Failed to update document state')
    } finally {
      setTransitioning((current) => {
        const next = { ...current }
        delete next[key]
        return next
      })
    }
  }

  const toggleMetadata = (documentId) => {
    setExpandedMetadata((current) => ({
      ...current,
      [documentId]: !current[documentId],
    }))
  }

  const toggleAuditLogs = async (documentId) => {
    const currentlyExpanded = Boolean(expandedAudit[documentId])

    if (currentlyExpanded) {
      setExpandedAudit((current) => ({
        ...current,
        [documentId]: false,
      }))
      return
    }

    if (!auditByDocument[documentId]) {
      try {
        setAuditLoadingByDocument((current) => ({
          ...current,
          [documentId]: true,
        }))
        const result = await fetchDocumentAuditLogs(documentId, authState.token)
        setAuditByDocument((current) => ({
          ...current,
          [documentId]: result?.data?.items || [],
        }))
      } catch (err) {
        setError(err.message || 'Failed to load audit logs')
      } finally {
        setAuditLoadingByDocument((current) => ({
          ...current,
          [documentId]: false,
        }))
      }
    }

    setExpandedAudit((current) => ({
      ...current,
      [documentId]: true,
    }))
  }

  const renderStateActions = (item) => {
    if (item.state === 'review') {
      const publishingKey = `${item.id}:published`
      const rejectingKey = `${item.id}:draft`

      return (
        <>
          <button
            type="button"
            className="ghost-btn"
            onClick={() => onTransition(item.id, 'published')}
            disabled={Boolean(transitioning[publishingKey])}
          >
            {transitioning[publishingKey] ? 'Publishing...' : 'Publish'}
          </button>
          <button
            type="button"
            className="ghost-btn"
            onClick={() => onTransition(item.id, 'draft')}
            disabled={Boolean(transitioning[rejectingKey])}
          >
            {transitioning[rejectingKey] ? 'Rejecting...' : 'Reject to Draft'}
          </button>
        </>
      )
    }

    if (item.state === 'published') {
      const archiveKey = `${item.id}:archived`

      return (
        <button
          type="button"
          className="ghost-btn"
          onClick={() => onTransition(item.id, 'archived')}
          disabled={Boolean(transitioning[archiveKey])}
        >
          {transitioning[archiveKey] ? 'Archiving...' : 'Archive'}
        </button>
      )
    }

    return null
  }

  return (
    <section className="page-block all-uploads-page">
      <p className="brand-kicker">Staff / Reviewer</p>
      <h2>All Uploads</h2>
      <p>Operational view of all uploaded documents across users.</p>

      <div className="all-uploads-filters">
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

        <select name="accessTier" value={filters.accessTier} onChange={onFilterChange}>
          <option value="">All access tiers</option>
          <option value="PUBLIC">PUBLIC</option>
          <option value="REGISTERED">REGISTERED</option>
          <option value="RESTRICTED">RESTRICTED</option>
        </select>

        <input
          type="number"
          min="1"
          name="uploaderId"
          value={filters.uploaderId}
          onChange={onFilterChange}
          placeholder="Uploader ID"
        />

        <button type="button" className="ghost-btn" onClick={onApplyFilters}>
          Apply
        </button>
        <button type="button" className="ghost-btn" onClick={onResetFilters}>
          Reset
        </button>
      </div>

      {status === 'loading' && <p className="state-text">Loading all uploads...</p>}
      {status === 'error' && <p className="state-error">{error}</p>}
      {status === 'empty' && <p className="state-text">No uploads found for current filters.</p>}

      {status === 'success' && (
        <div className="all-uploads-list">
          {items.map((item) => (
            <article key={item.id} className="all-uploads-card">
              <div className="all-uploads-card-head">
                <h3>
                  <button
                    type="button"
                    className="title-link-btn"
                    onClick={() => onOpenDocument(item.id)}
                  >
                    {item.title}
                  </button>
                </h3>
                <span className={`status-badge status-badge--${item.state}`}>{item.state}</span>
              </div>

              <div className="all-uploads-meta">
                <span>ID: {item.id}</span>
                <span>Type: {item.type}</span>
                <span>Format: {item.format}</span>
                <span>Version: v{item.version}</span>
                <span>Access: {item.accessTier}</span>
                <span>Uploader: {item.uploaderName || item.uploaderEmail || item.uploaderId}</span>
                <span>Author: {item.author || 'Not provided'}</span>
              </div>

              {expandedMetadata[item.id] ? (
                <div className="all-uploads-metadata">
                  <p>
                    <strong>Created:</strong> {new Date(item.createdAt).toLocaleString()}
                  </p>
                  <p>
                    <strong>Updated:</strong> {new Date(item.updatedAt).toLocaleString()}
                  </p>
                </div>
              ) : null}

              {expandedAudit[item.id] ? (
                <div className="all-uploads-audit">
                  {auditLoadingByDocument[item.id] ? (
                    <p className="all-uploads-audit-empty">Loading audit logs...</p>
                  ) : (auditByDocument[item.id] || []).length > 0 ? (
                    (auditByDocument[item.id] || []).map((log) => (
                      <p key={log.id}>
                        <strong>{log.from} -&gt; {log.to}</strong> by{' '}
                        {log.changedByName || log.changedByEmail || `User ${log.changedBy}`} on{' '}
                        {new Date(log.changedAt).toLocaleString()}
                        {log.note ? ` | Note: ${log.note}` : ''}
                      </p>
                    ))
                  ) : (
                    <p className="all-uploads-audit-empty">No audit logs found.</p>
                  )}
                </div>
              ) : null}

              <div className="all-uploads-actions">
                <button
                  type="button"
                  className="ghost-btn"
                  onClick={() => toggleMetadata(item.id)}
                >
                  {expandedMetadata[item.id] ? 'Hide Metadata' : 'View Metadata'}
                </button>
                <button
                  type="button"
                  className="ghost-btn"
                  onClick={() => toggleAuditLogs(item.id)}
                >
                  {expandedAudit[item.id] ? 'Hide Audit Log' : 'View Audit Log'}
                </button>
                {renderStateActions(item)}
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  )
}
