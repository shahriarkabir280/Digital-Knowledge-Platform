import StatTile from '../modules/library/components/StatTile.jsx'
import { ANALYTICS_SUMMARY } from '../modules/library/data.js'
import './LibrarySection.css'

const BAR_HEIGHTS = [38, 62, 78, 54, 92, 70, 84]
const BAR_LABELS  = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

export default function LibraryAnalyticsPage() {
  return (
    <section className="library-page">
      <header className="library-panel">
        <p className="library-kicker">Admin Analytics</p>
        <h2 style={{ margin: '6px 0', color: 'var(--ink)', fontSize: 'clamp(1.3rem,2vw,1.8rem)', fontWeight: 800, letterSpacing: '-.02em' }}>
          Download trends, moderation queue &amp; engagement
        </h2>
        <p style={{ color: 'var(--muted)', fontSize: '.9rem', lineHeight: 1.6 }}>
          Monitor repository health and usage patterns with role-level visibility and moderation insights.
        </p>
      </header>

      <section className="library-panel">
        <div className="library-stat-grid" role="list">
          {ANALYTICS_SUMMARY.map((item) => (
            <StatTile key={item.id} label={item.label} value={item.value} delta={item.delta} />
          ))}
        </div>
      </section>

      <section className="library-chart-grid">
        <article className="library-chart">
          <h3 className="library-section-title" style={{ marginBottom: '16px' }}>Download Activity by Week</h3>
          <div className="library-chart-bars" style={{ alignItems: 'flex-end', gap: '6px' }}>
            {BAR_HEIGHTS.map((value, index) => (
              <div key={index} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
                <div
                  className="library-chart-bar"
                  style={{
                    height: `${value}%`,
                    width: '100%',
                    background: `linear-gradient(180deg, var(--brand-400) 0%, var(--brand-700) 100%)`,
                    borderRadius: '6px 6px 3px 3px',
                    minHeight: '8px',
                  }}
                />
                <span style={{ fontSize: '.65rem', color: 'var(--muted)', fontWeight: 600 }}>{BAR_LABELS[index]}</span>
              </div>
            ))}
          </div>
        </article>

        <article className="library-chart">
          <h3 className="library-section-title" style={{ marginBottom: '16px' }}>Top Categories by Engagement</h3>
          <div style={{ display: 'grid', gap: '10px' }}>
            {[
              { label: 'Software Engineering', pct: 24 },
              { label: 'Machine Learning',     pct: 21 },
              { label: 'Algorithms',           pct: 17 },
              { label: 'Networks',             pct: 15 },
              { label: 'Research Methods',     pct: 9  },
            ].map(({ label, pct }) => (
              <div key={label} style={{ display: 'grid', gap: '4px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '.8rem', color: 'var(--ink)', fontWeight: 600 }}>
                  <span>{label}</span>
                  <span style={{ color: 'var(--muted)' }}>{pct}%</span>
                </div>
                <div style={{ height: '6px', borderRadius: '999px', background: 'hsl(var(--border))' }}>
                  <div style={{
                    height: '100%',
                    width: `${pct * 4}%`,
                    borderRadius: '999px',
                    background: `linear-gradient(90deg, var(--brand-500), var(--brand-400))`,
                  }} />
                </div>
              </div>
            ))}
          </div>
        </article>
      </section>
    </section>
  )
}
