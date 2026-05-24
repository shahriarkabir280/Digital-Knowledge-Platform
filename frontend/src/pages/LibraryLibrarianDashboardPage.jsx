import { Link } from 'react-router-dom'
import './LibrarySection.css'
import './LibraryLibrarian.css'

const FEATURE_CARDS = [
  {
    title: 'Catalog Search',
    description: 'Advanced search with faceted filters across title, author, ISBN, and subject.',
    to: '/library/catalog',
  },
  {
    title: 'Circulation Desk',
    description: 'Checkout, renew, and return items with due date tracking.',
    to: '/library/circulation',
  },
  {
    title: 'Due Tracker',
    description: 'Monitor due dates and trigger reminder notifications.',
    to: '/library/due-tracking',
  },
  {
    title: 'Fine Management',
    description: 'Track overdue fines, record payments, and issue waivers.',
    to: '/library/fines',
  },
  {
    title: 'Hold Requests',
    description: 'Queue and fulfill holds for checked-out items.',
    to: '/library/holds',
  },
  {
    title: 'Wishlists',
    description: 'Manage member wishlists and send availability updates.',
    to: '/library/wishlist',
  },
  {
    title: 'Borrowing History',
    description: 'Review member borrowing history and export reports.',
    to: '/library/history',
  },
  {
    title: 'Scan Station',
    description: 'Scan barcodes or QR codes using camera or hardware scanners.',
    to: '/library/scan',
  },
  {
    title: 'Catalog Manager',
    description: 'Create, update, and delete catalog entries with audit notes.',
    to: '/library/catalog-crud',
  },
  {
    title: 'Bulk Import',
    description: 'Upload MARC or CSV files and review validation results.',
    to: '/library/bulk-import',
  },
  {
    title: 'Reports',
    description: 'Generate circulation, inventory, and overdue reports.',
    to: '/library/reports',
  },
]

export default function LibraryLibrarianDashboardPage() {
  return (
    <section className="library-page">
      <header className="library-panel">
        <p className="library-kicker">Library Management</p>
        <h2 style={{ margin: '6px 0', color: 'var(--ink)', fontSize: 'clamp(1.3rem,2vw,1.8rem)', fontWeight: 800, letterSpacing: '-.02em' }}>
          Librarian operations workspace
        </h2>
        <p style={{ color: 'var(--muted)', fontSize: '.9rem', lineHeight: 1.6 }}>
          Search the catalog, manage circulation, monitor due tracking, and generate reports.
        </p>
      </header>

      <section className="library-panel">
        <div className="librarian-grid">
          {FEATURE_CARDS.map((card) => (
            <Link key={card.title} to={card.to} className="librarian-card">
              <h3>{card.title}</h3>
              <p>{card.description}</p>
              <span className="library-btn library-btn-ghost" style={{ width: 'fit-content' }}>
                Open
              </span>
            </Link>
          ))}
        </div>
      </section>
    </section>
  )
}
