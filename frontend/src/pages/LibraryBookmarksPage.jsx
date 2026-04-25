import { Link } from 'react-router-dom'
import { RESOURCE_ITEMS } from '../modules/library/data.js'
import './LibrarySection.css'

const SAVED_IDS = ['res-001', 'res-006', 'res-008']

export default function LibraryBookmarksPage() {
  const savedItems = RESOURCE_ITEMS.filter((item) => SAVED_IDS.includes(item.id))

  return (
    <section className="library-page">
      <header className="library-panel">
        <p className="library-kicker">Bookmarks</p>
        <h2 style={{ margin: '6px 0', color: '#173042' }}>Your favorite learning resources</h2>
        <p style={{ color: '#355064' }}>
          Keep quick access to frequently used materials across courses and semesters.
        </p>
      </header>

      <section className="library-panel">
        <div className="library-card-grid">
          {savedItems.map((item) => (
            <article key={item.id} className="library-card">
              <div className="library-card-headings">
                <h3>{item.title}</h3>
                <p>
                  {item.author} · {item.course}
                </p>
              </div>
              <p className="library-card-summary">{item.summary}</p>
              <div className="library-metrics-row">
                <span>Rating {item.rating}</span>
                <span>{item.downloads} downloads</span>
                <span>Updated {new Date(item.updatedAt).toLocaleDateString()}</span>
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
    </section>
  )
}
