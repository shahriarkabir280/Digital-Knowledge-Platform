import { Link } from 'react-router-dom'
import { useAuth } from '../app/use-auth.js'
import { ROLES } from '../app/rbac.js'

const staffCards = [
  {
    title: 'Upload Document',
    description: 'Ingest documents and enrich them with required metadata fields.',
    to: '/upload-document',
    tone: 'teal',
  },
  {
    title: 'Borrowing Operations',
    description: 'Monitor circulation requests and support resource delivery.',
    to: '/borrow-item',
    tone: 'sage',
  },
  {
    title: 'Library & Search',
    description: 'Manage discovery access and run quality checks for catalog records.',
    to: '/library',
    tone: 'ink',
  },
]

export default function StaffDashboardPage() {
  const { authState } = useAuth()

  const roleLabel =
    authState.role === ROLES.LAB_MANAGER ? 'Lab Manager' : 'Staff'

  return (
    <section className="dashboard-page">
      <header className="dashboard-hero dashboard-hero--staff">
        <div className="dashboard-hero-copy">
          <p className="brand-kicker">Staff Dashboard</p>
          <h2>Operations workspace</h2>
          <p>
            Day-to-day service dashboard for catalog upkeep, document intake,
            and circulation flow.
          </p>
        </div>

        <div className="dashboard-hero-meta">
          <div className="dashboard-meta-card">
            <span className="dashboard-meta-label">Current role</span>
            <strong>{roleLabel}</strong>
          </div>
          <div className="dashboard-meta-card">
            <span className="dashboard-meta-label">Signed in as</span>
            <strong>{authState.name || 'Anonymous'}</strong>
          </div>
          <div className="dashboard-meta-card">
            <span className="dashboard-meta-label">Operational actions</span>
            <strong>{staffCards.length}</strong>
          </div>
        </div>
      </header>

      <div className="dashboard-grid">
        {staffCards.map((card) => (
          <Link
            key={card.title}
            to={card.to}
            className={`dashboard-card dashboard-card--${card.tone}`}
          >
            <span className="dashboard-card-label">Staff Action</span>
            <h3>{card.title}</h3>
            <p>{card.description}</p>
            <span className="dashboard-card-footer">Open workflow →</span>
          </Link>
        ))}
      </div>
    </section>
  )
}
