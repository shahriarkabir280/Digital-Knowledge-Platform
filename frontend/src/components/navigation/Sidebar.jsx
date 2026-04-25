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
  LifeBuoy
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
  ShieldCheck
}

export default function Sidebar() {
  const { authState } = useAuth()

  const items = navItems.filter((item) => item.roles.includes(authState.role))

  return (
    <aside className="sidebar">
      <div className="library-nav-group">
        <p className="sidebar-title">Main Menu</p>
        <nav>
          <ul className="sidebar-list">
            {items.map((item) => {
              const IconComponent = iconMap[item.iconName]
              return (
                <li key={item.to}>
                  <NavLink
                    to={item.to}
                    className={({ isActive }) =>
                      isActive ? 'nav-link nav-link-active' : 'nav-link'
                    }
                  >
                    <span className="nav-link-icon">
                      {IconComponent && <IconComponent size={18} strokeWidth={2.5} />}
                    </span>
                    {item.label}
                  </NavLink>
                </li>
              )
            })}
          </ul>
        </nav>
      </div>

      <div className="sidebar-divider" />

      <div className="library-sidebar-card" style={{ background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)', color: '#475569', border: '1px solid #e2e8f0' }}>
        <h4 style={{ color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <LifeBuoy size={16} /> System Support
        </h4>
        <p style={{ color: '#64748b' }}>Need assistance with uploads or research management?</p>
        <button type="button" className="library-btn library-btn-ghost" style={{ width: '100%', fontSize: '0.8rem' }}>
          Contact Helpdesk
        </button>
      </div>
    </aside>
  )
}
