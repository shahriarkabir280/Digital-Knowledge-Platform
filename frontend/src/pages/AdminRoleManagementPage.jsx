import { useEffect, useMemo, useState } from 'react'
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
    <section className="page-block role-admin-page">
      <p className="brand-kicker">Admin Panel</p>
      <h2>Role Management</h2>
      <p>
        Assign access roles for registered users. Changes apply immediately on
        next authenticated request.
      </p>

      <div className="role-admin-actions">
        <button type="button" className="ghost-btn" onClick={loadUsers}>
          Reload users
        </button>
      </div>

      {errorMessage ? <p className="form-error">{errorMessage}</p> : null}
      {notice ? <p className="form-success">{notice}</p> : null}

      {status === 'loading' ? <p className="state-text">Loading users...</p> : null}

      {status === 'ready' ? (
        <div className="role-table-wrap">
          <table className="role-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Name</th>
                <th>Email</th>
                <th>Status</th>
                <th>Role</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id}>
                  <td>{user.id}</td>
                  <td>{user.name}</td>
                  <td>{user.email}</td>
                  <td>{user.status}</td>
                  <td>
                    <select
                      value={user.role}
                      disabled={savingUserId === user.id}
                      onChange={(event) => onRoleChange(user.id, event.target.value)}
                    >
                      {manageableRoles.map((role) => (
                        <option key={role} value={role}>
                          {role}
                        </option>
                      ))}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      {status === 'error' ? (
        <p className="state-text">Could not load users. Please try reload.</p>
      ) : null}
    </section>
  )
}
