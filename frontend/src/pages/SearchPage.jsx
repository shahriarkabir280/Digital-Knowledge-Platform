import { useState } from 'react'
import { Alert } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { runSearch } from '../modules/search/index.js'

export default function SearchPage() {
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState('idle')
  const [items, setItems] = useState([])
  const [error, setError] = useState('')

  const onSearch = async () => {
    try {
      setStatus('loading')
      setError('')
      const result = await runSearch(query)
      setItems(result)
      setStatus(result.length ? 'success' : 'empty')
    } catch (err) {
      setStatus('error')
      setError(err.message || 'Search failed')
    }
  }

  return (
    <section className="mx-auto grid w-full max-w-5xl gap-4">
      <div className="grid gap-2">
        <p className="brand-kicker">Search</p>
        <h2 className="text-2xl font-semibold tracking-tight">Unified Search</h2>
        <p className="text-sm text-muted-foreground">Supports loading, error, and empty states before API integration.</p>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Search query</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-[1fr_auto]">
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Try: metadata"
          />
          <Button type="button" onClick={onSearch}>
            Search
          </Button>
        </CardContent>
      </Card>

      {status === 'loading' ? <Alert>Loading data...</Alert> : null}
      {status === 'error' ? <Alert variant="error">Error: {error}</Alert> : null}
      {status === 'empty' ? <Alert>No records found yet.</Alert> : null}
      {status === 'idle' ? <Alert>Click search to fetch data state.</Alert> : null}

      {status === 'success' ? (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle>Search Results</CardTitle>
            <p className="text-sm text-muted-foreground">Cross-source results from repository and library.</p>
          </CardHeader>
          <CardContent>
            <ul className="grid gap-2">
              {items.map((item) => (
                <li key={item.id} className="rounded-md border border-border bg-muted/30 p-3 text-sm">
                  <strong>{item.title}</strong> - {item.source}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      ) : null}
    </section>
  )
}
