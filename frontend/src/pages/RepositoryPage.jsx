import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Alert } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { useAuth } from '../app/use-auth.js'
import {
  fetchMyUploads,
  openDocumentInNewTab,
  patchDocumentState,
} from '../services/api/documents.js'

export default function RepositoryPage() {
  const { authState } = useAuth()
  const [status, setStatus] = useState('loading')
  const [items, setItems] = useState([])
  const [error, setError] = useState('')
  const [filters, setFilters] = useState({
    state: '',
    type: '',
  })

  const loadItems = async (nextFilters = filters) => {
    try {
      setStatus('loading')
      setError('')
      const result = await fetchMyUploads(nextFilters, authState.token)
      const uploads = result?.data?.items || []
      setItems(uploads)
      setStatus(uploads.length ? 'success' : 'empty')
    } catch (err) {
      setStatus('error')
      setError(err.message || 'Request failed')
    }
  }

  useEffect(() => {
    loadItems()
  }, [])

  const onFilterChange = (event) => {
    const { name, value } = event.target
    setFilters((current) => ({
      ...current,
      [name]: value,
    }))
  }

  const onApplyFilters = async () => {
    await loadItems(filters)
  }

  const onResetFilters = async () => {
    const reset = {
      state: '',
      type: '',
    }
    setFilters(reset)
    await loadItems(reset)
  }

  const onOpenDocument = async (documentId) => {
    try {
      setError('')
      await openDocumentInNewTab(documentId, authState.token)
    } catch (err) {
      setError(err.message || 'Failed to open document')
    }
  }

  const onSubmitForReview = async (documentId) => {
    try {
      setError('')
      await patchDocumentState(documentId, 'review', authState.token)
      await loadItems(filters)
    } catch (err) {
      setError(err.message || 'Failed to move document to review')
    }
  }

  const resolveBadgeVariant = (state) => {
    if (state === 'draft') return 'secondary'
    if (state === 'review') return 'warning'
    if (state === 'published') return 'success'
    if (state === 'archived') return 'danger'
    return 'outline'
  }

  return (
    <section className="mx-auto grid w-full max-w-6xl gap-4">
      <div className="grid gap-2">
        <p className="brand-kicker">Repository</p>
        <h2 className="text-2xl font-semibold tracking-tight">My Uploads</h2>
        <p className="text-sm text-muted-foreground">View and filter only the documents you uploaded.</p>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Filters</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-[repeat(2,minmax(0,220px))_auto_auto] sm:items-end">
          <div className="grid gap-1.5">
            <Label htmlFor="repo-state-filter">State</Label>
            <Select id="repo-state-filter" name="state" value={filters.state} onChange={onFilterChange}>
              <option value="">All states</option>
              <option value="draft">draft</option>
              <option value="review">review</option>
              <option value="published">published</option>
              <option value="archived">archived</option>
            </Select>
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="repo-type-filter">Type</Label>
            <Select id="repo-type-filter" name="type" value={filters.type} onChange={onFilterChange}>
              <option value="">All types</option>
              <option value="research-paper">research-paper</option>
              <option value="report">report</option>
              <option value="presentation">presentation</option>
              <option value="document">document</option>
              <option value="media">media</option>
            </Select>
          </div>

          <Button type="button" variant="secondary" onClick={onApplyFilters}>
            Apply
          </Button>
          <Button type="button" variant="outline" onClick={onResetFilters}>
            Reset
          </Button>
        </CardContent>
      </Card>

      {status === 'loading' ? <Alert>Loading uploads...</Alert> : null}
      {status === 'error' ? <Alert variant="error">{error}</Alert> : null}
      {status === 'empty' ? <Alert>No uploaded documents found for current filters.</Alert> : null}

      {status === 'success' ? (
        <div className="grid gap-3">
          {items.map((item) => (
            <Card key={item.id}>
              <CardContent className="grid gap-3 pt-6">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="text-lg font-semibold leading-none tracking-tight">
                    <button
                      type="button"
                      className="text-left hover:underline focus-visible:underline"
                      onClick={() => onOpenDocument(item.id)}
                    >
                      {item.title}
                    </button>
                  </h3>
                  <Badge variant={resolveBadgeVariant(item.state)}>{item.state}</Badge>
                </div>

                <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                  <span>Type: {item.type}</span>
                  <span>Format: {item.format}</span>
                  <span>Version: v{item.version}</span>
                  <span>Access: {item.accessTier}</span>
                </div>

                <p className="text-sm text-muted-foreground">
                  Uploaded: {new Date(item.createdAt).toLocaleString()}
                </p>

                <div className="flex flex-wrap gap-2">
                  {item.state === 'draft' ? (
                    <Button type="button" onClick={() => onSubmitForReview(item.id)}>
                      Submit to Review
                    </Button>
                  ) : null}
                  <Button asChild type="button">
                    <Link to={`/submit-paper?documentId=${item.id}`}>Edit Metadata</Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : null}
    </section>
  )
}
