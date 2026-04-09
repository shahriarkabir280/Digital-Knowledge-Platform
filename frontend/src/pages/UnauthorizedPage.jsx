import { Link } from 'react-router-dom'

export default function UnauthorizedPage() {
  return (
    <section className="page-block">
      <p className="brand-kicker">Access Control</p>
      <h2>Unauthorized (403)</h2>
      <p>This route requires higher privileges.</p>
      <Link to="/dashboard" className="inline-link">
        Return to dashboard
      </Link>
    </section>
  )
}
