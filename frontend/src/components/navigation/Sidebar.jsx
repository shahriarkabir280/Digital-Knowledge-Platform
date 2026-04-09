import { NavLink } from 'react-router-dom'
import { useAuth } from '../../app/use-auth.js'
import { navItems } from './nav-config.js'

export default function Sidebar() {
  const { authState } = useAuth()

  const items = navItems.filter((item) => item.roles.includes(authState.role))

  return (
    <aside className="sidebar">
      <p className="sidebar-title">Navigation</p>
      <nav>
        <ul className="sidebar-list">
          {items.map((item) => (
            <li key={item.to}>
              <NavLink
                to={item.to}
                className={({ isActive }) =>
                  isActive ? 'nav-link nav-link-active' : 'nav-link'
                }
              >
                {item.label}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </aside>
  )
}
