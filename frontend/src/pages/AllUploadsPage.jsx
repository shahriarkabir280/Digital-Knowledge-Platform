import { useEffect, useState } from 'react'
import { Alert } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import StateTransitionDialog from '@/components/dialogs/StateTransitionDialog'
import { useAuth } from '../app/use-auth.js'
import {
  fetchDocumentAuditLogs,
  fetchAllUploads,
  openDocumentInNewTab,
  patchDocumentState,
  deleteDocument,
} from '../services/api/documents.js'

const initialFilters = {
  state: '',
  type: '',
  uploaderId: '',
  accessTier: '',
  search: '',
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
  const [dialogOpen, setDialogOpen] = useState(false)
  const [dialogAction, setDialogAction] = useState(null)
  const [selectedDocumentForDialog, setSelectedDocumentForDialog] = useState(null)

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

  const onTransitionClick = (documentId, targetState) => {
    const requiresNote = targetState === 'published' || targetState === 'draft'

    if (!requiresNote) {
      // For archive, proceed directly without dialog
      onTransitionDirect(documentId, targetState)
      return
    }

    const document = items.find((item) => item.id === documentId)
    setSelectedDocumentForDialog({ id: documentId, title: document?.title, targetState })
    setDialogAction(targetState === 'published' ? 'publish' : 'reject')
    setDialogOpen(true)
  }

  const onTransitionDirect = async (documentId, targetState) => {
    const key = `${documentId}:${targetState}`

    try {
      setTransitioning((current) => ({
        ...current,
        [key]: true,
      }))
      setError('')
      await patchDocumentState(documentId, targetState, authState.token, '')
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

  const onDialogConfirm = async (note) => {
    if (!selectedDocumentForDialog) return

    const { id: documentId, targetState } = selectedDocumentForDialog
    const key = `${documentId}:${targetState}`

    try {
      setTransitioning((current) => ({
        ...current,
        [key]: true,
      }))
      setError('')
      setDialogOpen(false)
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
      setDialogAction(null)
      setSelectedDocumentForDialog(null)
    }
  }

  const onDialogCancel = () => {
    setDialogOpen(false)
    setDialogAction(null)
    setSelectedDocumentForDialog(null)
  }

  const onTransition = async (documentId, targetState) => {
    onTransitionClick(documentId, targetState)
  }

  const onDeleteDocument = async (documentId, documentTitle) => {
    if (!window.confirm(`Are you sure you want to permanently delete "${documentTitle}"? This action cannot be undone.`)) {
      return
    }

    try {
      setError('')
      await deleteDocument(documentId, authState.token)
      await loadItems(filters)
    } catch (err) {
      setError(err.message || 'Failed to delete document')
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
    if (item.state !== 'published') {
      const publishingKey = `${item.id}:published`

      return (
        <>
          <Button
            type="button"
            variant="outline"
            className="border-emerald-500/40 text-emerald-700 hover:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/30"
            onClick={() => onTransition(item.id, 'published')}
            disabled={Boolean(transitioning[publishingKey])}
          >
            {transitioning[publishingKey]
              ? 'Publishing...'
              : item.state === 'archived'
                ? 'Republish'
                : 'Publish'}
          </Button>
          {item.state === 'review' && (
            <Button
              type="button"
              variant="outline"
              className="border-red-500/40 text-red-700 hover:bg-red-500/10 dark:text-red-400 dark:border-red-500/30"
              onClick={() => onTransition(item.id, 'draft')}
              disabled={Boolean(transitioning[`${item.id}:draft`])}
            >
              {transitioning[`${item.id}:draft`] ? 'Rejecting...' : 'Reject to Draft'}
            </Button>
          )}
        </>
      )
    }

    if (item.state === 'published') {
      const archiveKey = `${item.id}:archived`

      return (
        <Button
          type="button"
          variant="outline"
          onClick={() => onTransition(item.id, 'archived')}
          disabled={Boolean(transitioning[archiveKey])}
        >
          {transitioning[archiveKey] ? 'Archiving...' : 'Archive'}
        </Button>
      )
    }

    return null
  }

  return (
    <section className="mx-auto grid w-full max-w-6xl gap-4">
      <div className="grid gap-2">
        <p className="brand-kicker">Staff / Reviewer</p>
        <h2 className="text-2xl font-semibold tracking-tight">All Uploads</h2>
        <p className="text-sm text-muted-foreground">Operational view of all uploaded documents across users.</p>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Filters</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:items-end">
          <div className="grid gap-1.5">
            <Label htmlFor="all-uploads-search">Search Title / Author / Uploader</Label>
            <Input
              id="all-uploads-search"
              type="text"
              name="search"
              value={filters.search}
              onChange={onFilterChange}
              placeholder="Search title, author, or uploader..."
            />
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="all-uploads-state">State</Label>
            <Select id="all-uploads-state" name="state" value={filters.state} onChange={onFilterChange}>
              <option value="">All states</option>
              <option value="draft">draft</option>
              <option value="review">review</option>
              <option value="published">published</option>
              <option value="archived">archived</option>
            </Select>
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="all-uploads-type">Category</Label>
            <Select id="all-uploads-type" name="type" value={filters.type} onChange={onFilterChange}>
              <option value="">All categories</option>
              <option value="research">Research</option>
              <option value="academic">Academic</option>
            </Select>
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="all-uploads-access">Access tier</Label>
            <Select id="all-uploads-access" name="accessTier" value={filters.accessTier} onChange={onFilterChange}>
              <option value="">All access tiers</option>
              <option value="PUBLIC">PUBLIC</option>
              <option value="REGISTERED">REGISTERED</option>
              <option value="RESTRICTED">RESTRICTED</option>
            </Select>
          </div>

          <div className="sm:col-span-2 md:col-span-3 lg:col-span-4 flex justify-end gap-2 pt-2 border-t border-border">
            <Button type="button" variant="outline" className="border-accent/40 text-accent hover:bg-accent/10" onClick={onApplyFilters}>
              Apply Filters
            </Button>
            <Button type="button" variant="outline" onClick={onResetFilters}>
              Reset
            </Button>
          </div>
        </CardContent>
      </Card>

      {status === 'loading' ? <Alert>Loading all uploads...</Alert> : null}
      {status === 'error' ? <Alert variant="error">{error}</Alert> : null}
      {status === 'empty' ? <Alert>No uploads found for current filters.</Alert> : null}

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
                  <Badge
                    variant={
                      item.state === 'published'
                        ? 'success'
                        : item.state === 'review'
                          ? 'warning'
                          : item.state === 'archived'
                            ? 'danger'
                            : 'secondary'
                    }
                  >
                    {item.state}
                  </Badge>
                </div>

                <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                  <span>ID: {item.id}</span>
                  <span>Type: {item.type}</span>
                  <span>Format: {item.format}</span>
                  <span>Version: v{item.version}</span>
                  <span>Access: {item.accessTier}</span>
                  <span>Uploader: {item.uploaderName || item.uploaderEmail || item.uploaderId}</span>
                  <span>Author: {item.author || 'Not provided'}</span>
                </div>

                {expandedMetadata[item.id] ? (
                  <div className="grid gap-1 rounded-md border border-border bg-muted/30 p-3 text-sm text-muted-foreground">
                    <p>
                      <strong className="text-foreground">Created:</strong> {new Date(item.createdAt).toLocaleString()}
                    </p>
                    <p>
                      <strong className="text-foreground">Updated:</strong> {new Date(item.updatedAt).toLocaleString()}
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

                <div className="flex flex-wrap gap-2">
                  <Button type="button" variant="outline" onClick={() => toggleMetadata(item.id)}>
                    {expandedMetadata[item.id] ? 'Hide Metadata' : 'View Metadata'}
                  </Button>
                  <Button type="button" variant="outline" onClick={() => toggleAuditLogs(item.id)}>
                    {expandedAudit[item.id] ? 'Hide Audit Log' : 'View Audit Log'}
                  </Button>
                  {renderStateActions(item)}
                  {authState.role === 'ADMIN' && (
                    <Button
                      type="button"
                      variant="outline"
                      className="border-red-500/40 text-red-700 hover:bg-red-500/10 dark:text-red-400 dark:border-red-500/30"
                      onClick={() => onDeleteDocument(item.id, item.title)}
                    >
                      Remove
                    </Button>
                  )}
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
        isSubmitting={Object.values(transitioning).some(Boolean)}
      />
    </section>
  )
}
