import { Link } from 'react-router-dom'

export default function HomePage() {
  return (
    <section className="page-block">
      <p className="brand-kicker">Home</p>
      <h2>Welcome to Digital Knowledge Platform</h2>
      <p>
        Entry screen for role-aware workflows. Use the quick links below to move
        through dashboard, search, and document viewer flows.
      </p>
      <div className="quick-grid">
        <Link to="/dashboard" className="quick-card">
          <h3>Dashboard</h3>
          <p>Operational summary and shortcuts.</p>
        </Link>
        <Link to="/search" className="quick-card">
          <h3>Search</h3>
          <p>Find resources across repository and library.</p>
        </Link>
        <Link to="/viewer/sample-doc" className="quick-card">
          <h3>Viewer</h3>
          <p>Open a sample document viewer route.</p>
        </Link>
      </div>
    </section>
  )
}
