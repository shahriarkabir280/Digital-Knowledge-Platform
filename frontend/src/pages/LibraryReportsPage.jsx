import { useState } from 'react'
import { REPORT_CARDS } from '../modules/library/librarian-data.js'
import './LibrarySection.css'
import './LibraryLibrarian.css'

export default function LibraryReportsPage() {
  const [range, setRange] = useState('last-30')

  return (
    <section className="library-page">
      <header className="library-panel">
        <p className="library-kicker">Librarian Reports</p>
        <h2 style={{ margin: '6px 0', color: 'var(--ink)', fontSize: 'clamp(1.3rem,2vw,1.8rem)', fontWeight: 800, letterSpacing: '-.02em' }}>
          Circulation and inventory insights
        </h2>
        <p style={{ color: 'var(--muted)', fontSize: '.9rem', lineHeight: 1.6 }}>
          Generate 10+ report types with export to PDF or Excel.
        </p>
      </header>

      <section className="library-panel">
        <div className="librarian-inline-inputs">
          <select
            className="library-select"
            value={range}
            onChange={(event) => setRange(event.target.value)}
          >
            <option value="last-7">Last 7 days</option>
            <option value="last-30">Last 30 days</option>
            <option value="quarter">Quarter to date</option>
            <option value="year">Year to date</option>
          </select>
          <button type="button" className="library-btn library-btn-primary">Generate report</button>
        </div>
      </section>

      <section className="library-panel">
        <div className="librarian-grid">
          {REPORT_CARDS.map((report) => (
            <div key={report.id} className="librarian-card">
              <h3>{report.title}</h3>
              <p>{report.description}</p>
              <span className="librarian-help">Formats: {report.format}</span>
              <button type="button" className="library-btn library-btn-ghost" style={{ width: 'fit-content' }}>
                Export
              </button>
            </div>
          ))}
        </div>
      </section>
    </section>
  )
}
