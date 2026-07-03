import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Bell, LogOut, User, Menu } from 'lucide-react'
import { Button } from '@/components/ui/button'
import cseduLogo from '@/assets/CSEDULOGO.png'
import { useAuth } from '../../app/use-auth.js'
import { useLayout } from '../../app/layout-context.jsx'
import { defaultRouteForRole } from '../../app/rbac.js'
import {
  fetchNotifications,
  markAllNotificationsRead,
} from '../../services/api/documents.js'

const STAFF_ROLES = new Set(['STAFF', 'LAB_MANAGER', 'REVIEWER', 'ADMIN'])

function resolveNotificationRoute(notification, role) {
  const eventType = String(notification?.eventType || '')
  if (eventType.startsWith('document_')) {
    if (STAFF_ROLES.has(role)) {
      if (eventType === 'document_review') {
        return '/review-queue'
      }

      if (eventType === 'document_pending') {
        return '/library-moderation-queue'
      }

      return '/all-uploads'
    }
    return '/repository'
  }
  return '/notifications'
}

export default function Navbar() {
  const { authState, logout } = useAuth()
  const { toggleMobileMenu } = useLayout()
  const navigate = useNavigate()
  const [notifications, setNotifications] = useState([])
  const [notificationsOpen, setNotificationsOpen] = useState(false)

  const unreadCount = useMemo(
    () => notifications.filter((item) => !item.isRead).length,
    [notifications],
  )

  useEffect(() => {
    let intervalId

    const loadNotifications = async () => {
      try {
        const result = await fetchNotifications(authState.token, 10)
        setNotifications(result?.data?.items || [])
      } catch {
        setNotifications([])
      }
    }

    if (authState.token) {
      loadNotifications()
      intervalId = setInterval(loadNotifications, 15000)
    }

    return () => { if (intervalId) clearInterval(intervalId) }
  }, [authState.token])

  const onToggleNotifications = async () => {
    const nextOpen = !notificationsOpen
    setNotificationsOpen(nextOpen)
    if (!nextOpen) return
    try {
      await markAllNotificationsRead(authState.token)
      const result = await fetchNotifications(authState.token, 10)
      setNotifications(result?.data?.items || [])
    } catch { /* keep current list */ }
  }

  const onLogout = () => {
    logout()
    navigate('/login', { replace: true })
  }

  const onOpenNotificationsPage = () => {
    setNotificationsOpen(false)
    navigate('/notifications')
  }

  const onOpenNotificationTarget = (notification) => {
    const target = resolveNotificationRoute(notification, authState.role)
    setNotificationsOpen(false)
    navigate(target)
  }

  const avatarLabel = (authState?.name || authState?.role || 'U').trim().charAt(0).toUpperCase()

  return (
    <header className="topbar">
      {/* Mobile Hamburger toggle */}
      <button
        type="button"
        className="hamburger-btn"
        onClick={toggleMobileMenu}
        aria-label="Toggle navigation menu"
      >
        <Menu size={20} strokeWidth={2} />
      </button>

      {/* Brand */}
      <Link to={defaultRouteForRole(authState.role)} className="brand-block" aria-label="Go to home page">
        <img src={cseduLogo} alt="CSEDU Logo" className="brand-logo" />
        <div className="brand-copy">
          <p className="brand-kicker brand-tagline">Digital Knowledge Platform</p>
          <h1>CSEDU</h1>
        </div>
      </Link>

      {/* Actions */}
      <div className="topbar-actions">
        <div className="topbar-controls">

          {/* Profile avatar */}
          <button
            type="button"
            className="topbar-avatar-btn"
            onClick={() => navigate('/library/profile')}
            aria-label="Open profile"
            title={authState.name || 'Profile'}
          >
            <span className="topbar-avatar-initial" aria-hidden="true">{avatarLabel}</span>
            <span className="sr-only">Open profile</span>
          </button>

          {/* Notifications */}
          <div className="topbar-notifications">
            <button
              type="button"
              className="notification-btn"
              onClick={onToggleNotifications}
              aria-label="Open notifications"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '0 12px',
                height: '36px',
                borderRadius: '8px',
                border: '1px solid hsl(var(--border))',
                background: 'hsl(var(--card))',
                cursor: 'pointer',
                fontSize: '.85rem',
                fontWeight: 600,
                color: 'var(--ink)',
                transition: 'background .12s',
                position: 'relative',
              }}
            >
              <Bell size={16} strokeWidth={2} />
              <span className="notification-bell">Notifications</span>
              {unreadCount > 0 && (
                <span className="notification-count">{unreadCount}</span>
              )}
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
                        <button
                          type="button"
                          className="notification-dropdown-item-btn"
                          onClick={() => onOpenNotificationTarget(item)}
                        >
                          <p className="notification-dropdown-item-title">{item.title}</p>
                          <p className="notification-dropdown-item-time">
                            {new Date(item.createdAt).toLocaleString()}
                          </p>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
                <button
                  type="button"
                  className="notification-dropdown-link"
                  onClick={onOpenNotificationsPage}
                >
                  View all notifications
                </button>
              </div>
            )}
          </div>

          {/* Logout */}
          <button
            type="button"
            onClick={onLogout}
            aria-label="Logout"
            title="Logout"
            className="logout-btn-mobile"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '0 12px',
              height: '36px',
              borderRadius: '8px',
              border: '1px solid hsl(var(--border))',
              background: 'hsl(var(--card))',
              cursor: 'pointer',
              fontSize: '.85rem',
              fontWeight: 600,
              color: 'var(--ink)',
              transition: 'background .12s, color .12s',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'hsl(0 84% 97%)'; e.currentTarget.style.color = 'hsl(var(--destructive))'; e.currentTarget.style.borderColor = 'hsl(var(--destructive) / .3)' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'hsl(var(--card))'; e.currentTarget.style.color = 'var(--ink)'; e.currentTarget.style.borderColor = 'hsl(var(--border))' }}
          >
            <LogOut size={15} strokeWidth={2} />
            <span className="logout-btn-text">Logout</span>
          </button>
        </div>
      </div>
    </header>
  )
}
