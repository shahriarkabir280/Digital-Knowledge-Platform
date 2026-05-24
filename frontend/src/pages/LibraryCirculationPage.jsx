import { useMemo, useState } from 'react'
import { CATALOG_ITEMS, CIRCULATION_LOANS } from '../modules/library/librarian-data.js'
import './LibrarySection.css'
import './LibraryLibrarian.css'

const MAX_RENEWALS = 2

const buildDueDate = (daysFromNow) => {
  const date = new Date()
  date.setDate(date.getDate() + daysFromNow)
  return date.toISOString().slice(0, 10)
}

export default function LibraryCirculationPage() {
  const [loans, setLoans] = useState(CIRCULATION_LOANS)
  const [checkout, setCheckout] = useState({ member: '', barcode: '' })
  const [message, setMessage] = useState('')

  const inventoryByBarcode = useMemo(() => {
    return CATALOG_ITEMS.reduce((acc, item) => {
      acc[item.barcode] = item
      return acc
    }, {})
  }, [])

  const onCheckout = () => {
    setMessage('')
    const item = inventoryByBarcode[checkout.barcode.trim()]
    if (!checkout.member.trim() || !checkout.barcode.trim()) {
      setMessage('Member name and barcode are required for checkout.')
      return
    }
    if (!item) {
      setMessage('Barcode not found in catalog.')
      return
    }
    const nextLoan = {
      id: `loan-${Date.now()}`,
      member: checkout.member.trim(),
      title: item.title,
      barcode: item.barcode,
      dueDate: buildDueDate(14),
      renewals: 0,
      status: 'checked-out',
    }
    setLoans((current) => [nextLoan, ...current])
    setCheckout({ member: '', barcode: '' })
    setMessage('Checkout recorded.')
  }

  const onRenew = (loanId) => {
    setLoans((current) =>
      current.map((loan) => {
        if (loan.id !== loanId) return loan
        if (loan.renewals >= MAX_RENEWALS) return loan
        return {
          ...loan,
          renewals: loan.renewals + 1,
          dueDate: buildDueDate(14),
        }
      }),
    )
  }

  const onReturn = (loanId) => {
    setLoans((current) =>
      current.map((loan) =>
        loan.id === loanId ? { ...loan, status: 'returned' } : loan,
      ),
    )
  }

  return (
    <section className="library-page">
      <header className="library-panel">
        <p className="library-kicker">Lending Workflow</p>
        <h2 style={{ margin: '6px 0', color: 'var(--ink)', fontSize: 'clamp(1.3rem,2vw,1.8rem)', fontWeight: 800, letterSpacing: '-.02em' }}>
          Checkout, renew, and return items
        </h2>
        <p style={{ color: 'var(--muted)', fontSize: '.9rem', lineHeight: 1.6 }}>
          Members can borrow available items with two renewals maximum.
        </p>
      </header>

      <section className="library-panel" style={{ display: 'grid', gap: '12px' }}>
        <h3 className="library-panel-title">Quick checkout</h3>
        <div className="librarian-inline-inputs">
          <input
            className="library-input"
            placeholder="Member name or ID"
            value={checkout.member}
            onChange={(event) => setCheckout((current) => ({ ...current, member: event.target.value }))}
          />
          <input
            className="library-input"
            placeholder="Scan or enter barcode"
            value={checkout.barcode}
            onChange={(event) => setCheckout((current) => ({ ...current, barcode: event.target.value }))}
          />
          <button type="button" className="library-btn library-btn-primary" onClick={onCheckout}>
            Checkout
          </button>
        </div>
        {message ? <p className="librarian-help">{message}</p> : null}
      </section>

      <section className="library-panel">
        <div className="library-list-toolbar">
          <h3 className="library-panel-title">Active circulation</h3>
          <span className="librarian-help">Renewals: {MAX_RENEWALS} max</span>
        </div>
        {loans.length === 0 ? (
          <div className="librarian-empty">No active loans.</div>
        ) : (
          <table className="librarian-table">
            <thead>
              <tr>
                <th>Member</th>
                <th>Item</th>
                <th>Barcode</th>
                <th>Due</th>
                <th>Renewals</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loans.map((loan) => (
                <tr key={loan.id}>
                  <td>{loan.member}</td>
                  <td>{loan.title}</td>
                  <td>{loan.barcode}</td>
                  <td>{loan.dueDate}</td>
                  <td>{loan.renewals}</td>
                  <td>
                    <span className={`librarian-pill is-${loan.status}`}>
                      {loan.status}
                    </span>
                  </td>
                  <td>
                    <div className="librarian-actions">
                      <button
                        type="button"
                        className="library-btn library-btn-ghost"
                        disabled={loan.renewals >= MAX_RENEWALS || loan.status === 'returned'}
                        onClick={() => onRenew(loan.id)}
                      >
                        Renew
                      </button>
                      <button
                        type="button"
                        className="library-btn library-btn-primary"
                        disabled={loan.status === 'returned'}
                        onClick={() => onReturn(loan.id)}
                      >
                        Return
                      </button>
                    </div>
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
