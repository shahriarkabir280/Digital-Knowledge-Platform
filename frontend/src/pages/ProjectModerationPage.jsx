import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useAuth } from '../app/use-auth.js'
import { getPendingProjects, reviewProject } from '../services/api/projects.js'
import { Check, X, AlertCircle, Loader2, ArrowLeft, Calendar, User, BookOpen, ExternalLink, Code, Clock } from 'lucide-react'
import { Link } from 'react-router-dom'

export default function ProjectModerationPage() {
  const { authState } = useAuth()
  const [pendingProjects, setPendingProjects] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [processingId, setProcessingId] = useState(null)
  
  // Dialog state
  const [showReviewDialog, setShowReviewDialog] = useState(false)
  const [selectedProject, setSelectedProject] = useState(null)
  const [action, setAction] = useState(null) // 'approve' or 'reject'
  const [feedbackNote, setFeedbackNote] = useState('')

  useEffect(() => {
    fetchPending()
  }, [])

  async function fetchPending() {
    setLoading(true)
    setError('')
    setMessage('')
    try {
      const response = await getPendingProjects(authState.token)
      setPendingProjects(response?.data || [])
    } catch (err) {
      console.error('Failed to fetch pending projects:', err)
      setError(`Failed to load pending projects: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }

  async function handleReviewSubmit(e) {
    e.preventDefault()
    if (!selectedProject || !action) return

    setProcessingId(selectedProject.id)
    setError('')
    setMessage('')
    setShowReviewDialog(false)

    try {
      const targetState = action === 'approve' ? 'published' : 'rejected'
      await reviewProject(
        selectedProject.id, 
        { state: targetState, note: feedbackNote.trim() }, 
        authState.token
      )

      setMessage(`Project successfully ${action === 'approve' ? 'approved' : 'rejected'}.`)
      setPendingProjects(prev => prev.filter(p => p.id !== selectedProject.id))
      setSelectedProject(null)
      setAction(null)
      setFeedbackNote('')
    } catch (err) {
      console.error('Failed to review project:', err)
      setError(err.message || 'Failed to submit review.')
    } finally {
      setProcessingId(null)
    }
  }

  const openReviewDialog = (project, act) => {
    setSelectedProject(project)
    setAction(act)
    setFeedbackNote('')
    setError('')
    setShowReviewDialog(true)
  }

  return (
    <section className="mx-auto grid w-full max-w-6xl gap-6 px-4 py-2">
      <header className="flex flex-col sm:flex-row items-start justify-between gap-4 rounded-lg border border-border bg-card p-5">
        <div className="grid gap-2">
          <p className="brand-kicker flex items-center gap-1.5">
            <Link to="/dashboard/admin" className="hover:underline flex items-center gap-1">
              <ArrowLeft size={14} /> Admin
            </Link>
            <span>/ Showcase Moderation</span>
          </p>
          <h2 className="text-2xl font-semibold tracking-tight">Student Project Showcase Moderation</h2>
          <p className="text-sm text-muted-foreground">
            Review, verify, and approve/reject project submissions uploaded by department members.
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs shrink-0 bg-muted/40 rounded-md border border-border px-3 py-1.5 font-medium">
          <Clock size={14} className="text-muted-foreground" />
          <span>Pending Submissions: {pendingProjects.length}</span>
        </div>
      </header>

      {error && (
        <div className="flex items-center gap-2 rounded-md bg-destructive/10 border border-destructive/20 p-4 text-sm text-destructive">
          <AlertCircle size={16} />
          <p>{error}</p>
        </div>
      )}

      {message && (
        <div className="flex items-center gap-2 rounded-md bg-emerald-500/10 border border-emerald-500/20 p-4 text-sm text-emerald-600">
          <Check size={16} />
          <p>{message}</p>
        </div>
      )}

      {loading ? (
        <div className="flex flex-col items-center justify-center p-12 text-muted-foreground gap-3">
          <Loader2 className="animate-spin text-accent-strong" size={32} />
          <p className="text-sm font-medium">Fetching submissions...</p>
        </div>
      ) : pendingProjects.length === 0 ? (
        <Card className="border-dashed border-2 border-border p-12 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-muted text-muted-foreground mb-4">
            <Check className="h-6 w-6" />
          </div>
          <h3 className="text-lg font-bold text-foreground">All caught up!</h3>
          <p className="text-sm text-muted-foreground mt-1 max-w-sm mx-auto">
            There are no pending project submissions in the queue right now.
          </p>
        </Card>
      ) : (
        <div className="grid gap-6">
          {pendingProjects.map((project) => (
            <Card key={project.id} className="overflow-hidden hover:shadow-md transition-shadow border-border">
              <CardHeader className="p-5 border-b border-border bg-muted/10">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="grid gap-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge className="bg-purple-500/10 text-purple-700 hover:bg-purple-500/20 border-none font-medium">
                        {project.category}
                      </Badge>
                      <Badge variant="outline" className="text-muted-foreground border-border text-xs gap-1">
                        <Calendar size={10} /> {project.academicYear}
                      </Badge>
                    </div>
                    <CardTitle className="text-xl font-bold text-foreground mt-1">{project.title}</CardTitle>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => openReviewDialog(project, 'reject')}
                      className="border-red-500/30 text-red-600 hover:bg-red-50"
                      disabled={processingId !== null}
                    >
                      <X size={14} className="mr-1" /> Reject
                    </Button>
                    <Button 
                      size="sm" 
                      onClick={() => openReviewDialog(project, 'approve')}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white"
                      disabled={processingId !== null}
                    >
                      <Check size={14} className="mr-1" /> Approve
                    </Button>
                  </div>
                </div>
              </CardHeader>
              
              <CardContent className="p-5 grid gap-5 md:grid-cols-[1fr_250px]">
                {/* Left side: descriptions, supervisor, team */}
                <div className="grid gap-4">
                  <div>
                    <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Short Description</h4>
                    <p className="text-sm text-foreground leading-relaxed">{project.description}</p>
                  </div>

                  <div>
                    <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Detailed Overview</h4>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed bg-muted/20 p-3.5 rounded border border-muted/50">
                      {project.longDescription}
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-4 border-t border-muted/50 pt-3">
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <BookOpen size={13} className="text-purple-600" />
                      <strong className="text-foreground">Supervisor:</strong> {project.supervisor}
                    </div>
                    {project.demoUrl && (
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <ExternalLink size={13} className="text-blue-600" />
                        <a href={project.demoUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                          Live Demo
                        </a>
                      </div>
                    )}
                    {project.resources?.repoUrl && project.resources.repoUrl !== '#' && (
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Code size={13} className="text-slate-700" />
                        <a href={project.resources.repoUrl} target="_blank" rel="noopener noreferrer" className="text-slate-700 hover:underline">
                          Source Repo
                        </a>
                      </div>
                    )}
                  </div>
                </div>

                {/* Right side: Team information / image preview */}
                <div className="flex flex-col gap-4 border-t md:border-t-0 md:border-l border-border pt-4 md:pt-0 md:pl-5">
                  <div>
                    <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1 mb-2">
                      <User size={13} /> Team Members
                    </h4>
                    <div className="grid gap-1.5">
                      {project.teamMembers.map((member) => (
                        <div key={member} className="flex items-center gap-2 text-xs font-medium text-foreground">
                          <div className="w-4 h-4 rounded-full bg-purple-500/20 text-purple-700 flex items-center justify-center text-[9px] font-bold">
                            {member.charAt(0)}
                          </div>
                          <span>{member}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Technology Tags</h4>
                    <div className="flex flex-wrap gap-1">
                      {project.tags.map((tag) => (
                        <Badge key={tag} variant="secondary" className="text-[10px] py-0 px-1.5">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  {project.thumbnail && (
                    <div className="mt-auto pt-2">
                      <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Thumbnail Preview</h4>
                      <div className="h-24 w-full rounded overflow-hidden bg-muted border border-border">
                        <img 
                          src={project.thumbnail} 
                          alt="thumbnail" 
                          className="w-full h-full object-cover"
                          onError={(e) => { e.target.style.display = 'none' }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Review Dialog/Modal */}
      {showReviewDialog && selectedProject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 animate-in fade-in duration-200">
          <Card className="w-full max-w-md border-border shadow-xl bg-card">
            <CardHeader className="p-5 border-b border-border">
              <CardTitle className="text-lg font-bold">
                {action === 'approve' ? 'Approve Project' : 'Reject Project'}
              </CardTitle>
              <p className="text-xs text-muted-foreground mt-1">
                Confirm your decision for: <strong>{selectedProject.title}</strong>
              </p>
            </CardHeader>
            <form onSubmit={handleReviewSubmit}>
              <CardContent className="p-5 grid gap-4">
                <div className="grid gap-1.5">
                  <label htmlFor="feedbackNote" className="text-xs font-semibold">
                    Feedback / Review Notes {action === 'reject' ? '*' : '(Optional)'}
                  </label>
                  <textarea
                    id="feedbackNote"
                    value={feedbackNote}
                    onChange={(e) => setFeedbackNote(e.target.value)}
                    placeholder={action === 'reject' ? 'Explain the reason for rejection so the student knows what to correct...' : 'Awesome project! Add some optional feedback notes here...'}
                    required={action === 'reject'}
                    rows={4}
                    className="w-full rounded-md border border-input bg-muted/10 px-3 py-2 text-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  />
                </div>
              </CardContent>
              <div className="flex gap-2 justify-end p-5 border-t border-border bg-muted/10">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setShowReviewDialog(false)}
                  size="sm"
                >
                  Cancel
                </Button>
                <Button 
                  type="submit"
                  size="sm"
                  className={action === 'approve' ? 'bg-emerald-600 hover:bg-emerald-700 text-white' : 'bg-red-600 hover:bg-red-700 text-white'}
                >
                  Confirm {action === 'approve' ? 'Approval' : 'Rejection'}
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}
    </section>
  )
}
