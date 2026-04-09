import { Link } from 'react-router-dom'

export default function NotFoundPage() {
  return (
    <section className="page-block">
      <p className="brand-kicker">404</p>
      <h2>Page Not Found</h2>
      <p>The route you requested does not exist yet.</p>
      <Link to="/dashboard" className="inline-link">
        Go to dashboard
      </Link>
    </section>
  )
}
