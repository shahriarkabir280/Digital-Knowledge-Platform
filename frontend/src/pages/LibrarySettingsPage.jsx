import { useState } from 'react'
import './LibrarySection.css'

const SETTINGS = [
  {
    id: 'email-notify',
    title: 'Email on new uploads in followed courses',
    description: 'Receive a daily digest when new materials are added to your courses.',
    defaultOn: true,
  },
  {
    id: 'ai-suggestions',
    title: 'AI-powered suggestions',
    description: 'Use your reading history and course profile to surface relevant resources.',
    defaultOn: true,
  },
  {
    id: 'default-visibility',
    title: 'Default upload visibility: Restricted',
    description: 'Only department members can access your uploads by default.',
    defaultOn: false,
    action: true,
  },
  {
    id: 'download-notify',
    title: 'Notify me when my uploads are downloaded',
    description: 'Get a weekly summary of download activity on your resources.',
    defaultOn: false,
  },
]

function Toggle({ on, onChange }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      onClick={() => onChange(!on)}
      style={{
        width: '44px',
        height: '24px',
        borderRadius: '999px',
        border: 'none',
        background: on ? 'var(--accent)' : 'hsl(var(--border))',
        padding: '2px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: on ? 'flex-end' : 'flex-start',
        cursor: 'pointer',
        transition: 'background .2s',
        flexShrink: 0,
      }}
    >
      <span style={{
        width: '20px',
        height: '20px',
        borderRadius: '50%',
        background: '#fff',
        boxShadow: '0 1px 3px rgba(0,0,0,.2)',
        display: 'block',
        transition: 'transform .2s',
      }} />
    </button>
  )
}

export default function LibrarySettingsPage() {
  const [states, setStates] = useState(() =>
    Object.fromEntries(SETTINGS.map((s) => [s.id, s.defaultOn]))
  )

  const toggle = (id) => setStates((prev) => ({ ...prev, [id]: !prev[id] }))

  return (
    <section className="library-page">
      <header className="library-panel">
        <p className="library-kicker">Settings</p>
        <h2 style={{ margin: '6px 0', color: 'var(--ink)', fontSize: 'clamp(1.3rem,2vw,1.8rem)', fontWeight: 800, letterSpacing: '-.02em' }}>
          Notifications, defaults &amp; privacy
        </h2>
        <p style={{ color: 'var(--muted)', fontSize: '.9rem', lineHeight: 1.6 }}>
          Configure your library experience with access defaults, alerts, and recommendation controls.
        </p>
      </header>

      <section className="library-panel">
        <h3 className="library-section-title" style={{ marginBottom: '16px' }}>Preferences</h3>
        <div style={{ display: 'grid', gap: '2px' }}>
          {SETTINGS.map((setting) => (
            <div
              key={setting.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '16px',
                padding: '16px',
                borderRadius: '10px',
                background: '#fff',
                border: '1px solid hsl(var(--border))',
                marginBottom: '8px',
                transition: 'border-color .12s',
              }}
            >
              <div style={{ flex: 1 }}>
                <p style={{ margin: 0, fontWeight: 600, color: 'var(--ink)', fontSize: '.9rem' }}>
                  {setting.title}
                </p>
                <p style={{ margin: '3px 0 0', color: 'var(--muted)', fontSize: '.8rem', lineHeight: 1.5 }}>
                  {setting.description}
                </p>
              </div>
              {setting.action ? (
                <button type="button" className="library-btn library-btn-ghost" style={{ flexShrink: 0, fontSize: '.8rem' }}>
                  Change
                </button>
              ) : (
                <Toggle on={states[setting.id]} onChange={() => toggle(setting.id)} />
              )}
            </div>
          ))}
        </div>
      </section>

      <section className="library-panel">
        <h3 className="library-section-title" style={{ marginBottom: '16px' }}>Danger Zone</h3>
        <div style={{
          padding: '16px',
          borderRadius: '10px',
          border: '1px solid #fecaca',
          background: '#fef2f2',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '16px',
          flexWrap: 'wrap',
        }}>
          <div>
            <p style={{ margin: 0, fontWeight: 600, color: '#991b1b', fontSize: '.9rem' }}>Clear reading history</p>
            <p style={{ margin: '3px 0 0', color: '#b91c1c', fontSize: '.8rem' }}>
              This will remove all recently viewed records and reset recommendations.
            </p>
          </div>
          <button type="button" style={{
            padding: '8px 16px',
            borderRadius: '8px',
            border: '1px solid #fca5a5',
            background: '#fff',
            color: '#dc2626',
            fontWeight: 600,
            fontSize: '.85rem',
            cursor: 'pointer',
            flexShrink: 0,
          }}>
            Clear History
          </button>
        </div>
      </section>
    </section>
  )
}
