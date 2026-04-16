import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'

export default function NotFoundPage() {
  return (
    <section className="mx-auto w-full max-w-3xl">
      <Card>
        <CardContent className="grid gap-3 pt-6">
          <p className="brand-kicker">404</p>
          <h2 className="text-2xl font-semibold tracking-tight">Page Not Found</h2>
          <p className="text-sm text-muted-foreground">The route you requested does not exist yet.</p>
          <div>
            <Button asChild variant="outline">
              <Link to="/dashboard">Go To Dashboard</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </section>
  )
}
