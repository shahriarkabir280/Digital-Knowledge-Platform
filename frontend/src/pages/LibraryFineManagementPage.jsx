import { useState } from 'react'
import { FINES } from '../modules/library/librarian-data.js'
import './LibrarySection.css'
import './LibraryLibrarian.css'

export default function LibraryFineManagementPage() {
  const [fines, setFines] = useState(FINES)

  const updateStatus = (id, status) => {
    setFines((current) =>
      current.map((fine) => (fine.id === id ? { ...fine, status } : fine)),
    )
  }

  const totalOutstanding = fines
    .filter((fine) => fine.status === 'unpaid')
    .reduce((sum, fine) => sum + fine.total, 0)

  return (
    <section className="library-page">
      <header className="library-panel">
        <p className="library-kicker">Fine Management</p>
        <h2 style={{ margin: '6px 0', color: 'var(--ink)', fontSize: 'clamp(1.3rem,2vw,1.8rem)', fontWeight: 800, letterSpacing: '-.02em' }}>
          Track overdue fines and payments
        </h2>
        <p style={{ color: 'var(--muted)', fontSize: '.9rem', lineHeight: 1.6 }}>
          Fines are calculated per policy and shown in member accounts.
        </p>
      </header>

      <section className="library-panel">
        <div className="librarian-summary">
          <div className="librarian-summary-tile">
            <strong>BDT {totalOutstanding}</strong>
            <span>Outstanding fines</span>
          </div>
          <div className="librarian-summary-tile">
            <strong>{fines.length}</strong>
            <span>Accounts with balances</span>
          </div>
        </div>
      </section>

      <section className="library-panel">
        <table className="librarian-table">
          <thead>
            <tr>
              <th>Member</th>
              <th>Items</th>
              <th>Total</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {fines.map((fine) => (
              <tr key={fine.id}>
                <td>{fine.member}</td>
                <td>
                  {fine.items.map((item) => (
                    <div key={item.title} className="librarian-help">
                      {item.title} - {item.daysLate} days late (BDT {item.amount})
                    </div>
                  ))}
                </td>
                <td>BDT {fine.total}</td>
                <td>
                  <span className={`librarian-pill is-${fine.status}`}>
                    {fine.status}
                  </span>
                </td>
                <td>
                  <div className="librarian-actions">
                    <button
                      type="button"
                      className="library-btn library-btn-primary"
                      onClick={() => updateStatus(fine.id, 'paid')}
                      disabled={fine.status !== 'unpaid'}
                    >
                      Record payment
                    </button>
                    <button
                      type="button"
                      className="library-btn library-btn-ghost"
                      onClick={() => updateStatus(fine.id, 'waived')}
                      disabled={fine.status !== 'unpaid'}
                    >
                      Waive
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
