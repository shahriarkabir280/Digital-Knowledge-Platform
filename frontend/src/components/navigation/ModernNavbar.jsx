import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, Bell, User, Settings, LogOut } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import cseduLogo from '@/assets/CSEDULOGO.png'
import { useAuth } from '../../app/use-auth.js'
import { MobileSidebar } from './ModernSidebar.jsx'
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

export default function ModernNavbar() {
  const { authState, logout } = useAuth()
  const navigate = useNavigate()
  const [notifications, setNotifications] = useState([])
  const [notificationsOpen, setNotificationsOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

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

  const onSearchSubmit = (e) => {
    e.preventDefault()
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`)
    }
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
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex h-16 items-center gap-4 px-6">
        {/* Mobile Menu */}
        <MobileSidebar />

        {/* Brand */}
        <div className="flex items-center gap-3">
          <img 
            src={cseduLogo} 
            alt="CSEDU Logo" 
            className="h-8 w-8 rounded-md border object-cover" 
          />
          <div className="hidden sm:block">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Digital Knowledge Platform
            </p>
            <h1 className="text-sm font-semibold">CSEDU</h1>
          </div>
        </div>

        {/* Global Search */}
        <form onSubmit={onSearchSubmit} className="flex-1 max-w-md">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search documents, projects, or resources..."
              className="pl-9 pr-4"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </form>

        {/* Actions */}
        <div className="flex items-center gap-2">
          {/* Notifications */}
          <DropdownMenu open={notificationsOpen} onOpenChange={setNotificationsOpen}>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="relative">
                <Bell className="h-5 w-5" />
                {unreadCount > 0 && (
                  <Badge 
                    variant="destructive" 
                    className="absolute -right-1 -top-1 h-5 w-5 rounded-full p-0 text-xs flex items-center justify-center"
                  >
                    {unreadCount}
                  </Badge>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80">
              <DropdownMenuLabel>Notifications</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {notifications.length === 0 ? (
                <div className="p-4 text-center text-sm text-muted-foreground">
                  No notifications yet.
                </div>
              ) : (
                <>
                  <div className="max-h-80 overflow-y-auto">
                    {notifications.slice(0, 5).map((item) => (
                      <DropdownMenuItem
                        key={item.id}
                        className="flex flex-col items-start gap-1 p-3 cursor-pointer"
                        onClick={() => onOpenNotificationTarget(item)}
                      >
                        <p className="text-sm font-medium">{item.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(item.createdAt).toLocaleString()}
                        </p>
                      </DropdownMenuItem>
                    ))}
                  </div>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="justify-center text-center cursor-pointer"
                    onClick={onOpenNotificationsPage}
                  >
                    View all notifications
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* User Profile Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-9 w-9 rounded-full">
                <Avatar className="h-9 w-9">
                  <AvatarFallback className="bg-primary text-primary-foreground text-sm font-medium">
                    {avatarLabel}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium leading-none">{authState?.name || 'User'}</p>
                  <p className="text-xs leading-none text-muted-foreground">
                    {authState?.email || authState?.role}
                  </p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => navigate('/library/profile')} className="cursor-pointer">
                <User className="mr-2 h-4 w-4" />
                <span>Profile</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate('/library/settings')} className="cursor-pointer">
                <Settings className="mr-2 h-4 w-4" />
                <span>Settings</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={onLogout} className="cursor-pointer text-destructive focus:text-destructive">
                <LogOut className="mr-2 h-4 w-4" />
                <span>Logout</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  )
}