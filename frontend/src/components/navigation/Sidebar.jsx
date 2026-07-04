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
  FilePlus,
  Layers,
  X,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import { useAuth } from '../../app/use-auth.js'
import { useLayout } from '../../app/layout-context.jsx'
import { defaultRouteForRole } from '../../app/rbac.js'
import { navItems } from './nav-config.js'
import cseduLogo from '@/assets/CSEDULOGO.png'

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
  FilePlus,
  Layers,
}

// Fallback icons for items without an iconName
const fallbackIcons = {
  '/submit-paper':      FilePlus,
  '/repository':        FolderOpen,
  '/search':            Search,
  '/student-projects':  GraduationCap,
}

export default function Sidebar() {
  const { authState } = useAuth()
  const {
    isMobileMenuOpen,
    closeMobileMenu,
    isSidebarCollapsed,
    toggleSidebarCollapse,
  } = useLayout()

  const items = navItems.filter((item) => item.roles.includes(authState.role))

  return (
    <aside className={`sidebar ${isMobileMenuOpen ? 'mobile-open' : ''}`}>
      {/* Mobile X close button */}
      <button
        type="button"
        className="sidebar-close-btn"
        onClick={closeMobileMenu}
        aria-label="Close navigation menu"
        style={{
          position: 'absolute',
          top: '16px',
          right: '16px',
          background: 'transparent',
          border: 'none',
          cursor: 'pointer',
          color: 'var(--muted)',
          padding: '4px',
        }}
      >
        <X size={20} />
      </button>

      <div className="library-nav-group">
        {isMobileMenuOpen && (
          <NavLink
            to={defaultRouteForRole(authState.role)}
            onClick={closeMobileMenu}
            className="sidebar-brand-container"
            aria-label="Go to home page"
          >
            <img src={cseduLogo} alt="CSEDU Logo" className="sidebar-brand-logo" />
            <div className="sidebar-brand-text">
              <span className="sidebar-brand-kicker">Digital Knowledge Platform</span>
              <span className="sidebar-brand-name">CSEDU</span>
            </div>
          </NavLink>
        )}
        <nav aria-label="Main navigation">
          <ul className="sidebar-list">
            {items.map((item) => {
              const IconComponent = iconMap[item.iconName] || fallbackIcons[item.to]
              return (
                <li key={item.to}>
                  <NavLink
                    to={item.to}
                    onClick={closeMobileMenu}
                    title={isSidebarCollapsed ? item.label : undefined}
                    className={({ isActive }) =>
                      isActive ? 'nav-link nav-link-active' : 'nav-link'
                    }
                  >
                    <span className="nav-link-icon">
                      {IconComponent && <IconComponent size={16} strokeWidth={2} />}
                    </span>
                    <span className="nav-link-text">{item.label}</span>
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
      }}
        className="sidebar-footer"
      >
        <div className="sidebar-footer-info">
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

        <div className="sidebar-footer-avatar-only hidden">
          <div style={{
            width: '32px',
            height: '32px',
            borderRadius: '50%',
            background: 'var(--accent-bg)',
            border: '1px solid var(--accent-soft)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 700,
            color: 'var(--accent-strong)',
            fontSize: '.85rem'
          }}
            title={`${authState.name || authState.email || authState.role} (${authState.role})`}
          >
            {(authState.name || authState.role || 'U').charAt(0).toUpperCase()}
          </div>
        </div>
      </div>
    </aside>
  )
}
