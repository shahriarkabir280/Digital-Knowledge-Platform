import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Bell, LogOut, User, Menu } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
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
  if (eventType.startsWith('role_request')) {
    if (eventType === 'role_request_submitted' && STAFF_ROLES.has(role)) {
      return '/admin/panel'
    }
    return '/library/profile'
  }
  if (eventType === 'borrow_request_created' || eventType === 'subscription_renewal_requested') {
    return '/circulation'
  }
  if (eventType === 'borrow_request_approved' || eventType === 'borrow_request_rejected' || eventType === 'subscription_activated') {
    return '/library/profile'
  }
  return '/notifications'
}

export default function Navbar() {
  const { authState, logout } = useAuth()
  const { toggleMobileMenu } = useLayout()
  const navigate = useNavigate()
  const [notifications, setNotifications] = useState([])

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

  const onMarkNotificationsRead = async () => {
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
    navigate('/notifications')
  }

  const onOpenNotificationTarget = (notification) => {
    const target = resolveNotificationRoute(notification, authState.role)
    navigate(target)
  }

  const avatarLabel = (authState?.name || authState?.role || 'U').trim().charAt(0).toUpperCase()

  return (
    <TooltipProvider>
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
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                className="topbar-avatar-btn"
                onClick={() => navigate('/library/profile')}
                aria-label="Open profile"
              >
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="text-xs font-semibold">{avatarLabel}</AvatarFallback>
                </Avatar>
              </button>
            </TooltipTrigger>
            <TooltipContent>{authState.name || 'Profile'}</TooltipContent>
          </Tooltip>

          {/* Notifications */}
          <DropdownMenu onOpenChange={(open) => { if (open) onMarkNotificationsRead() }}>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="notification-btn"
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
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80">
              <DropdownMenuLabel>Notifications</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {notifications.length === 0 ? (
                <div className="px-2 py-6 text-center">
                  <p className="text-xs text-muted-foreground">No notifications yet.</p>
                </div>
              ) : (
                <>
                  {notifications.slice(0, 5).map((item) => (
                    <DropdownMenuItem key={item.id} className="flex flex-col items-start gap-0.5 py-2 px-2 cursor-pointer"
                      onSelect={() => onOpenNotificationTarget(item)}
                    >
                      <p className="text-xs font-medium">{item.title}</p>
                      <p className="text-[10px] text-muted-foreground">
                        {new Date(item.createdAt).toLocaleString()}
                      </p>
                    </DropdownMenuItem>
                  ))}
                </>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={onOpenNotificationsPage} className="text-xs font-medium justify-center cursor-pointer">
                View all notifications
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

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
    </TooltipProvider>
  )
}
