/**
 * Library Wishlist Page
 * Displays the member's saved wishlist items with quick access to details.
 */

import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Heart, BookOpen, Loader2, Trash2, ExternalLink,
  BookCheck, AlertTriangle, ArrowLeft, User
} from 'lucide-react'
import { getMyWishlist, removeFromWishlist, placeHold } from '../services/api/library.js'
import { useAuth } from '../app/use-auth.js'
import { toast } from 'sonner'

function EmptyWishlist() {
  return (
    <div className="flex flex-col items-center justify-center py-20 gap-4 text-muted-foreground">
      <Heart size={48} className="opacity-20" />
      <div className="text-center">
        <p className="text-sm font-semibold text-foreground">Your wishlist is empty</p>
        <p className="text-xs mt-1 max-w-xs text-center">
          Browse the catalog and tap the heart icon on any item to save it here for later.
        </p>
      </div>
      <Link to="/library">
        <Button size="sm" className="gap-1.5 text-xs bg-accent hover:bg-accent/90 text-white">
          <BookOpen size={13} /> Browse Catalog
        </Button>
      </Link>
    </div>
  )
}

function WishlistCard({ item, onRemove, onHold, removingId, holdingId }) {
  const statusColors = {
    AVAILABLE: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
    CHECKED_OUT: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
    RESERVED: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20',
    LOST: 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20',
  }

  const isAvailable = (item.available_copies ?? item.item_available_copies ?? 0) > 0
  const status = isAvailable ? 'AVAILABLE' : 'CHECKED_OUT'

  return (
    <Card className="border-border hover:border-accent/30 transition-colors">
      <CardContent className="p-4 grid gap-3">
        {/* Item info */}
        <div className="flex items-start gap-3">
          {/* Cover placeholder */}
          <div className="shrink-0 w-12 h-16 rounded bg-gradient-to-br from-accent/20 to-accent/5 border border-border flex items-center justify-center">
            <BookOpen size={18} className="text-accent/50" />
          </div>

          <div className="flex-1 min-w-0 grid gap-0.5">
            <h3 className="text-sm font-bold text-foreground line-clamp-2 leading-snug">
              {item.item_title || item.title || 'Unknown Title'}
            </h3>
            <p className="text-xs text-muted-foreground line-clamp-1">
              {item.item_author || item.author || 'Unknown author'}
            </p>
            {item.item_isbn && (
              <p className="text-[10px] text-muted-foreground font-mono">
                ISBN: {item.item_isbn}
              </p>
            )}
            <div className="flex items-center gap-2 mt-1.5 flex-wrap">
              <Badge
                className={`text-[9px] font-bold uppercase border px-1.5 py-0.5 ${statusColors[status]}`}
              >
                {isAvailable ? `${item.available_copies ?? item.item_available_copies ?? 0} Available` : 'Checked Out'}
              </Badge>
              {item.item_type && (
                <Badge variant="outline" className="text-[9px] capitalize border-border bg-muted/20">
                  {item.item_type}
                </Badge>
              )}
              {item.location && (
                <span className="text-[10px] text-muted-foreground">{item.location}</span>
              )}
            </div>
          </div>

          {/* Remove button */}
          <button
            type="button"
            onClick={() => onRemove(item.id)}
            disabled={removingId === item.id}
            className="shrink-0 text-muted-foreground hover:text-red-500 transition-colors disabled:opacity-50 p-1"
            title="Remove from wishlist"
          >
            {removingId === item.id ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <Trash2 size={14} />
            )}
          </button>
        </div>

        {/* Added date */}
        {item.added_at || item.created_at ? (
          <p className="text-[10px] text-muted-foreground">
            Saved {new Date(item.added_at || item.created_at).toLocaleDateString('en-GB', {
              day: '2-digit', month: 'short', year: 'numeric',
            })}
          </p>
        ) : null}

        {/* Actions */}
        <div className="flex items-center gap-2 border-t border-border/60 pt-3">
          {!isAvailable ? (
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-[11px] gap-1.5 text-blue-600 border-blue-500/20 hover:bg-blue-500/10 dark:text-blue-400"
              disabled={holdingId === item.catalog_item_id}
              onClick={() => onHold(item.catalog_item_id)}
            >
              {holdingId === item.catalog_item_id ? (
                <Loader2 size={11} className="animate-spin" />
              ) : (
                <BookCheck size={11} />
              )}
              Place Hold
            </Button>
          ) : null}

          <Link to={`/library/resource/${item.catalog_item_id}`} className="ml-auto">
            <Button size="sm" variant="outline" className="h-7 text-[11px] gap-1.5">
              <ExternalLink size={11} />
              View Details
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  )
}

