import { useState } from 'react'
import { Search } from 'lucide-react'
import { Alert } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { runSearch } from '../modules/search/index.js'

export default function SearchPage() {
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState('idle')
  const [items, setItems] = useState([])
  const [error, setError] = useState('')

  const onSearch = async (e) => {
    e?.preventDefault()
    if (!query.trim()) return
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

  const onKeyDown = (e) => {
    if (e.key === 'Enter') onSearch()
  }

  return (
    <section className="mx-auto grid w-full max-w-4xl gap-6">
      {/* Page header */}
      <div className="grid gap-1">
        <p className="brand-kicker">Search</p>
        <h2 className="text-2xl font-bold tracking-tight" style={{ letterSpacing: '-.02em' }}>
          Unified Search
        </h2>
        <p className="text-sm text-muted-foreground">
          Search across the repository and library from one place.
        </p>
      </div>

      {/* Search bar */}
      <div style={{
        display: 'flex',
        gap: '10px',
        padding: '16px',
        background: '#fff',
        borderRadius: '14px',
        border: '1px solid hsl(var(--border))',
        boxShadow: '0 1px 3px rgba(0,0,0,.05)',
      }}>
        <div style={{ position: 'relative', flex: 1 }}>
          <Search
            size={16}
            style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)', pointerEvents: 'none' }}
          />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Search documents, papers, resources…"
            style={{ paddingLeft: '36px', height: '44px', fontSize: '.95rem' }}
          />
        </div>
        <Button onClick={onSearch} style={{ height: '44px', paddingInline: '24px' }}>
          Search
        </Button>
      </div>

      {/* States */}
      {status === 'loading' && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--muted)', fontSize: '.9rem' }}>
          <span style={{ display: 'inline-block', width: '16px', height: '16px', border: '2px solid var(--accent-soft)', borderTopColor: 'var(--accent)', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
          Searching…
        </div>
      )}
      {status === 'error' && <Alert variant="error">{error}</Alert>}
      {status === 'empty' && <Alert>No results found for <strong>"{query}"</strong>. Try different keywords.</Alert>}
      {status === 'idle' && (
        <div style={{ textAlign: 'center', padding: '48px 20px', color: 'var(--muted)' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '12px' }}>🔍</div>
          <p style={{ fontSize: '.9rem' }}>Enter a search term above to find documents and resources.</p>
        </div>
      )}

      {/* Results */}
      {status === 'success' && (
        <div className="grid gap-3">
          <p style={{ fontSize: '.85rem', color: 'var(--muted)', fontWeight: 600 }}>
            {items.length} result{items.length !== 1 ? 's' : ''} for "{query}"
          </p>
          {items.map((item) => (
            <Card key={item.id} style={{ transition: 'box-shadow .15s ease, border-color .15s ease' }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent-border)'; e.currentTarget.style.boxShadow = '0 4px 16px rgba(30,138,150,.08)' }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = ''; e.currentTarget.style.boxShadow = '' }}
            >
              <CardContent style={{ padding: '16px 20px', display: 'grid', gap: '6px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
                  <strong style={{ fontSize: '.95rem', color: 'var(--ink)' }}>{item.title}</strong>
                  <span style={{
                    fontSize: '.7rem',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '.06em',
                    padding: '3px 8px',
                    borderRadius: '999px',
                    background: 'var(--accent-bg)',
                    color: 'var(--accent-strong)',
                    flexShrink: 0,
                  }}>
                    {item.source}
                  </span>
                </div>
                {item.description && (
                  <p style={{ fontSize: '.85rem', color: 'var(--muted)', lineHeight: 1.5 }}>{item.description}</p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </section>
  )
}
