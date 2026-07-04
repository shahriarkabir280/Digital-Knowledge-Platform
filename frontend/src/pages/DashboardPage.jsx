import { useState, useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Alert } from '@/components/ui/alert'
import { useAuth } from '../app/use-auth.js'
import { ROLES } from '../app/rbac.js'
import { toast } from 'sonner'
import { apiRequest } from '../services/api/client'
import {
  fetchMyUploads,
  fetchReviewQueue,
  openDocumentInNewTab,
  patchDocumentState,
} from '../services/api/documents.js'
import {
  LayoutDashboard,
  BookOpen,
  GraduationCap,
  Bookmark,
  FileText,
  Database,
  Upload,
  History,
  Sparkles,
  Clock,
  CheckCircle2,
  AlertCircle,
  ArrowUpRight,
  FileEdit,
  ShieldCheck,
  ClipboardCheck,
  Activity,
  User,
  Calendar,
  Layers,
  ArrowRight
} from 'lucide-react'

export default function DashboardPage() {
  const { authState } = useAuth()
  
  // States
  const [uploadsItems, setUploadsItems] = useState([])
  const [uploadsStatus, setUploadsStatus] = useState('loading')
  const [uploadsError, setUploadsError] = useState('')
  const [selectedState, setSelectedState] = useState('All')
  
  const [reviewQueue, setReviewQueue] = useState([])
  const [reviewQueueStatus, setReviewQueueStatus] = useState('idle')
  const [pendingCount, setPendingCount] = useState(0)

  const filteredUploads = useMemo(() => {
    return uploadsItems.filter(item => {
      return selectedState === 'All' || item.state === selectedState
    })
  }, [uploadsItems, selectedState])

  // Live bookmark count — reads localStorage fresh every render
  const getBookmarksCount = () => {
    try {
      const saved = localStorage.getItem('dkp_bookmarked_resources')
      return saved ? JSON.parse(saved).length : 0
    } catch {
      return 0
    }
  }

  // Live total repo count from the published docs cache
  const getRepoCount = () => {
    try {
      const saved = localStorage.getItem('dkp_published_docs_cache')
      return saved ? JSON.parse(saved).length : 0
    } catch {
      return 0
    }
  }

  // Check user privileges
  const isReviewer = [ROLES.REVIEWER, ROLES.STAFF, ROLES.LAB_MANAGER, ROLES.ADMIN].includes(authState.role)
  const isAdmin = authState.role === ROLES.ADMIN

  // Load My Uploads
  const loadMyUploads = async () => {
    if (!authState?.token) return
    try {
      setUploadsStatus('loading')
      setUploadsError('')
      const result = await fetchMyUploads({}, authState.token)
      const uploads = result?.data?.items || []
      setUploadsItems(uploads)
      setUploadsStatus(uploads.length ? 'success' : 'empty')
    } catch (err) {
      setUploadsStatus('error')
      setUploadsError(err.message || 'Failed to load uploads')
    }
  }

  // Load Review Queue (if Reviewer/Staff/Admin)
  const loadReviewQueue = async () => {
    if (!authState?.token || !isReviewer) return
    try {
      setReviewQueueStatus('loading')
      const result = await fetchReviewQueue({}, authState.token)
      const items = result?.data?.items || []
      setReviewQueue(items)
      setReviewQueueStatus('success')
    } catch {
      setReviewQueueStatus('error')
    }
  }

  // Load pending approvals for anyone who can review them
  const loadPendingCount = async () => {
    if (!authState?.token || !isReviewer) return
    try {
      const result = await apiRequest('/documents/pending', { authToken: authState.token })
      setPendingCount(result?.data?.total || 0)
    } catch {
      // Silently fail
    }
  }

  useEffect(() => {
    loadMyUploads()
    if (isReviewer) {
      loadReviewQueue()
    }
    if (isReviewer) {
      loadPendingCount()
    }
  }, [authState?.token])

  const onSubmitForReview = async (documentId) => {
    try {
      await patchDocumentState(documentId, 'review', authState.token)
      await loadMyUploads()
      if (isReviewer) loadReviewQueue()
      toast.success('Submitted for review')
    } catch (err) {
      toast.error(err.message || 'Failed to submit document for review')
    }
  }

  const onOpenDocument = async (documentId) => {
    try {
      await openDocumentInNewTab(documentId, authState.token)
    } catch (err) {
      alert(err.message || 'Failed to open document')
    }
  }

  const resolveStateBadge = (state) => {
    if (state === 'draft') return 'bg-slate-500/10 text-slate-600 border-slate-500/20'
    if (state === 'review') return 'bg-amber-500/10 text-amber-600 border-amber-500/20'
    if (state === 'published') return 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'
    return 'bg-muted text-muted-foreground'
  }

  const roleLabel = useMemo(() => {
    if (authState.role === ROLES.ADMIN) return 'System Administrator'
    if (authState.role === ROLES.LAB_MANAGER) return 'Lab Manager'
    if (authState.role === ROLES.STAFF) return 'Operations Staff'
    if (authState.role === ROLES.REVIEWER) return 'Technical Reviewer'
    if (authState.role === ROLES.CONTRIBUTOR) return 'Contributor'
    return 'Research Member'
  }, [authState.role])

  // Stepper helper for upload status
  const getStepperStatus = (state) => {
    const steps = [
      { key: 'draft', label: 'Drafted' },
      { key: 'review', label: 'In Review' },
      { key: 'published', label: 'Published' }
    ]
    const currentIndex = steps.findIndex(s => s.key === state)
    return { steps, currentIndex }
  }

  return (
    <div className="mx-auto grid w-full max-w-6xl gap-6">
      
      {/* Personalized Welcome Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-slate-800 to-accent/20 p-6 md:p-8 text-white shadow-lg border border-slate-800">
        <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
          <LayoutDashboard size={240} />
        </div>
        <div className="relative flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="grid gap-2 max-w-xl">
            <span className="inline-flex items-center gap-1 text-xs font-semibold text-accent uppercase tracking-wider bg-accent/15 px-2.5 py-1 rounded-full w-fit border border-accent/20">
              <Sparkles size={12} className="text-accent" /> Active Workspace
            </span>
            <h2 className="text-3xl font-extrabold tracking-tight">
              Welcome back, {authState.name || 'Scholar'}!
            </h2>
            <p className="text-xs text-slate-300 leading-relaxed">
              Your research, academic tools, and operations console are ready. Review your uploaded resources, track submission stages, or continue indexing documents.
            </p>
          </div>

          <div className="flex flex-col gap-2 bg-slate-950/40 p-4 rounded-xl border border-white/10 shrink-0 w-full md:w-64">
            <div className="flex justify-between items-center text-[10px] uppercase tracking-wider text-slate-400">
              <span>Account Persona</span>
                <Badge variant="outline" className="text-xs border-white/20 text-white font-bold bg-white/5 capitalize">
                {authState.role}
              </Badge>
            </div>
            <div className="mt-1 font-bold text-sm truncate">{authState.name}</div>
            <div className="text-[11px] text-accent font-medium">{roleLabel}</div>
          </div>
        </div>
      </div>

      {/* Metrics Dashboard */}
      <div className="grid gap-3 grid-cols-2 md:grid-cols-4">
        {!isAdmin && (
          <Card className="border-border hover:shadow-sm transition-all">
            <CardContent className="p-4 flex items-center justify-between">
              <div className="grid gap-0.5">
                <span className="text-xs text-muted-foreground uppercase font-bold tracking-wider">My Submissions</span>
                <span className="text-2xl font-black text-foreground">{uploadsStatus === 'success' ? uploadsItems.length : 0}</span>
              </div>
              <div className="w-9 h-9 rounded-lg bg-accent/10 flex items-center justify-center text-accent shrink-0">
                <History size={18} />
              </div>
            </CardContent>
          </Card>
        )}

        {!isAdmin && (
          <Card className="border-border hover:shadow-sm transition-all">
            <CardContent className="p-4 flex items-center justify-between">
              <div className="grid gap-0.5">
                <span className="text-xs text-muted-foreground uppercase font-bold tracking-wider">My Bookmarks</span>
                <span className="text-2xl font-black text-foreground">{getBookmarksCount()}</span>
              </div>
              <div className="w-9 h-9 rounded-lg bg-red-500/10 flex items-center justify-center text-red-500 shrink-0">
                <Bookmark size={18} />
              </div>
            </CardContent>
          </Card>
        )}

        <Card className="border-border hover:shadow-md transition-all md:col-span-1 bg-gradient-to-br from-blue-500/5 to-transparent">
          <CardContent className="p-6 flex items-center justify-between gap-4">
            <div className="grid gap-1">
              <span className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Total Publications</span>
              <span className="text-4xl font-black text-foreground">{getRepoCount()}</span>
            </div>
            <div className="w-14 h-14 rounded-2xl bg-blue-500/10 flex items-center justify-center text-blue-500 shrink-0">
              <BookOpen size={28} />
            </div>
          </CardContent>
        </Card>

        <Card className="border-border hover:shadow-md transition-all md:col-span-1 bg-gradient-to-br from-amber-500/5 to-transparent">
          <CardContent className="p-6 flex items-center justify-between gap-4">
            {isReviewer ? (
              <>
                <div className="grid gap-1">
                  <span className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Pending Reviews</span>
                  <span className="text-4xl font-black text-amber-500">{reviewQueue.length + pendingCount}</span>
                </div>
                <div className="w-14 h-14 rounded-2xl bg-amber-500/10 flex items-center justify-center text-amber-500 shrink-0">
                  <ClipboardCheck size={28} />
                </div>
              </>
            ) : (
              <>
                <div className="grid gap-1">
                  <span className="text-xs text-muted-foreground uppercase font-bold tracking-wider">System Status</span>
                  <span className="text-xs font-bold text-emerald-500 flex items-center gap-1 mt-1">
                    <CheckCircle2 size={11} /> Online
                  </span>
                </div>
                <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-500 shrink-0">
                  <Activity size={28} />
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Admin Panel Section — visible only to admins, at the top */}
      {isAdmin && (
        <div className="grid gap-3">
          <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground uppercase tracking-wider">
            <ShieldCheck size={14} className="text-red-500" />
            <span>Admin Panel</span>
          </div>
          <div className="grid gap-3 grid-cols-2 sm:grid-cols-4">
            <Link to="/dashboard/admin" className="group block">
              <Card className="border-border hover:border-red-500/30 hover:shadow-md transition-all h-full">
                <CardContent className="p-4 flex flex-col items-center text-center gap-2">
                  <div className="w-10 h-10 rounded-xl bg-red-500/10 group-hover:bg-red-500/20 transition-colors flex items-center justify-center">
                    <LayoutDashboard size={20} className="text-red-500" />
                  </div>
                  <span className="text-xs font-bold">Admin Dashboard</span>
                  <span className="text-[10px] text-muted-foreground leading-tight">Full system overview and analytics</span>
                </CardContent>
              </Card>
            </Link>

            <Link to="/moderation-queue" className="group block">
              <Card className="border-border hover:border-amber-500/30 hover:shadow-md transition-all h-full">
                <CardContent className="p-4 flex flex-col items-center text-center gap-2">
                  <div className="w-10 h-10 rounded-xl bg-amber-500/10 group-hover:bg-amber-500/20 transition-colors flex items-center justify-center">
                    <ClipboardCheck size={20} className="text-amber-500" />
                  </div>
                  <span className="text-xs font-bold">Moderation Queue</span>
                  <span className="text-[10px] text-muted-foreground leading-tight">Review pending document submissions</span>
                </CardContent>
              </Card>
            </Link>

            <Link to="/library-moderation-queue" className="group block">
              <Card className="border-border hover:border-blue-500/30 hover:shadow-md transition-all h-full">
                <CardContent className="p-4 flex flex-col items-center text-center gap-2">
                  <div className="w-10 h-10 rounded-xl bg-blue-500/10 group-hover:bg-blue-500/20 transition-colors flex items-center justify-center">
                    <BookOpen size={20} className="text-blue-500" />
                  </div>
                  <span className="text-xs font-bold">Library Moderation</span>
                  <span className="text-[10px] text-muted-foreground leading-tight">Academic resource approval queue</span>
                </CardContent>
              </Card>
            </Link>

            <Link to="/admin/panel" className="group block">
              <Card className="border-border hover:border-purple-500/30 hover:shadow-md transition-all h-full">
                <CardContent className="p-4 flex flex-col items-center text-center gap-2">
                  <div className="w-10 h-10 rounded-xl bg-purple-500/10 group-hover:bg-purple-500/20 transition-colors flex items-center justify-center">
                    <ShieldCheck size={20} className="text-purple-500" />
                  </div>
                  <span className="text-xs font-bold">Role Management</span>
                  <span className="text-[10px] text-muted-foreground leading-tight">Manage user roles and permissions</span>
                </CardContent>
              </Card>
            </Link>
          </div>
        </div>
      )}

      {/* Main Split Grid */}
      <div className="grid gap-6 md:grid-cols-[2fr_1fr]">
        
        {/* Left Side: Submissions tracker or pending review lists */}
        <div className="grid gap-4">
          
          {/* My Upload History Card */}
          <Card className="border-border">
            <CardHeader className="p-5 border-b border-border flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-gradient-to-r from-muted/20 to-transparent">
              <div>
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <History size={15} className="text-accent" />
                  My Upload History
                </CardTitle>
                <p className="text-[11px] text-muted-foreground mt-0.5">Track and manage your submitted papers, datasets, and resources.</p>
              </div>

              {/* Status Filter buttons */}
              <div className="flex bg-muted p-0.5 rounded-lg border border-border/50">
                {['All', 'pending', 'draft', 'review', 'published'].map(state => (
                  <button
                    key={state}
                    onClick={() => setSelectedState(state)}
                    className={`px-3 py-1.5 rounded-md text-[10px] font-bold capitalize transition-all ${
                      selectedState === state
                        ? 'bg-background text-foreground shadow-sm'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {state === 'All' ? 'All' : state}
                  </button>
                ))}
              </div>
            </CardHeader>
            <CardContent className="p-5">
              {uploadsStatus === 'loading' && (
                <div className="flex justify-center items-center py-12">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-accent" />
                </div>
              )}

              {uploadsStatus === 'error' && (
                <Alert variant="destructive" className="border-red-500/20 bg-red-500/10 text-red-600">
                  {uploadsError}
                </Alert>
              )}

              {uploadsStatus === 'empty' && (
                <div className="text-center py-10">
                  <p className="text-xs text-muted-foreground italic">You haven't uploaded any documents yet.</p>
                  <Button asChild size="sm" className="mt-3 text-xs bg-accent hover:bg-accent/90 text-white border-none">
                    <Link to="/repository">Upload Your First Paper</Link>
                  </Button>
                </div>
              )}

              {uploadsStatus === 'success' && (
                <div className="grid gap-3">
                  {filteredUploads.length === 0 ? (
                    <p className="text-xs text-muted-foreground text-center py-4 italic">No uploads match the selected status.</p>
                  ) : (
                    filteredUploads.map((item) => (
                      <div key={item.id} className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3 rounded-lg border border-border hover:bg-muted/10 transition-colors">
                        <div className="grid gap-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge className={`text-[9px] px-1.5 py-0 border uppercase font-bold ${resolveStateBadge(item.state)}`}>
                              {item.state}
                            </Badge>
                            <Badge variant="outline" className="text-[9px] uppercase">{item.format || 'pdf'}</Badge>
                            <span className="text-[10px] text-muted-foreground">Version v{item.version}</span>
                          </div>
                          <h4 className="text-xs font-bold text-foreground truncate">{item.title}</h4>
                          <p className="text-[10px] text-muted-foreground">
                            Uploaded: {new Date(item.createdAt).toLocaleDateString()} · Access: <span className="font-semibold text-foreground">{item.accessTier}</span>
                          </p>
                        </div>

                        <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                          <Button size="sm" variant="ghost" className="h-7 text-[10px] px-2 gap-1" onClick={() => onOpenDocument(item.id)}>
                            <ArrowUpRight size={12} /> View
                          </Button>
                          
                          {item.state === 'draft' && (
                            <Button size="sm" variant="outline" className="h-7 text-[10px] px-2 text-amber-600 border-amber-500/25 hover:bg-amber-500/10" onClick={() => onSubmitForReview(item.id)}>
                              Submit to Review
                            </Button>
                          )}

                          <Button asChild size="sm" variant="secondary" className="h-7 text-[10px] px-2.5">
                            <Link to={`/submit-paper?documentId=${item.id}`}>
                              <FileEdit size={12} /> Edit
                            </Link>
                          </Button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Reviewer Action queue list */}
          {isReviewer && reviewQueue.length > 0 && (
            <Card className="border-border">
              <CardHeader className="p-5 border-b border-border flex flex-row items-center justify-between bg-gradient-to-r from-amber-500/5 to-transparent">
                <div>
                  <CardTitle className="text-sm font-bold flex items-center gap-2">
                    <ClipboardCheck size={15} className="text-amber-500" />
                    Review Desk Queue
                  </CardTitle>
                  <p className="text-[11px] text-muted-foreground mt-0.5">Incoming research submissions awaiting verification.</p>
                </div>
                <Button asChild size="sm" variant="ghost" className="h-7 text-xs gap-1 font-bold text-amber-600 hover:text-amber-700">
                  <Link to="/review-queue">Desk <ArrowRight size={12} /></Link>
                </Button>
              </CardHeader>
              <CardContent className="p-5 grid gap-3">
                {reviewQueue.slice(0, 3).map((item) => (
                  <div key={item.id} className="flex justify-between items-center gap-3 p-3 rounded-lg border border-border bg-background hover:bg-muted/10 transition-all">
                    <div className="grid gap-0.5 min-w-0">
                      <span className="text-[10px] text-muted-foreground font-semibold uppercase">{item.type}</span>
                      <h4 className="text-xs font-bold text-foreground truncate">{item.title}</h4>
                      <p className="text-xs text-muted-foreground">Uploaded by {item.uploaderName || 'a contributor'} · Format: {item.format}</p>
                    </div>
                    <Button asChild size="sm" variant="secondary" className="h-7 text-[10px] px-2.5 font-bold shrink-0">
                      <Link to={`/review-queue`}>Start Review</Link>
                    </Button>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

        </div>

        {/* Right Side: Quick Tools and Checklist */}
        <div className="grid gap-6 self-start">
          
          {/* Action Panel */}
          <Card className="border-border">
            <CardHeader className="p-4 pb-2">
              <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Quick Tool Console</CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0 grid gap-2">
              <Button asChild variant="outline" className="w-full justify-start text-xs h-9 font-semibold hover:bg-accent/5 hover:text-accent border-border/80">
                <Link to="/repository" className="gap-2">
                  <GraduationCap size={14} className="text-accent" />
                  Explore Repository
                </Link>
              </Button>

              <Button asChild variant="outline" className="w-full justify-start text-xs h-9 font-semibold hover:bg-accent/5 hover:text-accent border-border/80">
                <Link to="/library" className="gap-2">
                  <BookOpen size={14} className="text-accent" />
                  Academic Resources
                </Link>
              </Button>

              <Button asChild variant="outline" className="w-full justify-start text-xs h-9 font-semibold hover:bg-accent/5 hover:text-accent border-border/80">
                <Link to="/library/bookmarks" className="gap-2">
                  <Bookmark size={14} className="text-accent" />
                  My Bookmarks
                </Link>
              </Button>

              <Button asChild variant="outline" className="w-full justify-start text-xs h-9 font-semibold hover:bg-amber-500/5 hover:text-amber-600 border-border/80">
                <Link to="/dashboard" className="gap-2">
                  <FileEdit size={14} className="text-amber-500" />
                  My Drafts
                </Link>
              </Button>

              {isReviewer && (
                <Button asChild variant="outline" className="w-full justify-start text-xs h-9 font-semibold hover:bg-emerald-500/5 hover:text-emerald-600 border-border/80">
                  <Link to="/library-moderation-queue" className="gap-2">
                    <ClipboardCheck size={14} className="text-emerald-600" />
                    Library Moderation
                  </Link>
                </Button>
              )}

              {isAdmin && (
                <Button asChild variant="outline" className="w-full justify-start text-xs h-9 font-semibold hover:bg-red-500/5 hover:text-red-500 border-border/80">
                  <Link to="/admin" className="gap-2">
                    <ShieldCheck size={14} className="text-red-500" />
                    System Admin
                  </Link>
                </Button>
              )}
            </CardContent>
          </Card>

          {/* Research & Submission guidelines list */}
          <Card className="border-border bg-muted/10">
            <CardHeader className="p-4 pb-2">
              <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Submission Checklist</CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0 grid gap-2.5 text-xs text-muted-foreground">
              <div className="flex gap-2 items-start">
                <CheckCircle2 size={13} className="text-accent shrink-0 mt-0.5" />
                <span>Verify file contains proper citation formatting.</span>
              </div>
              <div className="flex gap-2 items-start">
                <CheckCircle2 size={13} className="text-accent shrink-0 mt-0.5" />
                <span>Specify the proper upload folder (e.g. `thesis/`) for sorting.</span>
              </div>
              <div className="flex gap-2 items-start">
                <CheckCircle2 size={13} className="text-accent shrink-0 mt-0.5" />
                <span>Add relevant tags for classification (e.g. `machine-learning`).</span>
              </div>
            </CardContent>
          </Card>

        </div>

      </div>

    </div>
  )
}
