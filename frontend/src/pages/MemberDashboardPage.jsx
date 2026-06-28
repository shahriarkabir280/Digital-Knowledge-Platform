import { Link } from 'react-router-dom'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { useAuth } from '../app/use-auth.js'
import { ROLES } from '../app/rbac.js'

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
    title: 'orrow Item',
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

  const visibleCards = dashboardCards.filter((card) =>
    card.roles.includes(authState.role),
  )

  return (
    <section className="mx-auto grid w-full max-w-6xl gap-4">
      <header className="grid gap-4 rounded-lg border border-border bg-card p-5 md:grid-cols-[1fr_320px] md:items-start">
        <div className="grid gap-2">
          <p className="brand-kicker">Member Dashboard</p>
          <h2 className="text-2xl font-semibold tracking-tight">Research and access workspace</h2>
          <p className="text-sm text-muted-foreground">
            Continue submission, borrowing, and discovery tasks based on your
            current account role.
          </p>
        </div>

        <div className="grid gap-2 text-sm">
          <div className="rounded-md border border-border bg-muted/30 p-3">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Current role</p>
            <strong>{roleLabels[authState.role] || authState.role}</strong>
          </div>
          <div className="rounded-md border border-border bg-muted/30 p-3">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Signed in as</p>
            <strong>{authState.name || 'Anonymous'}</strong>
          </div>
          <div className="rounded-md border border-border bg-muted/30 p-3">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Quick actions</p>
            <strong>{visibleCards.length}</strong>
          </div>
        </div>
      </header>

      <div className="grid gap-3 md:grid-cols-2">
        {visibleCards.map((card) => (
          <Link
            key={card.title}
            to={card.to}
            className="rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            <Card className="h-full transition-colors hover:bg-muted/40">
              <CardContent className="grid gap-3 pt-6">
                <Badge variant="secondary" className="w-fit">Member Action</Badge>
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
