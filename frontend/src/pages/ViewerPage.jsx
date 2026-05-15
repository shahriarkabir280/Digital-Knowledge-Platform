import { useParams } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default function ViewerPage() {
  const { docId } = useParams()

  return (
    <section className="mx-auto grid w-full max-w-5xl gap-4">
      <div className="grid gap-2">
        <p className="brand-kicker">Viewer</p>
        <h2 className="text-2xl font-semibold tracking-tight">Document Viewer</h2>
        <p className="text-sm text-muted-foreground">
          Placeholder for PDF/document rendering UI. Selected document id:{' '}
          <strong className="text-foreground">{docId || 'none'}</strong>
        </p>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Viewer Canvas</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border border-dashed border-border bg-muted/20 p-6 text-sm text-muted-foreground">
            Viewer canvas area (toolbar + page thumbnails + content pane) will be implemented in the next phase.
          </div>
        </CardContent>
      </Card>
    </section>
  )
}
