import { useState } from 'react'
import { HOLD_REQUESTS } from '../modules/library/librarian-data.js'
import './LibrarySection.css'
import './LibraryLibrarian.css'

export default function LibraryHoldRequestsPage() {
  const [holds, setHolds] = useState(HOLD_REQUESTS)

  const updateHold = (id, status) => {
    setHolds((current) =>
      current.map((hold) => (hold.id === id ? { ...hold, status } : hold)),
    )
  }

  return (
    <section className="library-page">
      <header className="library-panel">
        <p className="library-kicker">Hold Requests</p>
        <h2 style={{ margin: '6px 0', color: 'var(--ink)', fontSize: 'clamp(1.3rem,2vw,1.8rem)', fontWeight: 800, letterSpacing: '-.02em' }}>
          Queue and fulfill hold requests
        </h2>
        <p style={{ color: 'var(--muted)', fontSize: '.9rem', lineHeight: 1.6 }}>
          Notify members when items become available.
        </p>
      </header>

      <section className="library-panel">
        <table className="librarian-table">
          <thead>
            <tr>
              <th>Member</th>
              <th>Title</th>
              <th>Placed</th>
              <th>Queue</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {holds.map((hold) => (
              <tr key={hold.id}>
                <td>{hold.member}</td>
                <td>{hold.title}</td>
                <td>{hold.placedAt}</td>
                <td>{hold.position}</td>
                <td>
                  <span className={`librarian-pill is-${hold.status}`}>
                    {hold.status}
                  </span>
                </td>
                <td>
                  <div className="librarian-actions">
                    <button
                      type="button"
                      className="library-btn library-btn-primary"
                      onClick={() => updateHold(hold.id, 'fulfilled')}
                      disabled={hold.status !== 'queued'}
                    >
                      Fulfill
                    </button>
                    <button
                      type="button"
                      className="library-btn library-btn-ghost"
                      onClick={() => updateHold(hold.id, 'cancelled')}
                      disabled={hold.status !== 'queued'}
                    >
                      Cancel
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </section>
  )
}