export default function LibraryWishlistPage() {
  const { authState } = useAuth()
  const queryClient = useQueryClient()
  const [removingId, setRemovingId] = useState(null)
  const [holdingId, setHoldingId] = useState(null)

  const { data: wishlist = [], isLoading, isError } = useQuery({
    queryKey: ['my-wishlist'],
    queryFn: getMyWishlist,
    enabled: !!authState?.token,
  })

  const handleRemove = async (wishlistId) => {
    setRemovingId(wishlistId)
    try {
      await removeFromWishlist(wishlistId)
      queryClient.setQueryData(['my-wishlist'], (old) =>
        (old || []).filter((item) => item.id !== wishlistId)
      )
      toast.success('Removed from wishlist.')
    } catch (err) {
      toast.error(err.message || 'Failed to remove.')
    } finally {
      setRemovingId(null)
    }
  }

  const handlePlaceHold = async (catalogItemId) => {
    setHoldingId(catalogItemId)
    try {
      await placeHold(catalogItemId)
      toast.success('Hold placed! You will be notified when the item becomes available.')
    } catch (err) {
      toast.error(err.message || 'Failed to place hold.')
    } finally {
      setHoldingId(null)
    }
  }

  const availableCount = wishlist.filter((i) => (i.available_copies ?? i.item_available_copies ?? 0) > 0).length

  return (
    <div className="mx-auto grid w-full max-w-4xl gap-6 px-4 py-2">
      {/* Page header */}
      <div className="border-b border-border pb-3">
        <div className="flex items-center gap-2 mb-1">
          <Link
            to="/library"
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft size={15} />
          </Link>
          <p className="text-[10px] font-bold uppercase tracking-widest text-accent">My Library</p>
        </div>
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
              <Heart size={18} className="text-rose-500 fill-rose-500" />
              My Wishlist
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Items you've saved for later.
              {wishlist.length > 0 && ` ${availableCount} of ${wishlist.length} available now.`}
            </p>
          </div>

          {wishlist.length > 0 && (
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs font-semibold">
                {wishlist.length} saved item{wishlist.length !== 1 ? 's' : ''}
              </Badge>
              {availableCount > 0 && (
                <Badge className="text-xs font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 border">
                  {availableCount} available
                </Badge>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20 gap-2 text-muted-foreground text-sm">
          <Loader2 size={18} className="animate-spin" />
          Loading wishlist…
        </div>
      ) : isError ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3 text-red-500">
          <AlertTriangle size={28} className="opacity-60" />
          <p className="text-sm">Failed to load wishlist. Please refresh.</p>
        </div>
      ) : wishlist.length === 0 ? (
        <EmptyWishlist />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {wishlist.map((item) => (
            <WishlistCard
              key={item.id}
              item={item}
              onRemove={handleRemove}
              onHold={handlePlaceHold}
              removingId={removingId}
              holdingId={holdingId}
            />
          ))}
        </div>
      )}

      {/* Hint for guest */}
      {!authState?.token && (
        <div className="text-center text-sm text-muted-foreground py-10">
          <User size={24} className="mx-auto mb-2 opacity-30" />
          Please log in to view your wishlist.
        </div>
      )}
    </div>
  )
}
