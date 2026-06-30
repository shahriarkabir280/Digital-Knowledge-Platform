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

  useEffect(() => {
    const fetchPendingCounts = async () => {
      try {
        // Fetch research papers pending count
        const researchResponse = await apiRequest('/documents/pending?resourceCategory=research-paper', {
          authToken: authState.token,
        })
        setResearchPendingCount(researchResponse?.data?.total || 0)

        // Fetch textbook resources pending count
        const libraryResponse = await apiRequest('/documents/pending?resourceCategory=textbook', {
          authToken: authState.token,
        })
        setLibraryPendingCount(libraryResponse?.data?.total || 0)

        console.log('Research pending:', researchResponse?.data?.total, 'Library pending:', libraryResponse?.data?.total)
      } catch (error) {
        console.error('Failed to fetch pending counts:', error)
      }
    }

    if (authState?.token) {
      fetchPendingCounts()
    }
  }, [authState?.token])

  const totalPending = researchPendingCount + libraryPendingCount

  return (
    <section className="mx-auto grid w-full max-w-6xl gap-4">
      <header className="grid gap-4 rounded-lg border border-border bg-card p-5 md:grid-cols-[1fr_320px] md:items-start">
        <div className="grid gap-2">
          <p className="brand-kicker">Admin Dashboard</p>
          <h2 className="text-2xl font-semibold tracking-tight">System control center</h2>
          <p className="text-sm text-muted-foreground">
            Governance-focused workspace for administration, policy checks, and
            operational decisions.
          </p>
        </div>

        <div className="grid gap-2 text-sm">
          <div className="rounded-md border border-border bg-muted/30 p-3">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Access tier</p>
            <strong>Administrator</strong>
          </div>
          <div className="rounded-md border border-border bg-muted/30 p-3">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Signed in as</p>
            <strong>{authState.name || 'Anonymous'}</strong>
          </div>
          <div className="rounded-md border border-border bg-muted/30 p-3">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Active modules</p>
            <strong>{adminCards.length}</strong>
          </div>
          <div className="rounded-md border border-border bg-yellow-500/10 p-3 border-yellow-500/20">
            <p className="text-xs uppercase tracking-wide text-yellow-600">Pending Approvals</p>
            <strong className="text-lg text-yellow-600">{totalPending}</strong>
            <p className="text-xs text-yellow-600/70 mt-1">{researchPendingCount} research · {libraryPendingCount} library</p>
          </div>
        </div>
      </header>

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
