import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'

export default function UnauthorizedPage() {
  return (
    <section className="mx-auto w-full max-w-3xl">
      <Card>
        <CardContent className="grid gap-3 pt-6">
          <p className="brand-kicker">Access Control</p>
          <h2 className="text-2xl font-semibold tracking-tight">Unauthorized (403)</h2>
          <p className="text-sm text-muted-foreground">This route requires higher privileges.</p>
          <div>
            <Button asChild variant="outline">
              <Link to="/dashboard">Return To Dashboard</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </section>
  )
}
