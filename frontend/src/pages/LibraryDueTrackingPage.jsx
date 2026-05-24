import { useState } from 'react'
import { DUE_ALERTS } from '../modules/library/librarian-data.js'
import './LibrarySection.css'
import './LibraryLibrarian.css'

const REMINDER_SCHEDULE = [
  { label: '3 days before due date', key: 'three-day' },
  { label: '1 day before due date', key: 'one-day' },
  { label: 'Daily after due date', key: 'overdue' },
]

export default function LibraryDueTrackingPage() {
  const [notificationsEnabled, setNotificationsEnabled] = useState(true)

  return (
    <section className="library-page">
      <header className="library-panel">
        <p className="library-kicker">Due Tracking</p>
        <h2 style={{ margin: '6px 0', color: 'var(--ink)', fontSize: 'clamp(1.3rem,2vw,1.8rem)', fontWeight: 800, letterSpacing: '-.02em' }}>
          Monitor due dates and notifications
        </h2>
        <p style={{ color: 'var(--muted)', fontSize: '.9rem', lineHeight: 1.6 }}>
          Email reminders are scheduled 3 days, 1 day before, and daily after due dates.
        </p>
      </header>

      <section className="library-panel">
        <div className="library-list-toolbar">
          <h3 className="library-panel-title">Notification schedule</h3>
          <label className="librarian-help" style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <input
              type="checkbox"
              checked={notificationsEnabled}
              onChange={(event) => setNotificationsEnabled(event.target.checked)}
            />
            Notifications enabled
          </label>
        </div>
        <div className="librarian-grid">
          {REMINDER_SCHEDULE.map((item) => (
            <div key={item.key} className="librarian-card">
              <h3>{item.label}</h3>
              <p>Auto-send reminder when item matches this window.</p>
            </div>
          ))}
        </div>
      </section>

      <section className="library-panel">
        <h3 className="library-panel-title">Upcoming and overdue items</h3>
        <table className="librarian-table">
          <thead>
            <tr>
              <th>Member</th>
              <th>Item</th>
              <th>Due date</th>
              <th>Days left</th>
              <th>Status</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {DUE_ALERTS.map((alert) => (
              <tr key={alert.id}>
                <td>{alert.member}</td>
                <td>{alert.title}</td>
                <td>{alert.dueDate}</td>
                <td>{alert.daysUntilDue}</td>
                <td>
                  <span className={`librarian-pill is-${alert.status}`}>
                    {alert.status}
                  </span>
                </td>
                <td>
                  <button type="button" className="library-btn library-btn-ghost">
                    Send reminder
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </section>
  )
}
