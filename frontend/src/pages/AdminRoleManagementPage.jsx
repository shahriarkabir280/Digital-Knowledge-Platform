import { useEffect, useMemo, useState } from 'react'
import { Alert } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select } from '@/components/ui/select'
import { useAuth } from '../app/use-auth.js'
import { ROLES } from '../app/rbac.js'
import {
  listUsersRequest,
  updateUserRoleRequest,
} from '../services/api/users.js'
import { fetchRoleRequests, decideRoleRequest } from '../services/api/roleRequests.js'

const manageableRoles = [
  ROLES.ADMIN,
  ROLES.MEMBER,
  ROLES.CONTRIBUTOR,
  ROLES.STAFF,
]

function resolveStatusBadge(status) {
  if (status === 'APPROVED') return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
  if (status === 'REJECTED') return 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20'
  return 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20'
}

export default function AdminRoleManagementPage() {
  const { authState } = useAuth()
  const [users, setUsers] = useState([])
  const [status, setStatus] = useState('idle')
  const [errorMessage, setErrorMessage] = useState('')
  const [notice, setNotice] = useState('')
  const [savingUserId, setSavingUserId] = useState(null)

  const [requests, setRequests] = useState([])
  const [requestsStatus, setRequestsStatus] = useState('idle')
  const [requestsFilter, setRequestsFilter] = useState('PENDING')
  const [decidingId, setDecidingId] = useState(null)

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

  const loadRequests = async () => {
    if (!canLoad) {
      return
    }

    try {
      setRequestsStatus('loading')
      const items = await fetchRoleRequests({
        authToken: authState.token,
        status: requestsFilter === 'ALL' ? undefined : requestsFilter,
      })
      setRequests(items)
      setRequestsStatus('ready')
    } catch (error) {
      setRequestsStatus('error')
      setErrorMessage(error.message || 'Failed to load role requests.')
    }
  }

  useEffect(() => {
    loadUsers()
  }, [canLoad])

  useEffect(() => {
    loadRequests()
  }, [canLoad, requestsFilter])

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

  const onRequestDecision = async (id, decision) => {
    try {
      setDecidingId(id)
      setErrorMessage('')
      setNotice('')
      const updated = await decideRoleRequest({ authToken: authState.token, id, decision })
      setNotice(`Role request ${updated.status === 'APPROVED' ? 'approved' : 'rejected'}.`)
      await Promise.all([loadRequests(), loadUsers()])
    } catch (error) {
      setErrorMessage(error.message || 'Failed to update request.')
    } finally {
      setDecidingId(null)
    }
  }

  return (
    <section className="mx-auto grid w-full max-w-6xl gap-4">
      <div className="grid gap-2">
        <p className="brand-kicker">Admin Panel</p>
        <h2 className="text-2xl font-semibold tracking-tight">Role Management</h2>
        <p className="text-sm text-muted-foreground">
          Review role upgrade requests and assign access roles for registered users. Changes apply immediately on next authenticated request.
        </p>
      </div>

      {errorMessage ? <Alert variant="error">{errorMessage}</Alert> : null}
      {notice ? <Alert variant="success">{notice}</Alert> : null}

      {/* Pending role requests */}
      <Card>
        <CardHeader className="pb-3 flex flex-row items-center justify-between gap-3">
          <CardTitle className="text-base">Role Upgrade Requests</CardTitle>
          <div className="flex items-center gap-2">
            <Select value={requestsFilter} onChange={(event) => setRequestsFilter(event.target.value)} className="w-36 h-9">
              {['PENDING', 'APPROVED', 'REJECTED', 'ALL'].map((value) => (
                <option key={value} value={value}>{value}</option>
              ))}
            </Select>
            <Button type="button" variant="outline" size="sm" onClick={loadRequests}>
              Reload
            </Button>
          </div>
        </CardHeader>
        <CardContent className="grid gap-3">
          {requestsStatus === 'loading' ? <Alert>Loading role requests...</Alert> : null}
          {requestsStatus === 'ready' && requests.length === 0 ? (
            <Alert>No role requests found for this filter.</Alert>
          ) : null}
          {requestsStatus === 'ready' && requests.map((req) => (
            <div key={req.id} className="p-4 rounded-xl border border-border bg-muted/10 grid gap-2.5">
              <div className="flex justify-between items-start gap-2 flex-wrap">
                <div className="grid gap-0.5">
                  <span className="text-xs font-semibold text-foreground">
                    {req.requesterName} <span className="text-muted-foreground font-normal">({req.requesterEmail})</span>
                  </span>
                  <span className="text-[11px] text-muted-foreground">
                    Current role: {req.requesterCurrentRole} · Requested: {new Date(req.createdAt).toLocaleString()}
                  </span>
                </div>
                <Badge className={`text-[10px] px-2.5 py-0.5 border font-semibold uppercase ${resolveStatusBadge(req.status)}`}>
                  {req.status}
                </Badge>
              </div>

              <div className="text-xs">
                Requested role: <Badge variant="outline" className="text-[10px] font-bold">{req.requestedRole}</Badge>
              </div>

              <p className="text-xs text-muted-foreground bg-background p-2.5 rounded-lg border border-border/40">
                {req.reason}
              </p>

              {req.status === 'PENDING' ? (
                <div className="flex gap-2 justify-end border-t border-dashed border-border/60 pt-2.5">
                  <Button
                    size="sm"
                    disabled={decidingId === req.id}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white"
                    onClick={() => onRequestDecision(req.id, 'APPROVED')}
                  >
                    Approve
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={decidingId === req.id}
                    className="text-red-600 border-red-500/30 hover:bg-red-500/10"
                    onClick={() => onRequestDecision(req.id, 'REJECTED')}
                  >
                    Reject
                  </Button>
                </div>
              ) : null}
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Registered users */}
      <div>
        <Button type="button" variant="outline" onClick={loadUsers}>
          Reload Users
        </Button>
      </div>

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
