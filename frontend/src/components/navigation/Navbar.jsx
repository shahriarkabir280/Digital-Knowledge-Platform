import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bell, LogOut, Menu, X } from 'lucide-react'
import cseduLogo from '@/assets/CSEDULOGO.png'
import { useAuth } from '../../app/use-auth.js'
import {
  fetchNotifications,
  markAllNotificationsRead,
} from '../../services/api/documents.js'

const STAFF_ROLES = new Set(['STAFF', 'LAB_MANAGER', 'REVIEWER', 'ADMIN'])

function resolveNotificationRoute(notification, role) {
  const eventType = String(notification?.eventType || '')
  if (eventType.startsWith('document_')) {
    if (STAFF_ROLES.has(role)) return eventType === 'document_review' ? '/review-queue' : '/all-uploads'
    return '/repository'
  }
  return '/notifications'
}

export default function Navbar({ onMenuToggle, menuOpen }) {
  const { authState, logout } = useAuth()
  const navigate = useNavigate()
  const [notifications, setNotifications] = useState([])
  const [notificationsOpen, setNotificationsOpen] = useState(false)

  const unreadCount = useMemo(
    () => notifications.filter((n) => !n.isRead).length,
    [notifications],
  )

  useEffect(() => {
    let id
    const load = async () => {
      try {
        const r = await fetchNotifications(authState.token, 10)
        setNotifications(r?.data?.items || [])
      } catch { setNotifications([]) }
    }
    if (authState.token) { load(); id = setInterval(load, 15000) }
    return () => { if (id) clearInterval(id) }
  }, [authState.token])

  const onToggleNotifications = async () => {
    const next = !notificationsOpen
    setNotificationsOpen(next)
    if (!next) return
    try {
      await markAllNotificationsRead(authState.token)
      const r = await fetchNotifications(authState.token, 10)
      setNotifications(r?.data?.items || [])
    } catch { /* keep */ }
  }

  const onLogout = () => { logout(); navigate('/login', { replace: true }) }
  const onOpenNotificationsPage = () => { setNotificationsOpen(false); navigate('/notifications') }
  const onOpenTarget = (n) => { setNotificationsOpen(false); navigate(resolveNotificationRoute(n, authState.role)) }

  const avatarLabel = (authState?.name || authState?.role || 'U').trim().charAt(0).toUpperCase()

  return (
    <header className="topbar">
      {/* Hamburger — shown on mobile via CSS */}
      <button
        type="button"
        className="topbar-menu-btn"
        onClick={onMenuToggle}
        aria-label={menuOpen ? 'Close menu' : 'Open menu'}
      >
        {menuOpen ? <X size={18} /> : <Menu size={18} />}
      </button>

      {/* Brand */}
      <div className="brand-block" style={{ cursor: 'pointer' }} onClick={() => navigate('/dashboard')}>
        <img src={cseduLogo} alt="CSEDU Logo" className="brand-logo" />
        <div className="brand-copy">
          <p className="brand-kicker">Digital Knowledge Platform</p>
          <h1>CSEDU</h1>
        </div>
      </div>

      {/* Actions */}
      <div className="topbar-actions">
        <div className="topbar-controls">
          {/* Avatar */}
          <button
            type="button"
            className="topbar-avatar-btn"
            onClick={() => navigate('/library/profile')}
            aria-label="Open profile"
            title={authState.name || 'Profile'}
          >
            <span className="topbar-avatar-initial" aria-hidden="true">{avatarLabel}</span>
          </button>

          {/* Notifications */}
          <div className="topbar-notifications">
            <button
              type="button"
              className="notification-btn"
              onClick={onToggleNotifications}
              aria-label="Open notifications"
            >
              <Bell size={15} strokeWidth={2} />
              <span className="notification-btn-label">Notifications</span>
              {unreadCount > 0 && <span className="notification-count">{unreadCount}</span>}
            </button>

            {notificationsOpen && (
              <div className="notification-dropdown" role="menu">
                <p className="notification-dropdown-title">Notifications</p>
                {notifications.length === 0 ? (
                  <p className="notification-dropdown-empty">No notifications yet.</p>
                ) : (
                  <ul className="notification-dropdown-list">
                    {notifications.slice(0, 5).map((item) => (
                      <li key={item.id} className="notification-dropdown-item">
                        <button type="button" className="notification-dropdown-item-btn" onClick={() => onOpenTarget(item)}>
                          <p className="notification-dropdown-item-title">{item.title}</p>
                          <p className="notification-dropdown-item-time">{new Date(item.createdAt).toLocaleString()}</p>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
                <button type="button" className="notification-dropdown-link" onClick={onOpenNotificationsPage}>
                  View all notifications
                </button>
              </div>
            )}
          </div>

          {/* Logout */}
          <button type="button" className="topbar-logout-btn" onClick={onLogout} aria-label="Logout">
            <LogOut size={15} strokeWidth={2} />
            <span className="topbar-logout-label">Logout</span>
          </button>
        </div>
      </div>
    </header>
  )
}
