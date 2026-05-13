import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard,
  BookOpen,
  UploadCloud,
  Bookmark,
  BarChart3,
  Settings2,
  Globe2,
  ClipboardCheck,
  ShieldCheck,
  FolderOpen,
  Search,
  GraduationCap,
  Eye,
  FilePlus,
} from 'lucide-react'
import { useAuth } from '../../app/use-auth.js'
import { navItems } from './nav-config.js'

const iconMap = {
  LayoutDashboard,
  BookOpen,
  UploadCloud,
  Bookmark,
  BarChart3,
  Settings2,
  Globe2,
  ClipboardCheck,
  ShieldCheck,
  FolderOpen,
  Search,
  GraduationCap,
  Eye,
  FilePlus,
}

// Fallback icons for items without an iconName
const fallbackIcons = {
  '/submit-paper':      FilePlus,
  '/repository':        FolderOpen,
  '/search':            Search,
  '/student-projects':  GraduationCap,
  '/viewer/sample-doc': Eye,
}

export default function Sidebar({ isOpen, onClose }) {
  const { authState } = useAuth()
  const items = navItems.filter((item) => item.roles.includes(authState.role))

  return (
    <aside className={`sidebar${isOpen ? ' is-open' : ''}`}>
      <div className="library-nav-group">
        <p className="sidebar-title">Navigation</p>
        <nav aria-label="Main navigation">
          <ul className="sidebar-list">
            {items.map((item) => {
              const IconComponent = iconMap[item.iconName] || fallbackIcons[item.to]
              return (
                <li key={item.to}>
                  <NavLink
                    to={item.to}
                    className={({ isActive }) =>
                      isActive ? 'nav-link nav-link-active' : 'nav-link'
                    }
                  >
                    <span className="nav-link-icon">
                      {IconComponent && <IconComponent size={16} strokeWidth={2} />}
                    </span>
                    {item.label}
                  </NavLink>
                </li>
              )
            })}
          </ul>
        </nav>
      </div>

      {/* Footer info */}
      <div style={{
        marginTop: 'auto',
        paddingTop: '16px',
        borderTop: '1px solid var(--line)',
        padding: '12px',
      }}>
        <p style={{ fontSize: '.72rem', color: 'var(--muted)', lineHeight: 1.4 }}>
          Signed in as
        </p>
        <p style={{ fontSize: '.82rem', fontWeight: 600, color: 'var(--ink)', marginTop: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {authState.name || authState.email || authState.role}
        </p>
        <p style={{ fontSize: '.72rem', color: 'var(--accent)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.06em', marginTop: '2px' }}>
          {authState.role}
        </p>
      </div>
    </aside>
  )
}
