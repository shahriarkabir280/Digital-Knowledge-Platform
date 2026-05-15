import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../app/use-auth.js'

export default function RoleRoute({ allowedRoles }) {
  const { authState } = useAuth()

  if (!allowedRoles.includes(authState.role)) {
    return <Navigate to="/403" replace />
  }

  return <Outlet />
}
