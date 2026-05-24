import { useMemo, useState } from 'react'
import { BORROW_HISTORY } from '../modules/library/librarian-data.js'
import './LibrarySection.css'
import './LibraryLibrarian.css'

export default function LibraryBorrowingHistoryPage() {
  const [memberQuery, setMemberQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('')

  const filtered = useMemo(() => {
    return BORROW_HISTORY.filter((entry) => {
      const matchesMember =
        !memberQuery.trim() ||
        entry.member.toLowerCase().includes(memberQuery.toLowerCase())
      const matchesStatus = !statusFilter || entry.status === statusFilter
      return matchesMember && matchesStatus
    })
  }, [memberQuery, statusFilter])

  return (
    <section className="library-page">
      <header className="library-panel">
        <p className="library-kicker">Borrowing History</p>
        <h2 style={{ margin: '6px 0', color: 'var(--ink)', fontSize: 'clamp(1.3rem,2vw,1.8rem)', fontWeight: 800, letterSpacing: '-.02em' }}>
          Review member borrowing history
        </h2>
        <p style={{ color: 'var(--muted)', fontSize: '.9rem', lineHeight: 1.6 }}>
          Export records to CSV or PDF for audit and compliance.
        </p>
      </header>

      <section className="library-panel">
        <div className="librarian-inline-inputs">
          <input
            className="library-input"
            placeholder="Filter by member name"
            value={memberQuery}
            onChange={(event) => setMemberQuery(event.target.value)}
          />
          <select
            className="library-select"
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
          >
            <option value="">All statuses</option>
            <option value="checked-out">Checked-out</option>
            <option value="overdue">Overdue</option>
            <option value="returned">Returned</option>
          </select>
          <button type="button" className="library-btn library-btn-ghost">Export CSV</button>
          <button type="button" className="library-btn library-btn-ghost">Export PDF</button>
        </div>
      </section>

      <section className="library-panel">
        <table className="librarian-table">
          <thead>
            <tr>
              <th>Member</th>
              <th>Item</th>
              <th>Checkout</th>
              <th>Return</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((entry) => (
              <tr key={entry.id}>
                <td>{entry.member}</td>
                <td>{entry.title}</td>
                <td>{entry.checkoutDate}</td>
                <td>{entry.returnDate || 'Active'}</td>
                <td>
                  <span className={`librarian-pill is-${entry.status}`}>
                    {entry.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </section>
  )
}
