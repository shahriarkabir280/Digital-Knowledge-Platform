import { Navigate } from 'react-router-dom'
import { ROLES, defaultRouteForRole } from '../app/rbac.js'
import { useAuth } from '../app/use-auth.js'
import MemberDashboardPage from './MemberDashboardPage.jsx'

export default function DashboardPage() {
  const { authState } = useAuth()

  if (authState.role === ROLES.ADMIN) {
    return <Navigate to={defaultRouteForRole(ROLES.ADMIN)} replace />
  }

  if (authState.role === ROLES.STAFF || authState.role === ROLES.LAB_MANAGER) {
    return <Navigate to={defaultRouteForRole(ROLES.STAFF)} replace />
  }

  return <MemberDashboardPage />
}
