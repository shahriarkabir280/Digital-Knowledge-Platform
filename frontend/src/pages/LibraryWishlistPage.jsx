import { useState } from 'react'
import { WISHLISTS } from '../modules/library/librarian-data.js'
import './LibrarySection.css'
import './LibraryLibrarian.css'

export default function LibraryWishlistPage() {
  const [wishlist, setWishlist] = useState(WISHLISTS)

  const updateStatus = (id, status) => {
    setWishlist((current) =>
      current.map((item) => (item.id === id ? { ...item, status } : item)),
    )
  }

  return (
    <section className="library-page">
      <header className="library-panel">
        <p className="library-kicker">Wishlist</p>
        <h2 style={{ margin: '6px 0', color: 'var(--ink)', fontSize: 'clamp(1.3rem,2vw,1.8rem)', fontWeight: 800, letterSpacing: '-.02em' }}>
          Manage member wishlists
        </h2>
        <p style={{ color: 'var(--muted)', fontSize: '.9rem', lineHeight: 1.6 }}>
          Track interest and send updates when items change status.
        </p>
      </header>

      <section className="library-panel">
        <table className="librarian-table">
          <thead>
            <tr>
              <th>Member</th>
              <th>Title</th>
              <th>Status</th>
              <th>Updated</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {wishlist.map((item) => (
              <tr key={item.id}>
                <td>{item.member}</td>
                <td>{item.title}</td>
                <td>
                  <span className={`librarian-pill is-${item.status}`}>
                    {item.status}
                  </span>
                </td>
                <td>{item.updatedAt}</td>
                <td>
                  <div className="librarian-actions">
                    <button
                      type="button"
                      className="library-btn library-btn-primary"
                      onClick={() => updateStatus(item.id, 'notified')}
                    >
                      Notify
                    </button>
                    <button
                      type="button"
                      className="library-btn library-btn-ghost"
                      onClick={() => updateStatus(item.id, 'removed')}
                    >
                      Remove
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
