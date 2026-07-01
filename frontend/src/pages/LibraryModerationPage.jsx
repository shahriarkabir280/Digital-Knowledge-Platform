import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Check, X, AlertCircle, Loader2 } from 'lucide-react'
import { apiRequest } from '../services/api/client'
import { useAuth } from '../app/use-auth.js'

export default function LibraryModerationPage() {
  const { authState } = useAuth()
  const [pendingResources, setPendingResources] = useState([])
  const [loading, setLoading] = useState(true)
  const [showDialog, setShowDialog] = useState(false)
  const [selectedResource, setSelectedResource] = useState(null)
  const [action, setAction] = useState(null) // 'approve' or 'reject'
  const [reason, setReason] = useState('')
  const [processing, setProcessing] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    fetchPendingResources()
  }, [])

  async function fetchPendingResources() {
    setLoading(true)
    setError('')
    setMessage('')
    try {
      // Fetch all pending academic resources (no specific category filter)
      const response = await apiRequest('/documents/pending', {
        authToken: authState.token,
      })
      setPendingResources(response?.data?.items || [])
    } catch (error) {
      console.error('Failed to fetch pending resources:', error)
      setError(`Failed to load pending resources: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  async function handleAction() {
    if (!selectedResource || !action) return
    if (!reason.trim()) {
      setError('Please provide a reason for your decision')
      return
    }

    setProcessing(true)
    setError('')
    setMessage('')
    try {
      const targetState = action === 'approve' ? 'published' : 'archived'
      await apiRequest(`/documents/${selectedResource.id}/state`, {
        method: 'PATCH',
        authToken: authState.token,
        body: JSON.stringify({
          state: targetState,
          note: reason.trim(),
        }),
      })

      setMessage(`Resource ${action === 'approve' ? 'approved' : 'rejected'} successfully`)

      // Remove from pending list
      setPendingResources(pendingResources.filter(r => r.id !== selectedResource.id))
      
      // Close dialog
      closeDialog()
    } catch (error) {
      console.error('Failed to process resource:', error)
      setError(error.message || 'Failed to process resource')
    } finally {
      setProcessing(false)
    }
  }

  const openApprovalDialog = (resource) => {
    setSelectedResource(resource)
    setAction('approve')
    setReason('')
    setError('')
    setMessage('')
    setShowDialog(true)
  }

  const openRejectionDialog = (resource) => {
    setSelectedResource(resource)
    setAction('reject')
    setReason('')
    setError('')
    setMessage('')
    setShowDialog(true)
  }

  const closeDialog = () => {
    setShowDialog(false)
    setSelectedResource(null)
    setAction(null)
    setReason('')
    setError('')
  }

  if (loading) {
    return (
      <section className="mx-auto grid w-full max-w-6xl gap-4">
        <header className="grid gap-4 rounded-lg border border-border bg-card p-5">
          <div className="grid gap-2">
            <p className="brand-kicker">Library Management</p>
            <h2 className="text-2xl font-semibold tracking-tight">Pending Resource Review</h2>
            <p className="text-sm text-muted-foreground">
              Review academic resources submitted for library publication
            </p>
          </div>
        </header>
        <div className="flex items-center justify-center rounded-lg border border-border bg-card p-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </section>
    )
  }

  return (
    <section className="mx-auto grid w-full max-w-6xl gap-4">
      <header className="grid gap-4 rounded-lg border border-border bg-card p-5 md:grid-cols-[1fr_200px] md:items-start">
        <div className="grid gap-2">
          <p className="brand-kicker">Library Management</p>
          <h2 className="text-2xl font-semibold tracking-tight">Pending Resource Review</h2>
          <p className="text-sm text-muted-foreground">
            Review and approve educational resources for library publication. Check metadata and content quality.
          </p>
        </div>
        <div className="rounded-lg border border-border bg-muted/30 p-4">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Pending</p>
          <p className="text-3xl font-bold">{pendingResources.length}</p>
        </div>
      </header>

      {error && (
        <div className="rounded-lg border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-700 flex items-start gap-2">
          <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
          {error}
        </div>
      )}

      {message && (
        <div className="rounded-lg border border-green-500/20 bg-green-500/10 p-4 text-sm text-green-700 flex items-start gap-2">
          <Check className="h-5 w-5 flex-shrink-0 mt-0.5" />
          {message}
        </div>
      )}

      {pendingResources.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center gap-3 py-12">
            <Check className="h-12 w-12 text-green-500" />
            <h3 className="text-lg font-semibold">All caught up!</h3>
            <p className="text-sm text-muted-foreground">No pending resources to review</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {pendingResources.map((resource) => (
            <Card key={resource.id} className="overflow-hidden">
              <CardContent className="grid gap-4 p-5 md:grid-cols-[1fr_auto]">
                <div className="grid gap-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="grid gap-1">
                      <h3 className="font-semibold">{resource.title}</h3>
                      <p className="text-xs text-muted-foreground">
                        Submitted by <strong>{resource.uploaderName || resource.uploaderEmail}</strong> on{' '}
                        {new Date(resource.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <Badge variant="outline">pending</Badge>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs md:grid-cols-4">
                    <div>
                      <p className="text-muted-foreground">Type</p>
                      <p className="font-medium capitalize">{resource.type}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Format</p>
                      <p className="font-medium uppercase">{resource.format}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Department</p>
                      <p className="font-medium">{resource.department || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Year</p>
                      <p className="font-medium">{resource.year || 'N/A'}</p>
                    </div>
                  </div>

                  {resource.author && (
                    <div className="text-xs">
                      <p className="text-muted-foreground">Author</p>
                      <p className="font-medium">{resource.author}</p>
                    </div>
                  )}

                  {resource.abstract && (
                    <div className="text-xs">
                      <p className="text-muted-foreground">Description</p>
                      <p className="line-clamp-2 text-sm">{resource.abstract}</p>
                    </div>
                  )}

                  {resource.keywords && resource.keywords.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {resource.keywords.map((keyword, idx) => (
                        <Badge key={idx} variant="secondary" className="text-xs">
                          {keyword}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex flex-col gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    className="gap-2"
                    onClick={() => {
                      if (resource.id) {
                        window.open(`/viewer/${resource.id}`, '_blank')
                      }
                    }}
                  >
                    👁️ View
                  </Button>
                  <Button
                    variant="default"
                    size="sm"
                    className="gap-2"
                    onClick={() => openApprovalDialog(resource)}
                  >
                    <Check className="h-4 w-4" />
                    Approve
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-2"
                    onClick={() => openRejectionDialog(resource)}
                  >
                    <X className="h-4 w-4" />
                    Reject
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Modal/Dialog */}
      {showDialog && selectedResource && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div 
            className="fixed inset-0 bg-black/50"
            onClick={closeDialog}
          />
          <div className="relative z-50 rounded-lg border border-border bg-background p-6 shadow-lg max-w-md w-full">
            <div className="flex items-center gap-2 mb-4">
              {action === 'approve' ? (
                <>
                  <Check className="h-5 w-5 text-green-500" />
                  <h3 className="text-lg font-semibold">Approve Resource</h3>
                </>
              ) : (
                <>
                  <X className="h-5 w-5 text-red-500" />
                  <h3 className="text-lg font-semibold">Reject Resource</h3>
                </>
              )}
            </div>

            <div className="rounded-lg bg-muted/50 p-3 mb-4">
              <p className="text-sm font-medium">{selectedResource.title}</p>
              <p className="text-xs text-muted-foreground">
                by {selectedResource.uploaderName || selectedResource.uploaderEmail}
              </p>
            </div>

            <div className="grid gap-2 mb-4">
              <label className="text-sm font-medium">
                {action === 'approve' ? 'Approval Note' : 'Rejection Reason'}
                <span className="text-red-500">*</span>
              </label>
              <Textarea
                placeholder={
                  action === 'approve'
                    ? 'e.g., Good quality material, well-formatted...'
                    : 'e.g., Missing metadata, unclear content...'
                }
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="resize-none"
                rows={4}
              />
              <p className="text-xs text-muted-foreground">Max 1000 characters</p>
            </div>

            {error && (
              <div className="text-xs text-red-600 mb-3 flex items-center gap-1">
                <AlertCircle className="h-4 w-4" />
                {error}
              </div>
            )}

            <div className="flex gap-2 justify-end">
              <Button
                variant="outline"
                onClick={closeDialog}
                disabled={processing}
              >
                Cancel
              </Button>
              <Button
                onClick={handleAction}
                disabled={processing}
                variant={action === 'approve' ? 'default' : 'destructive'}
              >
                {processing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {action === 'approve' ? 'Approve' : 'Reject'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}
