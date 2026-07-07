/**
 * Hold Request Button
 * Shows when an item has no available copies. Allows members to join the hold queue.
 */

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Clock, Loader2, CheckCircle2, X } from 'lucide-react'
import { placeHold, cancelHold } from '../../services/api/library.js'
import { toast } from 'sonner'

export default function HoldRequestButton({ catalogItemId, existingHold, onSuccess }) {
  const [loading, setLoading] = useState(false)
  const [currentHold, setCurrentHold] = useState(existingHold || null)

  const handlePlaceHold = async () => {
    setLoading(true)
    try {
      const hold = await placeHold(catalogItemId)
      setCurrentHold(hold)
      toast.success("You've been added to the hold queue.")
      onSuccess?.(hold)
    } catch (err) {
      toast.error(err.message || 'Could not place hold.')
    } finally {
      setLoading(false)
    }
  }

  const handleCancelHold = async () => {
    if (!currentHold) return
    setLoading(true)
    try {
      await cancelHold(currentHold.id)
      setCurrentHold(null)
      toast.success('Hold cancelled.')
      onSuccess?.(null)
    } catch (err) {
      toast.error(err.message || 'Could not cancel hold.')
    } finally {
      setLoading(false)
    }
  }

  if (currentHold && ['QUEUED', 'READY'].includes(currentHold.status)) {
    return (
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-600 dark:text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-2">
          <CheckCircle2 size={13} />
          Hold placed — Position in queue
        </div>
        <Button
          size="sm"
          variant="ghost"
          className="h-8 w-8 p-0 text-muted-foreground hover:text-red-500"
          onClick={handleCancelHold}
          disabled={loading}
          title="Cancel hold"
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
      className="gap-1.5 border-amber-500/30 text-amber-700 dark:text-amber-400 hover:bg-amber-500/10"
      onClick={handlePlaceHold}
      disabled={loading}
    >
      {loading ? (
        <Loader2 size={13} className="animate-spin" />
      ) : (
        <Clock size={13} />
      )}
      {loading ? 'Placing hold…' : 'Place Hold'}
    </Button>
  )
}
