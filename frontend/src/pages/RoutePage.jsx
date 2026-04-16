import { Card, CardContent } from '@/components/ui/card'

export default function RoutePage({ title, description }) {
  return (
    <section className="mx-auto w-full max-w-4xl">
      <Card>
        <CardContent className="grid gap-2 pt-6">
          <p className="brand-kicker">Route Skeleton</p>
          <h2 className="text-2xl font-semibold tracking-tight">{title}</h2>
          <p className="text-sm text-muted-foreground">{description}</p>
        </CardContent>
      </Card>
    </section>
  )
}
