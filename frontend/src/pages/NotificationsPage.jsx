import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Alert } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { useAuth } from '../app/use-auth.js'
import { fetchNotifications } from '../services/api/documents.js'
import { decideAccessRequest } from '../services/api/documentAccessRequests.js'

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

  if (eventType === 'borrow_request_created' || eventType === 'subscription_renewal_requested') {
    return '/circulation'
  }
  if (eventType === 'borrow_request_approved' || eventType === 'borrow_request_rejected' || eventType === 'subscription_activated') {
    return '/library/profile'
  }

  return '/notifications'
}

export default function NotificationsPage() {
  const { authState } = useAuth()
  const navigate = useNavigate()
  const [status, setStatus] = useState('loading')
  const [items, setItems] = useState([])
  const [error, setError] = useState('')
  const [decidingId, setDecidingId] = useState(null)
  const [resolvedRequestIds, setResolvedRequestIds] = useState({})

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

  const onDecideAccessRequest = async (notification, decision) => {
    const requestId = notification?.metadata?.requestId
    if (!requestId) return

    try {
      setDecidingId(notification.id)
      await decideAccessRequest({ authToken: authState.token, requestId, decision })
      setResolvedRequestIds((prev) => ({ ...prev, [notification.id]: decision }))
    } catch (err) {
      if (err.code === 'ACCESS_REQUEST_ALREADY_DECIDED') {
        setResolvedRequestIds((prev) => ({ ...prev, [notification.id]: 'DECIDED' }))
      } else {
        alert(err.message || 'Failed to update access request')
      }
    } finally {
      setDecidingId(null)
    }
  }

  return (
    <section className="mx-auto grid w-full max-w-5xl gap-4">
      <div className="grid gap-2">
        <p className="brand-kicker">Activity</p>
        <h2 className="text-2xl font-semibold tracking-tight">Notifications</h2>
        <p className="text-sm text-muted-foreground">Review and submission lifecycle updates for your account.</p>
      </div>

      {status === 'loading' ? <Alert>Loading notifications...</Alert> : null}
      {status === 'error' ? <Alert variant="error">{error}</Alert> : null}
      {status === 'empty' ? <Alert>No notifications yet.</Alert> : null}

      {status === 'success' ? (
        <div className="grid gap-3">
          {items.map((item) => {
            const isAccessRequest = item.eventType === 'document_access_request_submitted' && item.metadata?.requestId
            const resolvedDecision = resolvedRequestIds[item.id]

            return (
              <Card key={item.id}>
                <CardContent className="pt-6 grid gap-2">
                  <button
                    type="button"
                    className="grid w-full gap-2 text-left"
                    onClick={() => onNotificationClick(item)}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="text-sm font-semibold text-foreground">{item.title}</h3>
                      <Badge variant={item.isRead ? 'outline' : 'warning'}>
                        {item.isRead ? 'read' : 'new'}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">{item.message}</p>
                    <p className="text-xs text-muted-foreground">{new Date(item.createdAt).toLocaleString()}</p>
                  </button>

                  {isAccessRequest && (
                    <div className="flex items-center gap-2 border-t border-dashed border-border/60 pt-2.5">
                      {resolvedDecision ? (
                        <Badge
                          className={
                            resolvedDecision === 'APPROVED'
                              ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'
                              : 'bg-red-500/10 text-red-600 border-red-500/20'
                          }
                        >
                          {resolvedDecision === 'APPROVED' ? 'Approved' : resolvedDecision === 'REJECTED' ? 'Rejected' : 'Already decided'}
                        </Badge>
                      ) : (
                        <>
                          <Button
                            size="sm"
                            disabled={decidingId === item.id}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white"
                            onClick={() => onDecideAccessRequest(item, 'APPROVED')}
                          >
                            Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={decidingId === item.id}
                            className="text-red-600 border-red-500/30 hover:bg-red-500/10"
                            onClick={() => onDecideAccessRequest(item, 'REJECTED')}
                          >
                            Reject
                          </Button>
                        </>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      ) : null}
    </section>
  )
}
