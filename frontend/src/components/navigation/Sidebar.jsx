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
  ShieldCheck
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
    </aside>
  )
}
