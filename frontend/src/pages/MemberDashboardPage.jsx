import { Link } from 'react-router-dom'
import { useAuth } from '../app/use-auth.js'
import { ROLES } from '../app/rbac.js'

const roleLabels = {
  [ROLES.MEMBER]: 'Member',
  [ROLES.CONTRIBUTOR]: 'Contributor',
  [ROLES.REVIEWER]: 'Reviewer',
}

const dashboardCards = [
  {
    title: 'Upload Document',
    description:
      'Upload your file first, then continue to metadata and submission state updates.',
    to: '/upload-document',
    roles: [ROLES.MEMBER, ROLES.CONTRIBUTOR],
  },
  {
    title: 'Submit Paper',
    description:
      'Complete metadata fields and prepare your draft for review.',
    to: '/submit-paper',
    roles: [ROLES.MEMBER, ROLES.CONTRIBUTOR],
  },
  {
    title: 'Borrow Item',
    description:
      'Request available physical resources through circulation workflow.',
    to: '/borrow-item',
    roles: [ROLES.MEMBER, ROLES.CONTRIBUTOR],
  },
  {
    title: 'Search Repository',
    description: 'Find records across repository and library from one search box.',
    to: '/search',
    roles: [ROLES.MEMBER, ROLES.CONTRIBUTOR, ROLES.REVIEWER],
  },
]

export default function MemberDashboardPage() {
  const { authState } = useAuth()

  const visibleCards = dashboardCards.filter((card) =>
    card.roles.includes(authState.role),
  )

  return (
    <section className="dashboard-page">
      <header className="dashboard-hero">
        <div className="dashboard-hero-copy">
          <p className="brand-kicker">Member Dashboard</p>
          <h2>Research and access workspace</h2>
          <p>
            Continue submission, borrowing, and discovery tasks based on your
            current account role.
          </p>
        </div>

        <div className="dashboard-hero-meta">
          <div className="dashboard-meta-card">
            <span className="dashboard-meta-label">Current role</span>
            <strong>{roleLabels[authState.role] || authState.role}</strong>
          </div>
          <div className="dashboard-meta-card">
            <span className="dashboard-meta-label">Signed in as</span>
            <strong>{authState.name || 'Anonymous'}</strong>
          </div>
          <div className="dashboard-meta-card">
            <span className="dashboard-meta-label">Quick actions</span>
            <strong>{visibleCards.length}</strong>
          </div>
        </div>
      </header>

      <div className="dashboard-grid">
        {visibleCards.map((card) => (
          <Link key={card.title} to={card.to} className="dashboard-card dashboard-card--ink">
            <span className="dashboard-card-label">Member Action</span>
            <h3>{card.title}</h3>
            <p>{card.description}</p>
            <span className="dashboard-card-footer">Open task →</span>
          </Link>
        ))}
      </div>
    </section>
  )
}
