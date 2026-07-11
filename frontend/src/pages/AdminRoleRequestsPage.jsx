import { useEffect, useMemo, useState } from 'react'
import { Alert } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select } from '@/components/ui/select'
import { useAuth } from '../app/use-auth.js'
import { ROLES } from '../app/rbac.js'
import { fetchRoleRequests, decideRoleRequest } from '../services/api/roleRequests.js'

const statusFilters = ['PENDING', 'APPROVED', 'REJECTED', 'ALL']

export default function AdminRoleRequestsPage() {
  const { authState } = useAuth()
  const [requests, setRequests] = useState([])
  const [status, setStatus] = useState('idle')
  const [errorMessage, setErrorMessage] = useState('')
  const [notice, setNotice] = useState('')
  const [statusFilter, setStatusFilter] = useState('PENDING')
  const [decidingId, setDecidingId] = useState(null)

  const canLoad = useMemo(
    () => Boolean(authState?.token && authState?.role === ROLES.ADMIN),
    [authState?.token, authState?.role],
  )

  const loadRequests = async () => {
    if (!canLoad) return

    try {
      setStatus('loading')
      setErrorMessage('')
      const items = await fetchRoleRequests({
        authToken: authState.token,
        status: statusFilter === 'ALL' ? undefined : statusFilter,
      })
      setRequests(items)
      setStatus('ready')
    } catch (error) {
      setStatus('error')
      setErrorMessage(error.message || 'Failed to load role requests.')
    }
  }

  useEffect(() => {
    loadRequests()
  }, [canLoad, statusFilter])

  const onDecision = async (id, decision) => {
    try {
      setDecidingId(id)
      setErrorMessage('')
      setNotice('')
      const updated = await decideRoleRequest({ authToken: authState.token, id, decision })
      setNotice(`Request ${updated.status === 'APPROVED' ? 'approved' : 'rejected'}.`)
      await loadRequests()
    } catch (error) {
      setErrorMessage(error.message || 'Failed to update request.')
    } finally {
      setDecidingId(null)
    }
  }

  const resolveStatusBadge = (value) => {
    if (value === 'APPROVED') return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
    if (value === 'REJECTED') return 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20'
    return 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20'
  }

  return (
    <section className="mx-auto grid w-full max-w-6xl gap-4">
      <div className="grid gap-2">
        <p className="brand-kicker">Admin Panel</p>
        <h2 className="text-2xl font-semibold tracking-tight">Role Requests</h2>
        <p className="text-sm text-muted-foreground">
          Review and decide on role upgrade requests submitted by users from their profile.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className="w-40">
          {statusFilters.map((value) => (
            <option key={value} value={value}>
              {value}
            </option>
          ))}
        </Select>
        <Button type="button" variant="outline" onClick={loadRequests}>
          Reload
        </Button>
      </div>

      {errorMessage ? <Alert variant="error">{errorMessage}</Alert> : null}
      {notice ? <Alert variant="success">{notice}</Alert> : null}
      {status === 'loading' ? <Alert>Loading role requests...</Alert> : null}

      {status === 'ready' ? (
        requests.length === 0 ? (
          <Alert>No role requests found for this filter.</Alert>
        ) : (
          <div className="grid gap-3">
            {requests.map((req) => (
              <Card key={req.id}>
                <CardContent className="p-4 grid gap-3">
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

                  <p className="text-xs text-muted-foreground bg-muted/20 p-2.5 rounded-lg border border-border/40">
                    {req.reason}
                  </p>

                  {req.status === 'PENDING' ? (
                    <div className="flex gap-2 justify-end border-t border-border/60 pt-3">
                      <Button
                        size="sm"
                        disabled={decidingId === req.id}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white"
                        onClick={() => onDecision(req.id, 'APPROVED')}
                      >
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={decidingId === req.id}
                        className="text-red-600 border-red-500/30 hover:bg-red-500/10"
                        onClick={() => onDecision(req.id, 'REJECTED')}
                      >
                        Reject
                      </Button>
                    </div>
                  ) : null}
                </CardContent>
              </Card>
            ))}
          </div>
        )
      ) : null}

      {status === 'error' ? <Alert>Could not load role requests. Please try reload.</Alert> : null}
    </section>
  )
}
