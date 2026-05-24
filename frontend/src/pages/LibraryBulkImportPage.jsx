import { useState } from 'react'
import { BULK_IMPORT_LOGS } from '../modules/library/librarian-data.js'
import './LibrarySection.css'
import './LibraryLibrarian.css'

export default function LibraryBulkImportPage() {
  const [selectedFile, setSelectedFile] = useState(null)

  return (
    <section className="library-page">
      <header className="library-panel">
        <p className="library-kicker">Bulk Import</p>
        <h2 style={{ margin: '6px 0', color: 'var(--ink)', fontSize: 'clamp(1.3rem,2vw,1.8rem)', fontWeight: 800, letterSpacing: '-.02em' }}>
          Import catalog data from MARC or CSV
        </h2>
        <p style={{ color: 'var(--muted)', fontSize: '.9rem', lineHeight: 1.6 }}>
          Supports up to 10,000 records with validation and duplicate detection.
        </p>
      </header>

      <section className="library-panel" style={{ display: 'grid', gap: '12px' }}>
        <div className="librarian-inline-inputs">
          <input
            className="library-input"
            type="file"
            accept=".csv,.marc,.mrc"
            onChange={(event) => setSelectedFile(event.target.files?.[0] || null)}
          />
          <button type="button" className="library-btn library-btn-primary" disabled={!selectedFile}>
            Start import
          </button>
        </div>
        <p className="librarian-help">Selected file: {selectedFile ? selectedFile.name : 'None'}</p>
      </section>

      <section className="library-panel">
        <h3 className="library-panel-title">Recent import runs</h3>
        <table className="librarian-table">
          <thead>
            <tr>
              <th>File</th>
              <th>Status</th>
              <th>Total</th>
              <th>Added</th>
              <th>Duplicates</th>
              <th>Errors</th>
            </tr>
          </thead>
          <tbody>
            {BULK_IMPORT_LOGS.map((log) => (
              <tr key={log.id}>
                <td>{log.file}</td>
                <td>
                  <span className={`librarian-pill is-${log.status === 'complete' ? 'paid' : 'queued'}`}>
                    {log.status}
                  </span>
                </td>
                <td>{log.total}</td>
                <td>{log.added}</td>
                <td>{log.duplicates}</td>
                <td>{log.errors}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </section>
  )
}
