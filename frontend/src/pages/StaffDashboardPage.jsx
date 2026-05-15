import { Link } from 'react-router-dom'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { useAuth } from '../app/use-auth.js'
import { ROLES } from '../app/rbac.js'

const staffCards = [
  {
    title: 'Submission Wizard',
    description: 'Ingest documents, complete metadata, and send submissions into review.',
    to: '/submit-paper',
    tone: 'teal',
  },
  {
    title: 'Borrowing Operations',
    description: 'Monitor circulation requests and support resource delivery.',
    to: '/borrow-item',
    tone: 'sage',
  },
  {
    title: 'Review Queue',
    description: 'Process pending submissions currently waiting in review state.',
    to: '/review-queue',
    tone: 'ink',
  },
  {
    title: 'All Uploads',
    description: 'Inspect all submissions across users with operational filters.',
    to: '/all-uploads',
    tone: 'gold',
  },
  {
    title: 'Library & Search',
    description: 'Manage discovery access and run quality checks for catalog records.',
    to: '/library',
    tone: 'teal',
  },
]

export default function StaffDashboardPage() {
  const { authState } = useAuth()

  const roleLabel =
    authState.role === ROLES.LAB_MANAGER ? 'Lab Manager' : 'Staff'

  return (
    <section className="mx-auto grid w-full max-w-6xl gap-4">
      <header className="grid gap-4 rounded-lg border border-border bg-card p-5 md:grid-cols-[1fr_320px] md:items-start">
        <div className="grid gap-2">
          <p className="brand-kicker">Staff Dashboard</p>
          <h2 className="text-2xl font-semibold tracking-tight">Operations workspace</h2>
          <p className="text-sm text-muted-foreground">
            Day-to-day service dashboard for catalog upkeep, document intake,
            and circulation flow.
          </p>
        </div>

        <div className="grid gap-2 text-sm">
          <div className="rounded-md border border-border bg-muted/30 p-3">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Current role</p>
            <strong>{roleLabel}</strong>
          </div>
          <div className="rounded-md border border-border bg-muted/30 p-3">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Signed in as</p>
            <strong>{authState.name || 'Anonymous'}</strong>
          </div>
          <div className="rounded-md border border-border bg-muted/30 p-3">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Operational actions</p>
            <strong>{staffCards.length}</strong>
          </div>
        </div>
      </header>

      <div className="grid gap-3 md:grid-cols-2">
        {staffCards.map((card) => (
          <Link
            key={card.title}
            to={card.to}
            className="rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            <Card className="h-full transition-colors hover:bg-muted/40">
              <CardContent className="grid gap-3 pt-6">
                <Badge variant="warning" className="w-fit">Staff Action</Badge>
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
