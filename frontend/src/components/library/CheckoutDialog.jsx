/**
 * Checkout Dialog Component
 * Used by STAFF/ADMIN to checkout a catalog item to a member.
 * Supports manual member ID entry and camera-based barcode scanning.
 */

import { useState, useCallback } from 'react'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Loader2, BookCheck, ScanLine, AlertCircle, X } from 'lucide-react'
import { checkoutItem, searchMembers } from '../../services/api/library.js'
import BarcodeScanner from './BarcodeScanner.jsx'
import { toast } from 'sonner'

export default function CheckoutDialog({ open, onClose, catalogItem, onSuccess }) {
  const [memberId, setMemberId] = useState('')
  const [memberName, setMemberName] = useState('')
  const [memberSearchQuery, setMemberSearchQuery] = useState('')
  const [memberResults, setMemberResults] = useState([])
  const [searchingMember, setSearchingMember] = useState(false)
  const [showScanner, setShowScanner] = useState(false)
  const [scanMode, setScanMode] = useState(null) // 'item' or 'member'
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const debounceRef = { current: null }

  const handleMemberSearch = (query) => {
    setMemberSearchQuery(query)
    setMemberId('')
    setMemberName('')
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (!query.trim() || query.trim().length < 2) {
      setMemberResults([])
      return
    }
    debounceRef.current = setTimeout(async () => {
      setSearchingMember(true)
      try {
        const data = await searchMembers(query.trim())
        setMemberResults(data)
      } catch {
        setMemberResults([])
      } finally {
        setSearchingMember(false)
      }
    }, 300)
  }

  const selectMember = (member) => {
    setMemberId(String(member.id))
    setMemberName(`${member.name} (${member.email})`)
    setMemberSearchQuery(`${member.name} (${member.email})`)
    setMemberResults([])
  }

  const clearMember = () => {
    setMemberId('')
    setMemberName('')
    setMemberSearchQuery('')
    setMemberResults([])
  }

  // Handle scan result — look up member by barcode/ID
  const handleScanResult = useCallback(async (scannedValue) => {
    setShowScanner(false)
    setScanMode(null)

    if (scanMode === 'member') {
      // Try to parse as numeric ID or search by barcode
      const numericId = parseInt(scannedValue, 10)
      if (!isNaN(numericId)) {
        setMemberId(String(numericId))
        setMemberSearchQuery(`Member ID: ${numericId}`)
        setMemberName(`Member #${numericId}`)
        toast.success(`Member ID ${numericId} scanned`)
      } else {
        // Search by email/name from scanned text
        try {
          const data = await searchMembers(scannedValue.trim())
          if (data.length === 1) {
            selectMember(data[0])
            toast.success(`Found member: ${data[0].name}`)
          } else if (data.length > 1) {
            setMemberResults(data)
            setMemberSearchQuery(scannedValue)
            toast.info('Multiple members found — please select one.')
          } else {
            toast.error('No member found with that barcode/ID.')
          }
        } catch {
          toast.error('Member lookup failed.')
        }
      }
    }
  }, [scanMode])

  const handleCheckout = async (e) => {
    e.preventDefault()
    if (!memberId.trim()) {
      setError('Please enter or scan a member ID.')
      return
    }
    setLoading(true)
    setError('')
    try {
      const loan = await checkoutItem(catalogItem.id, parseInt(memberId.trim(), 10))
      toast.success(`"${catalogItem.title}" checked out successfully!`)
      onSuccess?.(loan)
      handleClose()
    } catch (err) {
      setError(err.message || 'Checkout failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    setMemberId('')
    setMemberName('')
    setMemberSearchQuery('')
    setMemberResults([])
    setShowScanner(false)
    setScanMode(null)
    setError('')
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <BookCheck size={16} className="text-accent" />
            Checkout Item
          </DialogTitle>
          <DialogDescription className="text-xs">
            Issue this item to a library member by ID, name, or scan their card.
          </DialogDescription>
        </DialogHeader>

        {/* Item summary */}
        {catalogItem && (
          <div className="rounded-lg border border-border bg-muted/20 p-3 text-sm grid gap-1">
            <p className="font-bold text-foreground line-clamp-1">{catalogItem.title}</p>
            <p className="text-xs text-muted-foreground">
              {catalogItem.authors || catalogItem.author || 'Unknown author'}
              {catalogItem.isbn ? ` · ISBN: ${catalogItem.isbn}` : ''}
            </p>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant="outline" className="text-[10px] font-semibold bg-emerald-500/10 text-emerald-600 border-emerald-500/20">
                {catalogItem.available_copies ?? 0} available
              </Badge>
              {catalogItem.location && (
                <Badge variant="outline" className="text-[10px] font-semibold bg-muted/30">
                  {catalogItem.location}
                </Badge>
              )}
              {catalogItem.barcode && (
                <Badge variant="outline" className="text-[10px] font-mono bg-muted/30">
                  {catalogItem.barcode}
                </Badge>
              )}
            </div>
          </div>
        )}

        <form onSubmit={handleCheckout} className="grid gap-4">
          {/* Member lookup */}
          <div className="grid gap-1.5">
            <Label className="text-xs font-semibold">Member</Label>

            {/* Member ID / name search row */}
            <div className="relative">
              <Input
                type="text"
                placeholder="Search by name, email, or enter numeric ID…"
                value={memberSearchQuery}
                onChange={(e) => handleMemberSearch(e.target.value)}
                className="pr-8"
                autoFocus
              />
              {(memberSearchQuery || memberId) && (
                <button
                  type="button"
                  onClick={clearMember}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  aria-label="Clear member"
                >
                  <X size={12} />
                </button>
              )}
            </div>

            {/* Dropdown results */}
            {memberResults.length > 0 && (
              <div className="rounded-lg border border-border bg-card shadow-md overflow-hidden max-h-44 overflow-y-auto z-50">
                {memberResults.map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => selectMember(m)}
                    className="w-full text-left px-3 py-2 text-xs hover:bg-muted/40 border-b border-border/50 last:border-0 grid gap-0.5"
                  >
                    <span className="font-semibold text-foreground">{m.name}</span>
                    <span className="text-muted-foreground">{m.email} · ID {m.id}</span>
                  </button>
                ))}
              </div>
            )}

            {searchingMember && (
              <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                <Loader2 size={11} className="animate-spin" /> Searching…
              </p>
            )}

            {/* Scan member card button */}
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-7 gap-1.5 text-[11px] w-fit"
              onClick={() => {
                setScanMode('member')
                setShowScanner(true)
              }}
            >
              <ScanLine size={12} />
              Scan Member Card
            </Button>

            {memberId && (
              <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                ✓ Member ID {memberId} selected
                {memberName ? ` — ${memberName}` : ''}
              </p>
            )}

            <p className="text-[10px] text-muted-foreground">
              Loan period: 14 days · Max 2 renewals of 7 days each
            </p>
          </div>

          {/* Inline barcode scanner */}
          {showScanner && (
            <BarcodeScanner
              active={showScanner}
              onResult={handleScanResult}
              onClose={() => { setShowScanner(false); setScanMode(null) }}
            />
          )}

          {error && (
            <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 dark:bg-red-950/20 dark:border-red-900/30 p-2.5 text-xs text-red-600 dark:text-red-400">
              <AlertCircle size={13} className="shrink-0" />
              {error}
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" size="sm" onClick={handleClose} disabled={loading}>
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              className="bg-accent hover:bg-accent/90 text-white gap-1.5"
              disabled={loading || !memberId.trim()}
            >
              {loading ? <Loader2 size={13} className="animate-spin" /> : <BookCheck size={13} />}
              {loading ? 'Processing…' : 'Checkout'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
