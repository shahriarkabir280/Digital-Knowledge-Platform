import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { useAuth } from '../app/use-auth.js'
import { apiRequest } from '../services/api/client'

const adminCards = [
  {
    title: 'Research Moderation',
    description: 'Review and approve pending research papers for repository publication.',
    to: '/moderation-queue',
    tone: 'teal',
  },
  {
    title: 'Library Moderation',
    description: 'Review and approve academic resources for library publication.',
    to: '/library-moderation-queue',
    tone: 'blue',
  },
  {
    title: 'Project Moderation',
    description: 'Review and approve pending student projects for the showcase.',
    to: '/admin/project-moderation',
    tone: 'purple',
  },
  {
    title: 'Role Management',
    description: 'Review user access and assign elevated roles from control panel.',
    to: '/admin/panel',
    tone: 'gold',
  },
  {
    title: 'Repository Oversight',
    description: 'Inspect submission health, moderation queues, and approval states.',
    to: '/repository',
    tone: 'sage',
  },
]

export default function AdminDashboardPage() {
  const { authState } = useAuth()
  const [researchPendingCount, setResearchPendingCount] = useState(0)
  const [libraryPendingCount, setLibraryPendingCount] = useState(0)
  const [projectsPendingCount, setProjectsPendingCount] = useState(0)
  const [totalPublished, setTotalPublished] = useState(0)

  useEffect(() => {
    const fetchCounts = async () => {
      // Fetch total published document count (admin-specific endpoint)
      try {
        const response = await apiRequest('/documents/all-uploads?state=published', {
          authToken: authState.token,
        })
        setTotalPublished(response?.data?.total || 0)
        console.log('[Admin] Total published documents:', response?.data?.total)
      } catch (error) {
        console.error('[Admin] Failed to fetch published count:', error)
      }

      // Fetch research papers pending count
      try {
        const researchResponse = await apiRequest('/documents/pending?resourceCategory=research-paper', {
          authToken: authState.token,
        })
        setResearchPendingCount(researchResponse?.data?.total || 0)
      } catch (error) {
        console.error('Failed to fetch research pending count:', error)
      }

      // Fetch all academic resources pending count
      try {
        const libraryResponse = await apiRequest('/documents/pending', {
          authToken: authState.token,
        })
        const allPending = libraryResponse?.data?.items || []
        const academicPending = allPending.filter(item => item.resourceCategory !== 'research-paper')
        setLibraryPendingCount(academicPending.length)
      } catch (error) {
        console.error('Failed to fetch library pending count:', error)
      }

      // Fetch all pending projects count
      try {
        const projectsResponse = await apiRequest('/projects/pending', {
          authToken: authState.token,
        })
        setProjectsPendingCount(projectsResponse?.data?.length || 0)
      } catch (error) {
        console.error('Failed to fetch projects pending count:', error)
      }
    }

    if (authState?.token) {
      fetchCounts()
    }
  }, [authState?.token])

  const totalPending = researchPendingCount + libraryPendingCount + projectsPendingCount

  return (
    <section className="mx-auto grid w-full max-w-6xl gap-4">
      <header className="flex flex-col sm:flex-row items-start justify-between gap-4 rounded-lg border border-border bg-card p-5">
        <div className="grid gap-2">
          <p className="brand-kicker">Admin Dashboard</p>
          <h2 className="text-2xl font-semibold tracking-tight">System control center</h2>
          <p className="text-sm text-muted-foreground">
            Governance-focused workspace for administration, policy checks, and
            operational decisions.
          </p>
        </div>

        <div className="flex items-center gap-3 text-xs shrink-0">
          <div className="rounded-md border border-border bg-muted/30 px-3 py-2 text-center">
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Tier</p>
            <strong className="text-foreground">Admin</strong>
          </div>
          <div className="rounded-md border border-border bg-muted/30 px-3 py-2 text-center">
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground">User</p>
            <strong className="text-foreground">{authState.name || 'Anonymous'}</strong>
          </div>
          <div className="rounded-md border border-border bg-muted/30 px-3 py-2 text-center">
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Modules</p>
            <strong className="text-foreground">{adminCards.length}</strong>
          </div>
        </div>
      </header>

      {/* Big metric cards — 50/50 split */}
      <div className="flex gap-4">
        <Card className="flex-1 border-blue-500/20 bg-gradient-to-br from-blue-500/5 to-transparent">
          <CardContent className="p-6">
            <p className="text-xs uppercase tracking-wider text-blue-600 font-bold">Total Publications</p>
            <span className="text-5xl font-black text-blue-600">{totalPublished}</span>
            <p className="text-[11px] text-blue-600/60 mt-0.5">Research + Academic resources</p>
          </CardContent>
        </Card>
        <Card className="flex-1 border-yellow-500/20 bg-gradient-to-br from-yellow-500/5 to-transparent">
          <CardContent className="p-6">
            <p className="text-xs uppercase tracking-wider text-yellow-600 font-bold">Pending Approvals</p>
            <span className="text-5xl font-black text-yellow-600">{totalPending}</span>
            <p className="text-[11px] text-yellow-600/60 mt-0.5">{researchPendingCount} research · {libraryPendingCount} library · {projectsPendingCount} projects</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        {adminCards.map((card) => (
          <Link
            key={card.title}
            to={card.to}
            className="rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            <Card className="h-full transition-colors hover:bg-muted/40">
              <CardContent className="grid gap-3 pt-6">
                <Badge variant="danger" className="w-fit">Admin Module</Badge>
                <h3 className="text-lg font-semibold leading-none tracking-tight">{card.title}</h3>
                <p className="text-sm text-muted-foreground">{card.description}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </section>
  )
}
