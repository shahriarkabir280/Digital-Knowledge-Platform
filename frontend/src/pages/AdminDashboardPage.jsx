import { Link } from 'react-router-dom'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { useAuth } from '../app/use-auth.js'

const adminCards = [
  {
    title: 'Role Management',
    description: 'Review user access and assign elevated roles from control panel.',
    to: '/admin/panel',
    tone: 'teal',
  },
  {
    title: 'Repository Oversight',
    description: 'Inspect submission health, moderation queues, and approval states.',
    to: '/repository',
    tone: 'gold',
  },
  {
    title: 'Search Audit',
    description: 'Audit discoverability and metadata quality across the platform.',
    to: '/search',
    tone: 'sage',
  },
]

export default function AdminDashboardPage() {
  const { authState } = useAuth()

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
