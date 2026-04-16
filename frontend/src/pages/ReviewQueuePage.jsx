import { useEffect, useState } from 'react'
import { useAuth } from '../app/use-auth.js'
import {
  fetchDocumentAuditLogs,
  fetchReviewQueue,
  openDocumentInNewTab,
  patchDocumentState,
} from '../services/api/documents.js'
import './ReviewQueuePage.css'

export default function ReviewQueuePage() {
  const { authState } = useAuth()
  const [status, setStatus] = useState('loading')
  const [items, setItems] = useState([])
  const [error, setError] = useState('')
  const [type, setType] = useState('')
  const [publishingId, setPublishingId] = useState(null)
  const [rejectingId, setRejectingId] = useState(null)
  const [expandedMetadata, setExpandedMetadata] = useState({})
  const [expandedAudit, setExpandedAudit] = useState({})
  const [auditByDocument, setAuditByDocument] = useState({})
  const [auditLoadingByDocument, setAuditLoadingByDocument] = useState({})

  const loadQueue = async (nextType = type) => {
    try {
      setStatus('loading')
      setError('')
      const result = await fetchReviewQueue({ type: nextType }, authState.token)
      const queueItems = result?.data?.items || []
      setItems(queueItems)
      setStatus(queueItems.length > 0 ? 'success' : 'empty')
    } catch (err) {
      setStatus('error')
      setError(err.message || 'Failed to load review queue')
    }
  }

  useEffect(() => {
    loadQueue()
  }, [])

  const onOpenDocument = async (documentId) => {
    try {
      setError('')
      await openDocumentInNewTab(documentId, authState.token)
    } catch (err) {
      setError(err.message || 'Failed to open document')
    }
  }

  const onPublish = async (documentId) => {
    const note = window.prompt('Publish note (required):')
    if (note === null) {
      return
    }

    if (!note.trim()) {
      setError('Publish reason is required')
      return
    }

    try {
      setPublishingId(documentId)
      setError('')
      await patchDocumentState(documentId, 'published', authState.token, note)
      await loadQueue(type)
    } catch (err) {
      setError(err.message || 'Failed to publish document')
    } finally {
      setPublishingId(null)
    }
  }

  const onReject = async (documentId) => {
    const note = window.prompt('Reject reason (required):')
    if (note === null) {
      return
    }

    if (!note.trim()) {
      setError('Reject reason is required')
      return
    }

    try {
      setRejectingId(documentId)
      setError('')
      await patchDocumentState(documentId, 'draft', authState.token, note)
      await loadQueue(type)
    } catch (err) {
      setError(err.message || 'Failed to reject document')
    } finally {
      setRejectingId(null)
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

  return (
    <section className="page-block review-queue-page">
      <p className="brand-kicker">Staff / Reviewer</p>
      <h2>Review Queue</h2>
      <p>Pending submissions currently in review state.</p>

      <div className="review-filters">
        <select value={type} onChange={(event) => setType(event.target.value)}>
          <option value="">All types</option>
          <option value="research-paper">research-paper</option>
          <option value="report">report</option>
          <option value="presentation">presentation</option>
          <option value="document">document</option>
          <option value="media">media</option>
        </select>

        <button type="button" className="ghost-btn" onClick={() => loadQueue(type)}>
          Apply
        </button>
        <button
          type="button"
          className="ghost-btn"
          onClick={() => {
            setType('')
            loadQueue('')
          }}
        >
          Reset
        </button>
      </div>

      {status === 'loading' && <p className="state-text">Loading review queue...</p>}
      {status === 'error' && <p className="state-error">{error}</p>}
      {status === 'empty' && <p className="state-text">No pending submissions in review.</p>}

      {status === 'success' && (
        <div className="review-list">
          {items.map((item) => (
            <article key={item.id} className="review-card">
              <div className="review-card-head">
                <h3>
                  <button
                    type="button"
                    className="title-link-btn"
                    onClick={() => onOpenDocument(item.id)}
                  >
                    {item.title}
                  </button>
                </h3>
                <span className="status-badge status-badge--review">review</span>
              </div>

              <div className="review-meta">
                <span>Type: {item.type}</span>
                <span>Format: {item.format}</span>
                <span>Version: v{item.version}</span>
                <span>Uploader: {item.uploaderName || item.uploaderEmail || item.uploaderId}</span>
                <span>Author: {item.author || 'Not provided'}</span>
                <span>Access: {item.accessTier}</span>
              </div>

              {expandedMetadata[item.id] ? (
                <div className="review-metadata">
                  <p>
                    <strong>Abstract:</strong> {item.abstract || 'Not provided'}
                  </p>
                  <p>
                    <strong>Department:</strong> {item.department || 'Not provided'}
                  </p>
                  <p>
                    <strong>Year:</strong> {item.year || 'Not provided'}
                  </p>
                  <p>
                    <strong>Language:</strong> {item.language || 'Not provided'}
                  </p>
                  <p>
                    <strong>Keywords:</strong>{' '}
                    {item.keywords && item.keywords.length > 0
                      ? item.keywords.join(', ')
                      : 'Not provided'}
                  </p>
                </div>
              ) : null}

              {expandedAudit[item.id] ? (
                <div className="review-audit">
                  {auditLoadingByDocument[item.id] ? (
                    <p className="review-audit-empty">Loading audit logs...</p>
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
                    <p className="review-audit-empty">No audit logs found.</p>
                  )}
                </div>
              ) : null}

              <p className="review-time">
                Submitted for review: {new Date(item.createdAt).toLocaleString()}
              </p>

              <div className="review-actions">
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
                <button
                  type="button"
                  className="ghost-btn"
                  onClick={() => onPublish(item.id)}
                  disabled={publishingId === item.id}
                >
                  {publishingId === item.id ? 'Publishing...' : 'Publish'}
                </button>
                <button
                  type="button"
                  className="ghost-btn"
                  onClick={() => onReject(item.id)}
                  disabled={rejectingId === item.id}
                >
                  {rejectingId === item.id ? 'Rejecting...' : 'Reject to Draft'}
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  )
}