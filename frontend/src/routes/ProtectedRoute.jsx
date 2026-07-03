import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../app/use-auth.js'
import { ROLES } from '../app/rbac.js'

export default function ProtectedRoute() {
  const { authState } = useAuth()
  const location = useLocation()

  // Guest role is allowed through — individual pages/RouteRole handle restrictions
  if (!authState.isAuthenticated && !authState.token && authState.role !== ROLES.GUEST) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  return <Outlet />
}
