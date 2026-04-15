import { Link } from 'react-router-dom'
import { useAuth } from '../app/use-auth.js'

const adminCards = [
  {
    title: 'Role Management',
    description: 'Review user access and assign elevated roles from control panel.',
    to: '/admin/panel',
    tone: 'teal',
  },
  {
    title: 'Repository Oversight',
    description: 'Inspect submission health, moderation queues, and approval states.',
    to: '/repository',
    tone: 'gold',
  },
  {
    title: 'Search Audit',
    description: 'Audit discoverability and metadata quality across the platform.',
    to: '/search',
    tone: 'sage',
  },
]

export default function AdminDashboardPage() {
  const { authState } = useAuth()

  return (
    <section className="dashboard-page">
      <header className="dashboard-hero dashboard-hero--admin">
        <div className="dashboard-hero-copy">
          <p className="brand-kicker">Admin Dashboard</p>
          <h2>System control center</h2>
          <p>
            Governance-focused workspace for administration, policy checks, and
            operational decisions.
          </p>
        </div>

        <div className="dashboard-hero-meta">
          <div className="dashboard-meta-card">
            <span className="dashboard-meta-label">Access tier</span>
            <strong>Administrator</strong>
          </div>
          <div className="dashboard-meta-card">
            <span className="dashboard-meta-label">Signed in as</span>
            <strong>{authState.name || 'Anonymous'}</strong>
          </div>
          <div className="dashboard-meta-card">
            <span className="dashboard-meta-label">Active modules</span>
            <strong>{adminCards.length}</strong>
          </div>
        </div>
      </header>

      <div className="dashboard-grid">
        {adminCards.map((card) => (
          <Link
            key={card.title}
            to={card.to}
            className={`dashboard-card dashboard-card--${card.tone}`}
          >
            <span className="dashboard-card-label">Admin Module</span>
            <h3>{card.title}</h3>
            <p>{card.description}</p>
            <span className="dashboard-card-footer">Open module →</span>
          </Link>
        ))}
      </div>
    </section>
  )
}
