import { useState } from 'react'
import { Alert } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { loadLibraryItems } from '../modules/library/index.js'

export default function LibraryPage() {
  const [status, setStatus] = useState('idle')
  const [items, setItems] = useState([])
  const [error, setError] = useState('')

  const onLoad = async () => {
    try {
      setStatus('loading')
      setError('')
      const result = await loadLibraryItems()
      setItems(result)
      setStatus(result.length ? 'success' : 'empty')
    } catch (err) {
      setStatus('error')
      setError(err.message || 'Request failed')
    }
  }

  return (
    <section className="mx-auto grid w-full max-w-5xl gap-4">
      <div className="grid gap-2">
        <p className="brand-kicker">Library</p>
        <h2 className="text-2xl font-semibold tracking-tight">Catalog</h2>
        <p className="text-sm text-muted-foreground">Prepared state handling for catalog API integration.</p>
      </div>

      <div>
        <Button type="button" variant="outline" onClick={onLoad}>
          Load Library Data
        </Button>
      </div>

      {status === 'loading' ? <Alert>Loading data...</Alert> : null}
      {status === 'error' ? <Alert variant="error">Error: {error}</Alert> : null}
      {status === 'empty' ? <Alert>No records found yet.</Alert> : null}
      {status === 'idle' ? <Alert>Click load to fetch data state.</Alert> : null}

      {status === 'success' ? (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle>Library Records</CardTitle>
            <p className="text-sm text-muted-foreground">Circulation status and item metadata will come from API.</p>
          </CardHeader>
          <CardContent>
            <ul className="grid gap-2">
              {items.map((item) => (
                <li key={item.id} className="rounded-md border border-border bg-muted/30 p-3 text-sm">
                  <strong>{item.title}</strong> - {item.status}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      ) : null}
    </section>
  )
}
