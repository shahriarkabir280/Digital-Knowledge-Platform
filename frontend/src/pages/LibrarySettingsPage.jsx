import './LibrarySection.css'

export default function LibrarySettingsPage() {
  return (
    <section className="library-page">
      <header className="library-panel">
        <p className="library-kicker">Settings</p>
        <h2 style={{ margin: '6px 0', color: '#173042' }}>Customize notifications, defaults, and privacy</h2>
        <p style={{ color: '#355064' }}>
          Configure your library experience with access defaults, alerts, and recommendation controls.
        </p>
      </header>

      <section className="library-panel">
        <div className="library-setting-grid">
          <div className="library-setting-row">
            <div>
              <strong style={{ color: '#1c3446' }}>Email on new uploads in followed courses</strong>
              <p style={{ margin: '4px 0 0', color: '#4f6677' }}>Receive daily digest notifications.</p>
            </div>
            <div className="library-toggle-switch" aria-hidden="true">
              <span />
            </div>
          </div>

          <div className="library-setting-row">
            <div>
              <strong style={{ color: '#1c3446' }}>Enable AI-powered suggestions</strong>
              <p style={{ margin: '4px 0 0', color: '#4f6677' }}>Use history and course profile for suggestions.</p>
            </div>
            <div className="library-toggle-switch" aria-hidden="true">
              <span />
            </div>
          </div>

          <div className="library-setting-row">
            <div>
              <strong style={{ color: '#1c3446' }}>Default upload visibility: Restricted</strong>
              <p style={{ margin: '4px 0 0', color: '#4f6677' }}>Only department members can access by default.</p>
            </div>
            <button type="button" className="library-btn library-btn-ghost">
              Change
            </button>
          </div>
        </div>
      </section>
    </section>
  )
}
