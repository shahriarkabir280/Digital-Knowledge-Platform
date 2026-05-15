import { Link } from 'react-router-dom'
import { User, BookOpen, Clock, Upload } from 'lucide-react'
import { UPLOAD_HISTORY } from '../modules/library/data.js'
import { useAuth } from '../app/use-auth.js'
import './LibrarySection.css'

const STATUS_COLORS = {
  Published: { bg: '#d1fae5', color: '#065f46' },
  'In Review': { bg: '#fef3c7', color: '#92400e' },
  Draft:       { bg: 'hsl(var(--secondary))', color: 'hsl(var(--muted-foreground))' },
}

export default function LibraryProfilePage() {
  const { authState } = useAuth()

  const avatarLabel = (authState?.name || 'U').trim().charAt(0).toUpperCase()

  return (
    <section className="library-page">
      {/* Hero */}
      <header className="library-panel" style={{
        background: 'linear-gradient(135deg, var(--brand-50) 0%, #fff 60%)',
        border: '1px solid var(--accent-soft)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px', flexWrap: 'wrap' }}>
          <div style={{
            width: '72px',
            height: '72px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, var(--brand-500), var(--brand-700))',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            fontSize: '1.8rem',
            fontWeight: 800,
            flexShrink: 0,
            border: '3px solid var(--accent-soft)',
          }}>
            {avatarLabel}
          </div>
          <div style={{ flex: 1 }}>
            <p className="library-kicker">User Profile</p>
            <h2 style={{ margin: '4px 0 2px', color: 'var(--ink)', fontSize: 'clamp(1.2rem,2vw,1.6rem)', fontWeight: 800, letterSpacing: '-.02em' }}>
              {authState.name || 'Anonymous User'}
            </h2>
            <p style={{ color: 'var(--muted)', fontSize: '.875rem' }}>
              {authState.role || 'MEMBER'} · Department of Computer Science &amp; Engineering
            </p>
          </div>
          <Link to="/library/settings" className="library-btn library-btn-ghost" style={{ flexShrink: 0 }}>
            Edit Settings
          </Link>
        </div>
      </header>

      {/* Stats row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '10px' }}>
        {[
          { icon: <BookOpen size={18} />, label: 'Bookmarks',      value: '38' },
          { icon: <Clock size={18} />,    label: 'Viewed this week', value: '14' },
          { icon: <Upload size={18} />,   label: 'Uploads',         value: String(UPLOAD_HISTORY.length) },
          { icon: <User size={18} />,     label: 'Role',            value: authState.role || 'MEMBER' },
        ].map(({ icon, label, value }) => (
          <div key={label} style={{
            background: '#fff',
            border: '1px solid hsl(var(--border))',
            borderRadius: '12px',
            padding: '14px 16px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
          }}>
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '8px',
              background: 'var(--accent-bg)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--accent)',
              flexShrink: 0,
            }}>
              {icon}
            </div>
            <div>
              <p style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: 'var(--ink)', lineHeight: 1 }}>{value}</p>
              <p style={{ margin: '2px 0 0', fontSize: '.72rem', color: 'var(--muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.06em' }}>{label}</p>
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) 280px', gap: '12px', alignItems: 'start' }}>
        {/* Upload history */}
        <section className="library-panel">
          <h3 className="library-section-title" style={{ marginBottom: '14px' }}>Upload History</h3>
          <div style={{ display: 'grid', gap: '8px' }}>
            {UPLOAD_HISTORY.map((item) => {
              const colors = STATUS_COLORS[item.status] || STATUS_COLORS.Draft
              return (
                <div key={item.id} style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '12px',
                  padding: '12px 14px',
                  borderRadius: '10px',
                  border: '1px solid hsl(var(--border))',
                  background: '#fff',
                }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ margin: 0, fontWeight: 600, color: 'var(--ink)', fontSize: '.875rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {item.title}
                    </p>
                    <p style={{ margin: '2px 0 0', fontSize: '.78rem', color: 'var(--muted)' }}>
                      {item.views} views
                    </p>
                  </div>
                  <span style={{
                    padding: '3px 10px',
                    borderRadius: '999px',
                    fontSize: '.72rem',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '.06em',
                    background: colors.bg,
                    color: colors.color,
                    flexShrink: 0,
                  }}>
                    {item.status}
                  </span>
                </div>
              )
            })}
          </div>
        </section>

        {/* Recommendations */}
        <aside className="library-suggestion">
          <h4 className="library-suggestion-title" style={{ marginBottom: '12px' }}>Recommended for You</h4>
          <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'grid', gap: '8px' }}>
            {[
              'AI-generated reading list for CSE-425',
              'High-rated distributed systems references',
              'New thesis templates in your department',
            ].map((item) => (
              <li key={item} style={{
                padding: '10px 12px',
                borderRadius: '8px',
                background: 'hsl(var(--muted))',
                fontSize: '.82rem',
                color: 'var(--ink)',
                lineHeight: 1.4,
              }}>
                {item}
              </li>
            ))}
          </ul>
        </aside>
      </div>
    </section>
  )
}
