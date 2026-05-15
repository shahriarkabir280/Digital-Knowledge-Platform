import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../app/use-auth.js'

export default function ProtectedRoute() {
  const { authState } = useAuth()
  const location = useLocation()

  if (!authState.isAuthenticated || !authState.token) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  return <Outlet />
}
