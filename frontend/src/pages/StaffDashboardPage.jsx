import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useAuth } from '../app/use-auth.js'
import { ROLES } from '../app/rbac.js'
import { getOverdueLoans } from '../services/api/library.js'
import {
  AlertTriangle, BookCheck, Loader2, CheckCircle2,
  BookOpen, User, Calendar, ArrowRight
} from 'lucide-react'

const staffCards = [
  {
    title: 'Submission Wizard',
    description: 'Ingest documents, complete metadata, and send submissions into review.',
    to: '/submit-paper',
  },
  {
    title: 'Borrowing Operations',
    description: 'Search the physical catalog, issue loans to members, and track overdue items.',
    to: '/circulation',
  },
  {
    title: 'Review Queue',
    description: 'Process pending submissions currently waiting in review state.',
    to: '/review-queue',
  },
  {
    title: 'All Uploads',
    description: 'Inspect all submissions across users with operational filters.',
    to: '/all-uploads',
  },
  {
    title: 'Library Analytics',
    description: 'Circulation reports, popular items, fines summary, and member activity.',
    to: '/library/analytics',
  },
  {
    title: 'Bulk Import',
    description: 'Import catalog items from CSV — up to 10,000 records at once.',
    to: '/library-moderation-queue',
  },
]

// ── Overdue Widget ─────────────────────────────────────────────────

function OverdueWidget() {
  const { data: overdueLoans = [], isLoading, isError } = useQuery({
    queryKey: ['overdue-loans-widget'],
    queryFn: getOverdueLoans,
    staleTime: 5 * 60 * 1000,
    retry: 1,
  })

  const daysOverdue = (dueDate) => {
    const diff = Date.now() - new Date(dueDate).getTime()
    return Math.max(0, Math.floor(diff / (1000 * 60 * 60 * 24)))
  }

  return (
    <Card className="border-border">
      <CardHeader className="p-4 pb-2 border-b border-border bg-gradient-to-r from-red-500/5 to-transparent flex flex-row items-center justify-between gap-2">
        <CardTitle className="text-sm font-bold flex items-center gap-2">
          <AlertTriangle size={14} className="text-red-500" />
          Overdue Items
          {!isLoading && overdueLoans.length > 0 && (
            <Badge className="text-[10px] font-bold bg-red-500/10 text-red-600 border-red-500/20 border">
              {overdueLoans.length}
            </Badge>
          )}
        </CardTitle>
        <Link to="/circulation">
          <Button size="sm" variant="ghost" className="h-6 text-[10px] gap-1 text-muted-foreground hover:text-foreground">
            View All <ArrowRight size={10} />
          </Button>
        </Link>
      </CardHeader>
      <CardContent className="p-4">
        {isLoading && (
          <div className="flex justify-center py-6">
            <Loader2 size={18} className="animate-spin text-muted-foreground" />
          </div>
        )}
        {isError && (
          <p className="text-xs text-red-500 text-center py-4">Failed to load overdue items.</p>
        )}
        {!isLoading && !isError && overdueLoans.length === 0 && (
          <div className="flex flex-col items-center gap-2 py-6 text-muted-foreground">
            <CheckCircle2 size={24} className="text-emerald-500 opacity-60" />
            <p className="text-xs font-semibold">No overdue items — all clear!</p>
          </div>
        )}
        {!isLoading && overdueLoans.length > 0 && (
          <div className="grid gap-2">
            {overdueLoans.slice(0, 5).map((loan) => {
              const days = daysOverdue(loan.due_date)
              return (
                <div
                  key={loan.id}
                  className="flex items-start gap-3 rounded-lg border border-red-200 dark:border-red-900/30 bg-red-50 dark:bg-red-950/10 p-3"
                >
                  <div className="shrink-0 w-7 h-7 rounded-full bg-red-500/10 flex items-center justify-center">
                    <BookOpen size={13} className="text-red-500" />
                  </div>
                  <div className="flex-1 min-w-0 grid gap-0.5">
                    <p className="text-xs font-bold text-foreground truncate">
                      {loan.item_title || 'Unknown item'}
                    </p>
                    <div className="flex items-center gap-2 text-[10px] text-muted-foreground flex-wrap">
                      <span className="flex items-center gap-0.5">
                        <User size={9} /> {loan.member_name || loan.member_email || `Member #${loan.member_id}`}
                      </span>
                      <span className="flex items-center gap-0.5">
                        <Calendar size={9} /> Due {new Date(loan.due_date).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                  <Badge className="text-[9px] font-bold bg-red-500/10 text-red-600 border-red-500/20 border shrink-0">
                    {days}d overdue
                  </Badge>
                </div>
              )
            })}
            {overdueLoans.length > 5 && (
              <Link to="/circulation" className="text-[11px] text-accent hover:underline text-center py-1">
                +{overdueLoans.length - 5} more overdue items →
              </Link>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// ── Main Page ──────────────────────────────────────────────────────

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

      {/* Overdue alert widget — live data */}
      <OverdueWidget />

      {/* Action cards */}
      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
        {staffCards.map((card) => (
          <Link
            key={card.title}
            to={card.to}
            className="rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            <Card className="h-full transition-colors hover:bg-muted/40">
              <CardContent className="grid gap-3 pt-6">
                <Badge variant="outline" className="w-fit text-[10px] font-bold uppercase text-accent border-accent/30 bg-accent/5">
                  Staff Action
                </Badge>
                <h3 className="text-base font-semibold leading-none tracking-tight">{card.title}</h3>
                <p className="text-sm text-muted-foreground">{card.description}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </section>
  )
}
