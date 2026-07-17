/**
 * Borrow Request Button
 * Shown when an item HAS available copies. Lets a member with an active
 * subscription request to borrow it; a librarian approves/rejects the
 * request from the Circulation Desk.
 */

import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { BookCheck, Loader2, Clock3, X, AlertCircle } from 'lucide-react'
import { createBorrowRequest, cancelBorrowRequest, getMySubscription, getMyBorrowRequests } from '../../services/api/library.js'
import { circulationErrorMessage } from '../../services/api/errorMessages.js'
import { toast } from 'sonner'

export default function BorrowRequestButton({ catalogItemId, onSuccess }) {
  const [loading, setLoading] = useState(false)
  const [checking, setChecking] = useState(true)
  const [isSubscribed, setIsSubscribed] = useState(false)
  const [pendingRequest, setPendingRequest] = useState(null)

  useEffect(() => {
    let cancelled = false

    async function load() {
      setChecking(true)
      try {
        const [subResult, myRequests] = await Promise.all([
          getMySubscription(),
          getMyBorrowRequests(),
        ])
        if (cancelled) return
        setIsSubscribed(Boolean(subResult?.isActive))
        const pending = myRequests.find(
          (r) => r.item_id === catalogItemId && r.status === 'PENDING'
        )
        setPendingRequest(pending || null)
      } catch {
        // fail closed — treat as no subscription / no pending request
      } finally {
        if (!cancelled) setChecking(false)
      }
    }

    load()
    return () => { cancelled = true }
  }, [catalogItemId])

  const handleRequest = async () => {
    setLoading(true)
    try {
      const request = await createBorrowRequest(catalogItemId)
      setPendingRequest(request)
      toast.success('Borrow request sent — a librarian will review it shortly.')
      onSuccess?.(request)
    } catch (err) {
      toast.error(circulationErrorMessage(err, 'Could not submit borrow request.'))
    } finally {
      setLoading(false)
    }
  }

  const handleCancel = async () => {
    if (!pendingRequest) return
    setLoading(true)
    try {
      await cancelBorrowRequest(pendingRequest.id)
      setPendingRequest(null)
      toast.success('Borrow request cancelled.')
      onSuccess?.(null)
    } catch (err) {
      toast.error(circulationErrorMessage(err, 'Could not cancel request.'))
    } finally {
      setLoading(false)
    }
  }

  if (checking) {
    return (
      <Button size="sm" variant="outline" disabled className="gap-1.5 w-full justify-start text-xs">
        <Loader2 size={13} className="animate-spin" /> Checking eligibility…
      </Button>
    )
  }

  if (!isSubscribed) {
    return (
      <div className="flex items-start gap-2 rounded-lg border border-amber-500/20 bg-amber-500/10 px-3 py-2.5 text-xs text-amber-700 dark:text-amber-400">
        <AlertCircle size={13} className="shrink-0 mt-0.5" />
        <span>
          An active library subscription is required to borrow physical items.{' '}
          <Link to="/library/profile" className="font-semibold underline underline-offset-2">
            View subscription
          </Link>
        </span>
      </div>
    )
  }

  if (pendingRequest) {
    return (
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-600 dark:text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-2">
          <Clock3 size={13} />
          Request pending librarian approval
        </div>
        <Button
          size="sm"
          variant="ghost"
          className="h-8 w-8 p-0 text-muted-foreground hover:text-red-500"
          onClick={handleCancel}
          disabled={loading}
          title="Cancel request"
        >
          {loading ? <Loader2 size={13} className="animate-spin" /> : <X size={13} />}
        </Button>
      </div>
    )
  }

  return (
    <Button
      size="sm"
      variant="outline"
      className="gap-1.5 w-full justify-start text-xs text-emerald-700 dark:text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/10"
      onClick={handleRequest}
      disabled={loading}
    >
      {loading ? <Loader2 size={13} className="animate-spin" /> : <BookCheck size={13} />}
      {loading ? 'Sending request…' : 'Request to Borrow'}
    </Button>
  )
}
