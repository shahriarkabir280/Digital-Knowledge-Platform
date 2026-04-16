import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
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
    if (STAFF_ROLES.has(role)) {
      if (eventType === 'document_review') {
        return '/review-queue'
      }

      return '/all-uploads'
    }

    return '/repository'
  }

  return '/notifications'
}

export default function Navbar() {
  const { authState, logout } = useAuth()
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
      } catch (_error) {
        setNotifications([])
      }
    }

    if (authState.token) {
      loadNotifications()
      intervalId = setInterval(loadNotifications, 15000)
    }

    return () => {
      if (intervalId) {
        clearInterval(intervalId)
      }
    }
  }, [authState.token])

  const onToggleNotifications = async () => {
    const nextOpen = !notificationsOpen
    setNotificationsOpen(nextOpen)

    if (!nextOpen) {
      return
    }

    try {
      await markAllNotificationsRead(authState.token)
      const result = await fetchNotifications(authState.token, 10)
      setNotifications(result?.data?.items || [])
    } catch (_error) {
      // Keep current list if mark/read refresh fails.
    }
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

  return (
    <header className="topbar">
      <div className="brand-block">
        <img src={cseduLogo} alt="CSEDU Logo" className="brand-logo" />
        <div className="brand-copy">
          <p className="brand-kicker">Digital Knowledge Platform</p>
          <h1>CSEDU</h1>
        </div>
      </div>
      <div className="topbar-actions">
        <div className="topbar-identity" aria-label="Current account context">
          <span className="identity-chip">
            <span className="identity-chip-label">Role</span>
            <strong className="identity-chip-value">{authState.role}</strong>
          </span>
          <span className="identity-chip">
            <span className="identity-chip-label">User</span>
            <strong className="identity-chip-value">{authState.name || 'Anonymous'}</strong>
          </span>
        </div>

        <div className="topbar-controls">
        <div className="topbar-notifications">
          <Button
            type="button"
            variant="outline"
            className="notification-btn"
            onClick={onToggleNotifications}
            aria-label="Open notifications"
          >
            <span className="notification-bell" aria-hidden="true">Notifications</span>
            {unreadCount > 0 ? <span className="notification-count">{unreadCount}</span> : null}
          </Button>

          {notificationsOpen ? (
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
          ) : null}
        </div>

        <Button type="button" variant="outline" onClick={onLogout}>
          Logout
        </Button>
        </div>
      </div>
    </header>
  )
}
