import { UPLOAD_HISTORY } from '../modules/library/data.js'
import { useAuth } from '../app/use-auth.js'
import './LibrarySection.css'

export default function LibraryProfilePage() {
  const { authState } = useAuth()

  return (
    <section className="library-page">
      <header className="library-panel">
        <p className="library-kicker">User Profile</p>
        <h2 style={{ margin: '6px 0', color: '#173042' }}>Your library activity and personal workspace</h2>
        <p style={{ color: '#355064' }}>
          Track uploads, bookmarks, and reading behavior from one unified place.
        </p>
      </header>

      <div className="library-main-grid">
        <section className="library-panel" style={{ display: 'grid', gap: '10px' }}>
          <h3 className="library-section-title">Account Snapshot</h3>
          <ul className="library-profile-list">
            <li>Name: {authState.name || 'Anonymous'}</li>
            <li>Role: {authState.role || 'MEMBER'}</li>
            <li>Department: Computer Science and Engineering</li>
            <li>Bookmarks: 38 resources</li>
            <li>Recently viewed: 14 this week</li>
          </ul>
        </section>

        <aside className="library-suggestion">
          <h4 className="library-suggestion-title">Recommendations for You</h4>
          <ul className="library-mini-list">
            <li>AI-generated reading list for CSE-425</li>
            <li>High-rated distributed systems references</li>
            <li>New thesis templates in your department</li>
          </ul>
        </aside>
      </div>

      <section className="library-panel">
        <h3 className="library-section-title">Uploads and Performance</h3>
        <ul className="library-upload-history" style={{ marginTop: '10px' }}>
          {UPLOAD_HISTORY.map((item) => (
            <li key={item.id}>
              <strong>{item.title}</strong> · {item.status} · {item.views} views
            </li>
          ))}
        </ul>
      </section>
    </section>
  )
}
