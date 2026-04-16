import { useEffect, useState } from 'react'
import { Alert } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import StateTransitionDialog from '@/components/dialogs/StateTransitionDialog'
import { useAuth } from '../app/use-auth.js'
import {
  fetchDocumentAuditLogs,
  fetchReviewQueue,
  openDocumentInNewTab,
  patchDocumentState,
} from '../services/api/documents.js'

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
  const [dialogOpen, setDialogOpen] = useState(false)
  const [dialogAction, setDialogAction] = useState(null)
  const [selectedDocumentForDialog, setSelectedDocumentForDialog] = useState(null)

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

  const onPublishClick = (documentId) => {
    const document = items.find((item) => item.id === documentId)
    setSelectedDocumentForDialog({ id: documentId, title: document?.title })
    setDialogAction('publish')
    setDialogOpen(true)
  }

  const onRejectClick = (documentId) => {
    const document = items.find((item) => item.id === documentId)
    setSelectedDocumentForDialog({ id: documentId, title: document?.title })
    setDialogAction('reject')
    setDialogOpen(true)
  }

  const onDialogConfirm = async (note) => {
    if (!selectedDocumentForDialog) return

    const { id: documentId } = selectedDocumentForDialog
    const targetState = dialogAction === 'publish' ? 'published' : 'draft'

    try {
      if (dialogAction === 'publish') {
        setPublishingId(documentId)
      } else {
        setRejectingId(documentId)
      }

      setError('')
      setDialogOpen(false)
      await patchDocumentState(documentId, targetState, authState.token, note)
      await loadQueue(type)
    } catch (err) {
      setError(err.message || 'Failed to update document state')
    } finally {
      setPublishingId(null)
      setRejectingId(null)
      setDialogAction(null)
      setSelectedDocumentForDialog(null)
    }
  }

  const onDialogCancel = () => {
    setDialogOpen(false)
    setDialogAction(null)
    setSelectedDocumentForDialog(null)
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
    <section className="mx-auto grid w-full max-w-6xl gap-4">
      <div className="grid gap-2">
        <p className="brand-kicker">Staff / Reviewer</p>
        <h2 className="text-2xl font-semibold tracking-tight">Review Queue</h2>
        <p className="text-sm text-muted-foreground">Pending submissions currently in review state.</p>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Filters</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-[minmax(0,260px)_auto_auto] sm:items-end">
          <div className="grid gap-1.5">
            <Label htmlFor="review-type-filter">Document type</Label>
            <Select
              id="review-type-filter"
              value={type}
              onChange={(event) => setType(event.target.value)}
            >
              <option value="">All types</option>
              <option value="research-paper">research-paper</option>
              <option value="report">report</option>
              <option value="presentation">presentation</option>
              <option value="document">document</option>
              <option value="media">media</option>
            </Select>
          </div>

          <Button type="button" variant="secondary" onClick={() => loadQueue(type)}>
            Apply
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              setType('')
              loadQueue('')
            }}
          >
            Reset
          </Button>
        </CardContent>
      </Card>

      {error ? <Alert variant="error">{error}</Alert> : null}
      {status === 'loading' ? <Alert>Loading review queue...</Alert> : null}
      {status === 'empty' ? <Alert>No pending submissions in review.</Alert> : null}

      {status === 'success' ? (
        <div className="grid gap-3">
          {items.map((item) => (
            <Card key={item.id}>
              <CardContent className="grid gap-3 pt-6">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="text-lg font-semibold leading-none tracking-tight">
                    <button
                      type="button"
                      className="text-left hover:underline focus-visible:underline"
                      onClick={() => onOpenDocument(item.id)}
                    >
                      {item.title}
                    </button>
                  </h3>
                  <Badge variant="warning">review</Badge>
                </div>

                <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                  <span>Type: {item.type}</span>
                  <span>Format: {item.format}</span>
                  <span>Version: v{item.version}</span>
                  <span>Uploader: {item.uploaderName || item.uploaderEmail || item.uploaderId}</span>
                  <span>Author: {item.author || 'Not provided'}</span>
                  <span>Access: {item.accessTier}</span>
                </div>

                {expandedMetadata[item.id] ? (
                  <div className="grid gap-1 rounded-md border border-border bg-muted/30 p-3 text-sm text-muted-foreground">
                    <p>
                      <strong className="text-foreground">Abstract:</strong> {item.abstract || 'Not provided'}
                    </p>
                    <p>
                      <strong className="text-foreground">Department:</strong> {item.department || 'Not provided'}
                    </p>
                    <p>
                      <strong className="text-foreground">Year:</strong> {item.year || 'Not provided'}
                    </p>
                    <p>
                      <strong className="text-foreground">Language:</strong> {item.language || 'Not provided'}
                    </p>
                    <p>
                      <strong className="text-foreground">Keywords:</strong>{' '}
                      {item.keywords && item.keywords.length > 0
                        ? item.keywords.join(', ')
                        : 'Not provided'}
                    </p>
                  </div>
                ) : null}

                {expandedAudit[item.id] ? (
                  <div className="grid gap-1 rounded-md border border-dashed border-border p-3 text-sm text-muted-foreground">
                    {auditLoadingByDocument[item.id] ? (
                      <p className="italic">Loading audit logs...</p>
                    ) : (auditByDocument[item.id] || []).length > 0 ? (
                      (auditByDocument[item.id] || []).map((log) => (
                        <p key={log.id}>
                          <strong className="text-foreground">{log.from} -&gt; {log.to}</strong> by{' '}
                          {log.changedByName || log.changedByEmail || `User ${log.changedBy}`} on{' '}
                          {new Date(log.changedAt).toLocaleString()}
                          {log.note ? ` | Note: ${log.note}` : ''}
                        </p>
                      ))
                    ) : (
                      <p className="italic">No audit logs found.</p>
                    )}
                  </div>
                ) : null}

                <p className="text-sm text-muted-foreground">
                  Submitted for review: {new Date(item.createdAt).toLocaleString()}
                </p>

                <div className="flex flex-wrap gap-2">
                  <Button type="button" variant="outline" onClick={() => toggleMetadata(item.id)}>
                    {expandedMetadata[item.id] ? 'Hide Metadata' : 'View Metadata'}
                  </Button>
                  <Button type="button" variant="outline" onClick={() => toggleAuditLogs(item.id)}>
                    {expandedAudit[item.id] ? 'Hide Audit Log' : 'View Audit Log'}
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => onPublishClick(item.id)}
                    disabled={publishingId === item.id}
                  >
                    {publishingId === item.id ? 'Publishing...' : 'Publish'}
                  </Button>
                  <Button
                    type="button"
                    variant="destructive"
                    onClick={() => onRejectClick(item.id)}
                    disabled={rejectingId === item.id}
                  >
                    {rejectingId === item.id ? 'Rejecting...' : 'Reject to Draft'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : null}

      <StateTransitionDialog
        isOpen={dialogOpen}
        action={dialogAction}
        documentTitle={selectedDocumentForDialog?.title}
        onConfirm={onDialogConfirm}
        onCancel={onDialogCancel}
        isSubmitting={publishingId !== null || rejectingId !== null}
      />
    </section>
  )
}