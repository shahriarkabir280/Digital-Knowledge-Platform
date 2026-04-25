import StatTile from '../modules/library/components/StatTile.jsx'
import { ANALYTICS_SUMMARY } from '../modules/library/data.js'
import './LibrarySection.css'

const BAR_HEIGHTS = [38, 62, 78, 54, 92, 70, 84]

export default function LibraryAnalyticsPage() {
  return (
    <section className="library-page">
      <header className="library-panel">
        <p className="library-kicker">Admin Analytics</p>
        <h2 style={{ margin: '6px 0', color: '#173042' }}>Download trends, moderation queue, and engagement</h2>
        <p style={{ color: '#355064' }}>
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
          <h3 className="library-section-title">Download Activity by Week</h3>
          <div className="library-chart-bars">
            {BAR_HEIGHTS.map((value, index) => (
              <div key={value + index} className="library-chart-bar" style={{ height: `${value}%` }} />
            ))}
          </div>
        </article>

        <article className="library-chart">
          <h3 className="library-section-title">Top Categories by Engagement</h3>
          <ul className="library-mini-list">
            <li>Software Engineering: 24%</li>
            <li>Machine Learning: 21%</li>
            <li>Algorithms: 17%</li>
            <li>Networks: 15%</li>
            <li>Research Methods: 9%</li>
          </ul>
        </article>
      </section>
    </section>
  )
}
