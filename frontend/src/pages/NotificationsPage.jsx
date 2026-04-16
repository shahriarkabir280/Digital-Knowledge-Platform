import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../app/use-auth.js'
import { fetchNotifications } from '../services/api/documents.js'
import './NotificationsPage.css'

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

export default function NotificationsPage() {
  const { authState } = useAuth()
  const navigate = useNavigate()
  const [status, setStatus] = useState('loading')
  const [items, setItems] = useState([])
  const [error, setError] = useState('')

  useEffect(() => {
    const load = async () => {
      try {
        setStatus('loading')
        setError('')
        const result = await fetchNotifications(authState.token, 50)
        const notifications = result?.data?.items || []
        setItems(notifications)
        setStatus(notifications.length > 0 ? 'success' : 'empty')
      } catch (err) {
        setStatus('error')
        setError(err.message || 'Failed to load notifications')
      }
    }

    load()
  }, [authState.token])

  const onNotificationClick = (notification) => {
    navigate(resolveNotificationRoute(notification, authState.role))
  }

  return (
    <section className="page-block notifications-page">
      <p className="brand-kicker">Activity</p>
      <h2>Notifications</h2>
      <p>Review and submission lifecycle updates for your account.</p>

      {status === 'loading' && <p className="state-text">Loading notifications...</p>}
      {status === 'error' && <p className="state-error">{error}</p>}
      {status === 'empty' && <p className="state-text">No notifications yet.</p>}

      {status === 'success' && (
        <div className="notification-list">
          {items.map((item) => (
            <button
              key={item.id}
              type="button"
              className="notification-card notification-card-btn"
              onClick={() => onNotificationClick(item)}
            >
              <header>
                <h3>{item.title}</h3>
                <span className={`notification-badge ${item.isRead ? 'read' : 'unread'}`}>
                  {item.isRead ? 'read' : 'new'}
                </span>
              </header>
              <p className="notification-message">{item.message}</p>
              <p className="notification-time">
                {new Date(item.createdAt).toLocaleString()}
              </p>
            </button>
          ))}
        </div>
      )}
    </section>
  )
}
