import { Link } from 'react-router-dom'
import { Bookmark } from 'lucide-react'
import { RESOURCE_ITEMS } from '../modules/library/data.js'
import './LibrarySection.css'

const SAVED_IDS = ['res-001', 'res-006', 'res-008']
{/*comment testing*/}
export default function LibraryBookmarksPage() {
  const savedItems = RESOURCE_ITEMS.filter((item) => SAVED_IDS.includes(item.id))

  return (
    <section className="library-page">
      <header className="library-panel" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap' }}>
        <div>
          <p className="library-kicker">Bookmarks</p>
          <h2 style={{ margin: '6px 0', color: 'var(--ink)', fontSize: 'clamp(1.3rem,2vw,1.8rem)', fontWeight: 800, letterSpacing: '-.02em' }}>
            Your saved resources
          </h2>
          <p style={{ color: 'var(--muted)', fontSize: '.9rem', lineHeight: 1.6 }}>
            Quick access to frequently used materials across courses and semesters.
          </p>
        </div>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '10px 16px',
          background: 'var(--accent-bg)',
          borderRadius: '10px',
          border: '1px solid var(--accent-soft)',
        }}>
          <Bookmark size={16} style={{ color: 'var(--accent-strong)' }} />
          <span style={{ fontSize: '.85rem', fontWeight: 700, color: 'var(--accent-strong)' }}>
            {savedItems.length} saved
          </span>
        </div>
      </header>

      {savedItems.length === 0 ? (
        <section className="library-panel" style={{ textAlign: 'center', padding: '48px 20px' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '12px' }}>🔖</div>
          <p style={{ color: 'var(--muted)', fontSize: '.9rem' }}>
            No bookmarks yet. Browse the library and save resources you want to revisit.
          </p>
          <Link to="/library" className="library-btn library-btn-primary" style={{ marginTop: '16px', display: 'inline-flex' }}>
            Browse Library
          </Link>
        </section>
      ) : (
        <section className="library-panel">
          <div className="library-card-grid">
            {savedItems.map((item) => (
              <article key={item.id} className="library-card" style={{ transition: 'box-shadow .15s, border-color .15s' }}>
                <div className="library-card-top">
                  <span className="library-file-pill">{item.type}</span>
                  <button type="button" className="library-bookmark is-active" aria-label="Remove bookmark">
                    🔖
                  </button>
                </div>
                <div className="library-card-headings">
                  <h3>{item.title}</h3>
                  <p>{item.author} · {item.course}</p>
                </div>
                <p className="library-card-summary">{item.summary}</p>
                <div className="library-metrics-row">
                  <span>⭐ {item.rating}</span>
                  <span>⬇ {item.downloads?.toLocaleString()}</span>
                  <span>{new Date(item.updatedAt).toLocaleDateString()}</span>
                </div>
                <div className="library-card-actions">
                  <Link to={`/library/resource/${item.id}`} className="library-btn library-btn-primary">
                    Open
                  </Link>
                  <button type="button" className="library-btn library-btn-ghost">
                    Remove
                  </button>
                </div>
              </article>
            ))}
          </div>
        </section>
      )}
    </section>
  )
}
