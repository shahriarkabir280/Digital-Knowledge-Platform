import { useState, useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Alert } from '@/components/ui/alert'
import { toast } from 'sonner'
import { useAuth } from '../app/use-auth.js'
import { ROLES } from '../app/rbac.js'
import {
  fetchMyUploads,
  openDocumentInNewTab,
  patchDocumentState,
} from '../services/api/documents.js'
import { 
  ArrowUpRight, 
  FileEdit, 
  History, 
  Sparkles,
  FileText
} from 'lucide-react'

const roleLabels = {
  [ROLES.MEMBER]: 'Member',
  [ROLES.CONTRIBUTOR]: 'Contributor',
  [ROLES.REVIEWER]: 'Reviewer',
}

const dashboardCards = [
  {
    title: 'Submission Wizard',
    description:
      'Upload your file, complete metadata, choose access tier, and submit for review in one flow.',
    to: '/submit-paper',
    roles: [ROLES.MEMBER, ROLES.CONTRIBUTOR],
  },
  {
    title: 'Borrow Item',
    description:
      'Request available physical resources through circulation workflow.',
    to: '/borrow-item',
    roles: [ROLES.MEMBER, ROLES.CONTRIBUTOR],
  },
  {
    title: 'Search Repository',
    description: 'Find records across repository and library from one search box.',
    to: '/search',
    roles: [ROLES.MEMBER, ROLES.CONTRIBUTOR, ROLES.REVIEWER],
  },
]

export default function MemberDashboardPage() {
  const { authState } = useAuth()
  
  // My Uploads States
  const [uploadsItems, setUploadsItems] = useState([])
  const [uploadsStatus, setUploadsStatus] = useState('loading')
  const [uploadsError, setUploadsError] = useState('')
  const [selectedState, setSelectedState] = useState('All')

  const visibleCards = dashboardCards.filter((card) =>
    card.roles.includes(authState.role)
  )

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

  useEffect(() => {
    loadMyUploads()
  }, [authState?.token])

  const onSubmitForReview = async (documentId) => {
    try {
      await patchDocumentState(documentId, 'review', authState.token)
      await loadMyUploads()
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
    if (state === 'draft') return 'bg-slate-500/15 text-slate-600 border-slate-500/20'
    if (state === 'review') return 'bg-amber-500/15 text-amber-600 border-amber-500/20'
    if (state === 'published') return 'bg-emerald-500/15 text-emerald-600 border-emerald-500/20'
    return 'bg-muted text-muted-foreground'
  }

  const filteredUploads = useMemo(() => {
    return uploadsItems.filter(item => {
      return selectedState === 'All' || item.state === selectedState
    })
  }, [uploadsItems, selectedState])

  return (
    <section className="mx-auto grid w-full max-w-6xl gap-6">
      <header className="dashboard-hero dashboard-hero--member grid gap-4 rounded-lg border border-border bg-card p-5 md:grid-cols-[1fr_320px] md:items-start">
        <div className="grid gap-2">
          <p className="brand-kicker">Member Dashboard</p>
          <h2 className="text-2xl font-semibold tracking-tight">Research workspace</h2>
          <p className="text-sm text-muted-foreground">
            Continue submission, borrowing, and discovery tasks based on your role.
          </p>
          <div className="landing-hero-actions">
            <Link to="/submit-paper" className="landing-hero-primary">
              Start a submission
            </Link>
            <Link to="/search" className="landing-hero-secondary">
              Search repository
            </Link>
          </div>
        </div>

        <div className="dashboard-hero-meta grid gap-2 text-sm">
          <div className="dashboard-meta-card rounded-md border border-border bg-muted/30 p-3">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Current role</p>
            <strong>{roleLabels[authState.role] || authState.role}</strong>
          </div>
          <div className="dashboard-meta-card rounded-md border border-border bg-muted/30 p-3">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Signed in as</p>
            <strong>{authState.name || 'Anonymous'}</strong>
          </div>
          <div className="dashboard-meta-card rounded-md border border-border bg-muted/30 p-3">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Quick actions</p>
            <strong>{visibleCards.length}</strong>
          </div>
        </div>
      </header>

      {/* Quick Actions Grid */}
      <div className="grid gap-3 md:grid-cols-3">
        {visibleCards.map((card) => (
          <Link
            key={card.title}
            to={card.to}
            className="rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            <Card className="dashboard-card dashboard-card--teal h-full transition-colors hover:bg-muted/40">
              <CardContent className="grid gap-3 pt-6">
                <Badge variant="secondary" className="dashboard-card-label w-fit">Member Action</Badge>
                <h3 className="text-lg font-semibold leading-none tracking-tight">{card.title}</h3>
                <p className="text-sm text-muted-foreground">{card.description}</p>
                <span className="dashboard-card-footer">Open task</span>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* My Uploads Section */}
      <Card className="border-border">
        <CardHeader className="p-5 border-b border-border flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-gradient-to-r from-muted/20 to-transparent">
          <div>
            <CardTitle className="text-base font-bold flex items-center gap-1.5">
              <History size={16} className="text-accent" />
              My Upload History
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-0.5">Track and manage your submitted preprints, papers, and datasets.</p>
          </div>

          {/* Status Filter buttons */}
          <div className="flex bg-muted p-0.5 rounded-lg border border-border/50">
            {['All', 'draft', 'review', 'published'].map(state => (
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
            <div className="flex justify-center items-center py-10">
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
              <Button asChild size="sm" className="mt-3 text-xs bg-accent hover:bg-accent/90 text-white">
                <Link to="/submit-paper">Upload Your First Paper</Link>
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
    </section>
  )
}
