import { useEffect, useMemo, useState } from 'react'
import { Alert } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select } from '@/components/ui/select'
import { useAuth } from '../app/use-auth.js'
import { ROLES } from '../app/rbac.js'
import {
  listUsersRequest,
  updateUserRoleRequest,
} from '../services/api/users.js'

const manageableRoles = [
  ROLES.MEMBER,
  ROLES.CONTRIBUTOR,
  ROLES.STAFF,
  ROLES.LAB_MANAGER,
  ROLES.ADMIN,
  ROLES.REVIEWER,
]

export default function AdminRoleManagementPage() {
  const { authState } = useAuth()
  const [users, setUsers] = useState([])
  const [status, setStatus] = useState('idle')
  const [errorMessage, setErrorMessage] = useState('')
  const [notice, setNotice] = useState('')
  const [savingUserId, setSavingUserId] = useState(null)

  const canLoad = useMemo(
    () => Boolean(authState?.token && authState?.role === ROLES.ADMIN),
    [authState?.token, authState?.role],
  )

  const loadUsers = async () => {
    if (!canLoad) {
      return
    }

    try {
      setStatus('loading')
      setErrorMessage('')
      const items = await listUsersRequest(authState.token)
      setUsers(items)
      setStatus('ready')
    } catch (error) {
      setStatus('error')
      setErrorMessage(error.message || 'Failed to load users.')
    }
  }

  useEffect(() => {
    loadUsers()
  }, [canLoad])

  const onRoleChange = async (userId, nextRole) => {
    const current = users.find((user) => user.id === userId)
    if (!current || current.role === nextRole) {
      return
    }

    try {
      setSavingUserId(userId)
      setErrorMessage('')
      setNotice('')
      const updated = await updateUserRoleRequest({
        authToken: authState.token,
        userId,
        role: nextRole,
      })

      setUsers((prev) =>
        prev.map((user) => (user.id === userId ? { ...user, role: updated.role } : user)),
      )
      setNotice(`Updated role for ${updated.email} to ${updated.role}.`)
    } catch (error) {
      setErrorMessage(error.message || 'Failed to update role.')
    } finally {
      setSavingUserId(null)
    }
  }

  return (
    <section className="mx-auto grid w-full max-w-6xl gap-4">
      <div className="grid gap-2">
        <p className="brand-kicker">Admin Panel</p>
        <h2 className="text-2xl font-semibold tracking-tight">Role Management</h2>
        <p className="text-sm text-muted-foreground">
          Assign access roles for registered users. Changes apply immediately on next authenticated request.
        </p>
      </div>

      <div>
        <Button type="button" variant="outline" onClick={loadUsers}>
          Reload Users
        </Button>
      </div>

      {errorMessage ? <Alert variant="error">{errorMessage}</Alert> : null}
      {notice ? <Alert variant="success">{notice}</Alert> : null}

      {status === 'loading' ? <Alert>Loading users...</Alert> : null}

      {status === 'ready' ? (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Registered users</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-muted-foreground">
                    <th className="px-2 py-2 font-medium">ID</th>
                    <th className="px-2 py-2 font-medium">Name</th>
                    <th className="px-2 py-2 font-medium">Email</th>
                    <th className="px-2 py-2 font-medium">Status</th>
                    <th className="px-2 py-2 font-medium">Role</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => (
                    <tr key={user.id} className="border-b border-border/60 align-middle">
                      <td className="px-2 py-2">{user.id}</td>
                      <td className="px-2 py-2">{user.name}</td>
                      <td className="px-2 py-2">{user.email}</td>
                      <td className="px-2 py-2">{user.status}</td>
                      <td className="px-2 py-2 min-w-[180px]">
                        <Select
                          value={user.role}
                          disabled={savingUserId === user.id}
                          onChange={(event) => onRoleChange(user.id, event.target.value)}
                        >
                          {manageableRoles.map((role) => (
                            <option key={role} value={role}>
                              {role}
                            </option>
                          ))}
                        </Select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {status === 'error' ? <Alert>Could not load users. Please try reload.</Alert> : null}
    </section>
  )
}
