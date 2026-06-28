import { Link } from 'react-router-dom'
import { Card, CardContent } from '@/components/ui/card'

export default function HomePage() {
  return (
    <section className="landing-page mx-auto w-full max-w-5xl">
      <div className="landing-hero">
        <div className="landing-hero-copy">
          <p className="brand-kicker">Home</p>
          <h2>Digital Knowledge Platform</h2>
          <p className="text-sm text-muted-foreground">
            Role-aware entry point for dashboards, search, and document viewing.
          </p>
          <div className="landing-hero-actions">
            <Link to="/dashboard" className="landing-hero-primary">
              Open dashboard
            </Link>
            <Link to="/search" className="landing-hero-secondary">
              Search resources
            </Link>
          </div>
        </div>

        <div className="grid gap-2 rounded-lg border border-border bg-card p-5 shadow-sm">
          <p className="brand-kicker">Quick access</p>
          <h3 className="text-lg font-semibold tracking-tight">Move into the core flows</h3>
          <p className="text-sm text-muted-foreground">
            Jump straight into the most common tasks without digging through menus.
          </p>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <Link
          to="/dashboard"
          className="rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          <Card className="h-full transition-colors hover:bg-muted/40">
            <CardContent className="grid gap-3 pt-6">
              <h3 className="text-lg font-semibold leading-none tracking-tight">Dashboard</h3>
              <p className="text-sm text-muted-foreground">Operational summary and shortcuts.</p>
            </CardContent>
          </Card>
        </Link>

        <Link
          to="/search"
          className="rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          <Card className="h-full transition-colors hover:bg-muted/40">
            <CardContent className="grid gap-3 pt-6">
              <h3 className="text-lg font-semibold leading-none tracking-tight">Search</h3>
              <p className="text-sm text-muted-foreground">Find resources across repository and library.</p>
            </CardContent>
          </Card>
        </Link>

        <Link
          to="/viewer/sample-doc"
          className="rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          <Card className="h-full transition-colors hover:bg-muted/40">
            <CardContent className="grid gap-3 pt-6">
              <h3 className="text-lg font-semibold leading-none tracking-tight">Viewer</h3>
              <p className="text-sm text-muted-foreground">Open a sample document viewer route.</p>
            </CardContent>
          </Card>
        </Link>
      </div>
    </section>
  )
}
