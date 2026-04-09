import { useState } from 'react'
import { AsyncStateBlock } from '../components/common/index.js'
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
    <section className="page-block">
      <p className="brand-kicker">Search</p>
      <h2>Unified Search</h2>
      <p>Supports loading, error, and empty states before API integration.</p>
      <div className="search-row">
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Try: metadata"
        />
        <button type="button" className="primary-btn" onClick={onSearch}>
          Search
        </button>
      </div>
      <AsyncStateBlock
        status={status}
        title="Search Results"
        description="Cross-source results from repository and library."
        items={items}
        error={error}
        renderItem={(item) => (
          <span>
            <strong>{item.title}</strong> - {item.source}
          </span>
        )}
      />
    </section>
  )
}
