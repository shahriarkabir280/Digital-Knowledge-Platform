import { useEffect, useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  AlertCircle,
  Check,
  Clock3,
  FileText,
  Loader2,
  Sparkles,
  Upload,
  User,
  X,
} from 'lucide-react'
import BulkImportPanel from '../components/library/BulkImportPanel.jsx'
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
  }, [authState.token])

  const stats = useMemo(() => {
    const byType = pendingResources.reduce((accumulator, resource) => {
      const type = String(resource.type || 'unknown').toLowerCase()
      accumulator[type] = (accumulator[type] || 0) + 1
      return accumulator
    }, {})

    return [
      {
        label: 'Pending items',
        value: pendingResources.length,
        helper: 'Ready for staff review',
      },
      {
        label: 'Research papers',
        value: byType['research-paper'] || 0,
        helper: 'Research uploads awaiting approval',
      },
      {
        label: 'Academic Resources',
        value: pendingResources.length - (byType['research-paper'] || 0),
        helper: 'Reports, datasets, and media',
      },
    ]
  }, [pendingResources])

  async function fetchPendingResources() {
    if (!authState?.token) {
      setLoading(false)
      return
    }

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

  const getResourceBadgeTone = (resourceType) => {
    const normalized = String(resourceType || '').toLowerCase()

    if (normalized === 'research-paper') {
      return 'bg-blue-500/10 text-blue-700 dark:text-blue-300'
    }

    if (normalized === 'thesis') {
      return 'bg-violet-500/10 text-violet-700 dark:text-violet-300'
    }

    if (normalized === 'dataset') {
      return 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
    }

    return 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
  }

  const getResourceTypeLabel = (resourceType) => {
    const normalized = String(resourceType || '').toLowerCase()

    if (!normalized) return 'Resource'
    return normalized.replace(/-/g, ' ')
  }

  if (loading) {
    return (
      <section className="mx-auto grid w-full max-w-6xl gap-4 px-4 py-2">
        <Card className="bg-card/90 shadow-none">
          <CardHeader className="gap-3 bg-muted/20 text-foreground">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.22em] text-emerald-200">
              <Sparkles className="h-4 w-4" />
              Library Moderation
            </div>
            <CardTitle className="text-3xl font-semibold tracking-tight text-foreground">
              Pending Resource Publish Queue
            </CardTitle>
            <CardDescription className="max-w-2xl text-sm text-muted-foreground">
              Review academic resources, verify metadata, and publish them directly or send them back to the archive.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex items-center justify-center p-10">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </CardContent>
        </Card>
      </section>
    )
  }

  return (
    <section className="mx-auto grid w-full max-w-6xl gap-4 px-4 py-2">
      <Card className="overflow-hidden bg-card/90 shadow-none">
        <CardHeader className="gap-6 md:flex-row md:items-end md:justify-between">
          <div className="grid gap-3">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">
              <span className="rounded-full bg-emerald-500/10 px-2.5 py-1 text-emerald-700 dark:text-emerald-300">
                Library Management
              </span>
              <span>Moderation Queue</span>
            </div>
            <div className="grid gap-2">
              <CardTitle className="text-3xl tracking-tight">Pending Resource Review</CardTitle>
              <CardDescription className="max-w-2xl text-sm leading-relaxed">
                Review and approve educational resources for library publication. Check metadata, skim the abstract, and decide quickly.
              </CardDescription>
            </div>
          </div>

          <div className="grid min-w-[220px] gap-2 rounded-2xl bg-muted/30 p-4 shadow-sm">
            <div className="flex items-center justify-between text-xs uppercase tracking-wide text-muted-foreground">
              <span>Pending</span>
              <Clock3 className="h-4 w-4" />
            </div>
            <div className="text-4xl font-black tracking-tight">{pendingResources.length}</div>
            <p className="text-xs text-muted-foreground">
              Items waiting for staff moderation
            </p>
          </div>
        </CardHeader>
      </Card>

      <div className="grid gap-3 md:grid-cols-3">
        {stats.map((stat) => (
          <Card key={stat.label} className="bg-card/90 shadow-none">
            <CardContent className="flex items-start justify-between gap-4 p-5">
              <div className="grid gap-1">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {stat.label}
                </p>
                <p className="text-3xl font-black tracking-tight">{stat.value}</p>
                <p className="text-xs text-muted-foreground">{stat.helper}</p>
              </div>
              <div className="rounded-2xl bg-muted/40 p-3 text-muted-foreground">
                <FileText className="h-5 w-5" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {error && (
        <Card className="bg-red-500/10 shadow-none">
          <CardContent className="flex items-start gap-3 p-4 text-sm text-red-700 dark:text-red-300">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
            <div className="grid gap-1">
              <p className="font-semibold">Could not load pending resources</p>
              <p>{error}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {message && (
        <Card className="bg-emerald-500/10 shadow-none">
          <CardContent className="flex items-start gap-3 p-4 text-sm text-emerald-700 dark:text-emerald-300">
            <Check className="mt-0.5 h-5 w-5 shrink-0" />
            <div className="grid gap-1">
              <p className="font-semibold">Decision saved</p>
              <p>{message}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {pendingResources.length === 0 ? (
        <Card className="border-dashed bg-card/80 shadow-none">
          <CardContent className="flex flex-col items-center justify-center gap-4 py-16 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-300">
              <Check className="h-8 w-8" />
            </div>
            <div className="grid gap-1">
              <h3 className="text-xl font-semibold tracking-tight">All caught up</h3>
              <p className="text-sm text-muted-foreground">
                No pending resources are waiting for moderation right now.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {pendingResources.map((resource) => (
            <Card key={resource.id} className="overflow-hidden bg-card/90 shadow-none transition-all hover:-translate-y-0.5 hover:shadow-sm">

              <CardHeader className="gap-4 pb-4 md:flex-row md:items-start md:justify-between">
                <div className="grid gap-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-300">
                      Pending
                    </Badge>
                    <Badge className={getResourceBadgeTone(resource.type)}>
                      {getResourceTypeLabel(resource.type)}
                    </Badge>
                  </div>
                  <div className="grid gap-1">
                    <CardTitle className="text-xl tracking-tight">{resource.title}</CardTitle>
                    <CardDescription className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
                      <span className="inline-flex items-center gap-1.5">
                        <User className="h-4 w-4" />
                        {resource.uploaderName || resource.uploaderEmail || 'Unknown'}
                      </span>
                      <span className="inline-flex items-center gap-1.5">
                        <Clock3 className="h-4 w-4" />
                        Submitted {new Date(resource.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </span>
                    </CardDescription>
                  </div>
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2 shrink-0"
                  onClick={() => {
                    if (resource.id) {
                      window.open(`/viewer/${resource.id}`, '_blank')
                    }
                  }}
                >
                  <FileText className="h-4 w-4" />
                  Preview
                </Button>
              </CardHeader>

              <CardContent className="grid gap-4 pb-4">
                <div className="grid gap-3 md:grid-cols-4">
                  <div className="rounded-2xl bg-muted/30 p-3">
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                      Format
                    </p>
                    <p className="mt-1 text-sm font-semibold uppercase">{resource.format || 'N/A'}</p>
                  </div>
                  <div className="rounded-2xl bg-muted/30 p-3">
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                      Department
                    </p>
                    <p className="mt-1 text-sm font-semibold">{resource.department || 'N/A'}</p>
                  </div>
                  <div className="rounded-2xl bg-muted/30 p-3">
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                      Course
                    </p>
                    <p className="mt-1 text-sm font-semibold">{resource.course || 'N/A'}</p>
                  </div>
                  <div className="rounded-2xl bg-muted/30 p-3">
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                      Year
                    </p>
                    <p className="mt-1 text-sm font-semibold">{resource.year || 'N/A'}</p>
                  </div>
                </div>

                {resource.author && (
                  <div className="rounded-2xl bg-muted/20 p-4">
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                      Author
                    </p>
                    <p className="mt-1 text-sm font-medium">{resource.author}</p>
                  </div>
                )}

                {resource.abstract && (
                  <div className="rounded-2xl bg-slate-950/[0.03] p-4 dark:bg-white/[0.03]">
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                      Description
                    </p>
                    <p className="mt-2 line-clamp-4 text-sm leading-relaxed text-muted-foreground">
                      {resource.abstract}
                    </p>
                  </div>
                )}

                {resource.keywords && resource.keywords.length > 0 && (
                  <div className="grid gap-2">
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                      Keywords
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {resource.keywords.map((keyword, idx) => (
                        <Badge key={idx} variant="secondary" className="rounded-full px-3 py-1 text-[11px] font-medium">
                          {keyword}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>

              <CardFooter className="flex flex-col gap-3 bg-muted/20 p-4 sm:flex-row sm:justify-between">
                <p className="text-xs text-muted-foreground">
                  Published decisions are recorded in the audit log automatically.
                </p>
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    className="gap-2 border-emerald-500/40 text-emerald-700 hover:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/30"
                    onClick={() => openApprovalDialog(resource)}
                  >
                    Publish
                  </Button>
                  <Button
                    variant="outline"
                    className="gap-2 border-red-500/40 text-red-700 hover:bg-red-500/10 dark:text-red-400 dark:border-red-500/30"
                    onClick={() => openRejectionDialog(resource)}
                  >
                    Reject
                  </Button>
                </div>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={showDialog} onOpenChange={(open) => !open && closeDialog()}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {action === 'approve' ? (
                <Check className="h-5 w-5 text-emerald-600" />
              ) : (
                <X className="h-5 w-5 text-red-600" />
              )}
              {action === 'approve' ? 'Publish resource' : 'Reject resource'}
            </DialogTitle>
            <DialogDescription>
              Add a short note explaining the decision before publishing or sending the resource back to the uploader.
            </DialogDescription>
          </DialogHeader>

          {selectedResource && (
            <div className="grid gap-2 rounded-2xl bg-muted/30 p-4">
              <p className="text-sm font-semibold">{selectedResource.title}</p>
              <p className="text-xs text-muted-foreground">
                by {selectedResource.uploaderName || selectedResource.uploaderEmail || 'Unknown'}
              </p>
            </div>
          )}

          <div className="grid gap-2">
            <label className="text-sm font-medium">
              {action === 'approve' ? 'Publish note' : 'Rejection reason'}
              <span className="text-red-500">*</span>
            </label>
            <Textarea
              placeholder={
                action === 'approve'
                  ? 'e.g., Good quality material, complete metadata, and ready for publication.'
                  : 'e.g., Missing metadata, unclear content, or not aligned with the collection.'
              }
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="min-h-[140px] resize-none"
            />
            <p className="text-xs text-muted-foreground">Max 1000 characters</p>
          </div>

          {error && (
            <div className="flex items-start gap-2 rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-xs text-red-700 dark:text-red-300">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={closeDialog} disabled={processing}>
              Cancel
            </Button>
            <Button
              onClick={handleAction}
              disabled={processing}
              variant="outline"
              className={action === 'approve'
                ? 'border-emerald-500/40 text-emerald-700 hover:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/30'
                : 'border-red-500/40 text-red-700 hover:bg-red-500/10 dark:text-red-400 dark:border-red-500/30'}
            >
              {processing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {action === 'approve' ? 'Approve' : 'Reject'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Bulk Import Section ────────────────────────────────────── */}
      <Card className="border-border shadow-none">
        <CardHeader className="p-5 border-b border-border bg-gradient-to-r from-muted/20 to-transparent">
          <div className="flex items-center gap-2">
            <Upload className="h-4 w-4 text-accent" />
            <CardTitle className="text-sm font-bold">Bulk Catalog Import</CardTitle>
          </div>
          <CardDescription className="text-xs mt-1">
            Upload a CSV file to add multiple catalog items at once — up to 10,000 rows per file.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-5">
          <BulkImportPanel />
        </CardContent>
      </Card>

    </section>
  )
}
