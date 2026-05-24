import { useMemo, useState } from 'react'
import { CATALOG_ITEMS } from '../modules/library/librarian-data.js'
import './LibrarySection.css'
import './LibraryLibrarian.css'

const uniqueValues = (items, key) => {
  return Array.from(new Set(items.map((item) => item[key]))).sort((a, b) => String(a).localeCompare(String(b)))
}

export default function LibraryCatalogSearchPage() {
  const [query, setQuery] = useState('')
  const [filters, setFilters] = useState({
    availability: '',
    location: '',
    subject: '',
    format: '',
  })

  const filterOptions = useMemo(() => {
    return {
      availability: uniqueValues(CATALOG_ITEMS, 'availability'),
      location: uniqueValues(CATALOG_ITEMS, 'location'),
      subject: uniqueValues(CATALOG_ITEMS, 'subject'),
      format: uniqueValues(CATALOG_ITEMS, 'format'),
    }
  }, [])

  const filteredItems = useMemo(() => {
    return CATALOG_ITEMS.filter((item) => {
      const matchesQuery =
        !query.trim() ||
        [item.title, item.author, item.isbn, item.subject]
          .join(' ')
          .toLowerCase()
          .includes(query.toLowerCase())

      const matchesAvailability = !filters.availability || item.availability === filters.availability
      const matchesLocation = !filters.location || item.location === filters.location
      const matchesSubject = !filters.subject || item.subject === filters.subject
      const matchesFormat = !filters.format || item.format === filters.format

      return matchesQuery && matchesAvailability && matchesLocation && matchesSubject && matchesFormat
    })
  }, [query, filters])

  const onFilterChange = (event) => {
    const { name, value } = event.target
    setFilters((current) => ({ ...current, [name]: value }))
  }

  const onResetFilters = () => {
    setQuery('')
    setFilters({ availability: '', location: '', subject: '', format: '' })
  }

  return (
    <section className="library-page">
      <header className="library-panel">
        <p className="library-kicker">Catalog Search</p>
        <h2 style={{ margin: '6px 0', color: 'var(--ink)', fontSize: 'clamp(1.3rem,2vw,1.8rem)', fontWeight: 800, letterSpacing: '-.02em' }}>
          Advanced catalog search with facets
        </h2>
        <p style={{ color: 'var(--muted)', fontSize: '.9rem', lineHeight: 1.6 }}>
          Search by title, author, ISBN, or subject. Filter by availability and location.
        </p>
      </header>

      <section className="library-panel" style={{ display: 'grid', gap: '12px' }}>
        <div className="library-topbar-search">
          <input
            className="library-input"
            placeholder="Search by title, author, ISBN, subject"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
          <div className="librarian-form-grid">
            <select
              className="library-select"
              name="availability"
              value={filters.availability}
              onChange={onFilterChange}
            >
              <option value="">Availability</option>
              {filterOptions.availability.map((value) => (
                <option key={value} value={value}>{value}</option>
              ))}
            </select>
            <select
              className="library-select"
              name="location"
              value={filters.location}
              onChange={onFilterChange}
            >
              <option value="">Location</option>
              {filterOptions.location.map((value) => (
                <option key={value} value={value}>{value}</option>
              ))}
            </select>
            <select
              className="library-select"
              name="subject"
              value={filters.subject}
              onChange={onFilterChange}
            >
              <option value="">Subject</option>
              {filterOptions.subject.map((value) => (
                <option key={value} value={value}>{value}</option>
              ))}
            </select>
            <select
              className="library-select"
              name="format"
              value={filters.format}
              onChange={onFilterChange}
            >
              <option value="">Format</option>
              {filterOptions.format.map((value) => (
                <option key={value} value={value}>{value}</option>
              ))}
            </select>
          </div>
          <div className="librarian-actions">
            <button type="button" className="library-btn library-btn-primary">
              Search
            </button>
            <button type="button" className="library-btn library-btn-ghost" onClick={onResetFilters}>
              Reset
            </button>
          </div>
        </div>
      </section>

      <section className="library-panel">
        <div className="library-list-toolbar">
          <h3 className="library-panel-title">Results ({filteredItems.length})</h3>
          <span className="librarian-help">Filtered by availability, location, subject, and format.</span>
        </div>
        {filteredItems.length === 0 ? (
          <div className="librarian-empty">No catalog records match the current filters.</div>
        ) : (
          <table className="librarian-table">
            <thead>
              <tr>
                <th>Title</th>
                <th>Author</th>
                <th>ISBN</th>
                <th>Subject</th>
                <th>Location</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredItems.map((item) => (
                <tr key={item.id}>
                  <td>{item.title}</td>
                  <td>{item.author}</td>
                  <td>{item.isbn}</td>
                  <td>{item.subject}</td>
                  <td>{item.location}</td>
                  <td>
                    <span className={`librarian-pill is-${item.availability}`}>
                      {item.availability}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </section>
  )
}
