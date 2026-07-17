/**
 * Catalog Circulation Page
 * Staff/Admin page to search physical catalog items and perform checkouts.
 */

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import {
  BookCheck, Search, Loader2, AlertCircle, BookOpen,
  User, MapPin, CheckCircle2, X, RefreshCw, RotateCcw, ScanLine,
  ClipboardList, CalendarCheck, PlusCircle, Check, Ban, Clock3
} from 'lucide-react'
import {
  searchCatalog, checkoutItem, getOverdueLoans, returnItem, lookupCatalog, searchMembers,
  getPendingBorrowRequests, approveBorrowRequest, rejectBorrowRequest,
  listSubscriptions, activateSubscription, rejectSubscriptionRenewal, createCatalogItem,
} from '../services/api/library.js'
import { circulationErrorMessage } from '../services/api/errorMessages.js'
import BarcodeScanner from '../components/library/BarcodeScanner.jsx'
import MemberSearchInput from '../components/library/MemberSearchCombobox.jsx'
import { toast } from 'sonner'

// ── Checkout Panel (slide-in on item select) ───────────────────────

function CheckoutPanel({ item, onClose, onSuccess }) {
  const [selectedMember, setSelectedMember] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showScanner, setShowScanner] = useState(false)

  const handleScanResult = async (scannedValue) => {
    setShowScanner(false)
    // Verify the scanned card against the member directory rather than
    // trusting an arbitrary scanned number as a member ID.
    try {
      const data = await searchMembers(scannedValue.trim())
      if (data.length === 1) {
        setSelectedMember(data[0])
        toast.success(`Found: ${data[0].name}`)
      } else if (data.length > 1) {
        toast.info('Multiple members found — please search manually.')
      } else {
        toast.error(`No member found for "${scannedValue}".`)
      }
    } catch {
      toast.error('Member lookup failed.')
    }
  }

  const handleCheckout = async () => {
    if (!selectedMember) { setError('Select a member first.'); return }
    setLoading(true)
    setError('')
    try {
      await checkoutItem(item.id, selectedMember.id)
      toast.success(`"${item.title}" checked out to ${selectedMember.name || selectedMember.email}`)
      onSuccess()
      onClose()
    } catch (err) {
      setError(circulationErrorMessage(err, 'Checkout failed.'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="rounded-xl border border-accent/30 bg-accent/5 p-4 grid gap-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="grid gap-0.5 flex-1 min-w-0">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Checking out</p>
          <p className="text-sm font-bold text-foreground truncate">{item.title}</p>
          <p className="text-xs text-muted-foreground">{item.authors || '—'}</p>
        </div>
        <button type="button" onClick={onClose} className="text-muted-foreground hover:text-foreground shrink-0">
          <X size={14} />
        </button>
      </div>

      {/* Member selector */}
      <div className="grid gap-1.5">
        <label className="text-xs font-semibold text-foreground">Issue to Member</label>

        {/* Show selected member pill, or search input */}
        {selectedMember ? (
          <div className="flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/5 px-3 py-2">
            <div className="w-6 h-6 rounded-full bg-accent/20 text-accent text-xs font-bold flex items-center justify-center shrink-0">
              {(selectedMember.name || selectedMember.email || '#').charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-foreground truncate">{selectedMember.name || `Member #${selectedMember.id}`}</p>
              {selectedMember.email && <p className="text-[12px] text-muted-foreground truncate">{selectedMember.email}</p>}
            </div>
            <button
              type="button"
              onClick={() => setSelectedMember(null)}
              className="text-muted-foreground hover:text-red-500 transition-colors"
            >
              <X size={12} />
            </button>
          </div>
        ) : (
          <MemberSearchInput value={selectedMember} onChange={setSelectedMember} />
        )}

        {/* Scan button */}
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-7 w-fit gap-1.5 text-[13px]"
          onClick={() => setShowScanner((v) => !v)}
        >
          <ScanLine size={12} />
          {showScanner ? 'Close Scanner' : 'Scan Member Card'}
        </Button>

        <p className="text-[12px] text-muted-foreground">Loan period: 14 days · Max 2 renewals of 7 days each</p>
      </div>

      {/* Inline barcode scanner */}
      {showScanner && (
        <BarcodeScanner
          active={showScanner}
          onResult={handleScanResult}
          onClose={() => setShowScanner(false)}
        />
      )}

      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 dark:bg-red-950/20 dark:border-red-900/30 p-2.5 text-xs text-red-600">
          <AlertCircle size={12} className="shrink-0" /> {error}
        </div>
      )}

      <Button
        onClick={handleCheckout}
        disabled={!selectedMember || loading}
        size="sm"
        className="bg-accent hover:bg-accent/90 text-white gap-1.5 w-full"
      >
        {loading ? <Loader2 size={13} className="animate-spin" /> : <BookCheck size={13} />}
        {loading ? 'Processing…' : 'Confirm Checkout'}
      </Button>
    </div>
  )
}

// ── Catalog Search Panel ───────────────────────────────────────────

function CatalogSearchPanel() {
  const queryClient = useQueryClient()
  const [searchQuery, setSearchQuery] = useState('')
  const [submittedQuery, setSubmittedQuery] = useState('')
  const [selectedItem, setSelectedItem] = useState(null)
  const [showItemScanner, setShowItemScanner] = useState(false)
  const [looking, setLooking] = useState(false)

  // Load all items on mount (empty query = all)
  const { data: allData, isLoading: allLoading } = useQuery({
    queryKey: ['catalog-all'],
    queryFn: () => searchCatalog({ limit: 100 }),
  })

  // Load filtered results when user searches
  const { data: searchData, isLoading: searchLoading, isError } = useQuery({
    queryKey: ['catalog-search', submittedQuery],
    queryFn: () => searchCatalog({ q: submittedQuery, limit: 50 }),
    enabled: submittedQuery.length > 0,
  })

  const isLoading = submittedQuery ? searchLoading : allLoading
  const items = submittedQuery
    ? (searchData?.items || searchData || [])
    : (allData?.items || allData || [])

  const handleSearch = (e) => {
    e.preventDefault()
    setSelectedItem(null)
    setSubmittedQuery(searchQuery.trim())
  }

  const handleClear = () => {
    setSearchQuery('')
    setSubmittedQuery('')
    setSelectedItem(null)
  }

  // Scan a book's barcode/QR (or ISBN) and jump straight to that item.
  const handleItemScan = async (scannedValue) => {
    setShowItemScanner(false)
    const code = String(scannedValue || '').trim()
    if (!code) return
    setLooking(true)
    try {
      const { item, matchedBy } = await lookupCatalog(code)
      setSelectedItem(item)
      // Surface the matched item in the list too, so staff see it in context.
      setSearchQuery(item.title || code)
      setSubmittedQuery(item.title || code)
      toast.success(`Matched by ${matchedBy}: ${item.title}`)
    } catch (err) {
      toast.error(circulationErrorMessage(err, `No item matched "${code}".`))
    } finally {
      setLooking(false)
    }
  }

  const availableCount = items.filter(i => i.available_copies > 0).length

  return (
    <div className="grid gap-4">
      {/* Search bar */}
      <form onSubmit={handleSearch} className="flex gap-2">
        <div className="relative flex-1">
          <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Filter by title, author, ISBN…"
            className="pl-7 pr-7 text-xs"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={handleClear}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X size={11} />
            </button>
          )}
        </div>
        <Button type="submit" size="sm" className="gap-1.5 bg-accent hover:bg-accent/90 text-white shrink-0">
          <Search size={12} /> Search
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="gap-1.5 shrink-0"
          onClick={() => setShowItemScanner((v) => !v)}
          disabled={looking}
        >
          {looking ? <Loader2 size={12} className="animate-spin" /> : <ScanLine size={12} />}
          {showItemScanner ? 'Close' : 'Scan Item'}
        </Button>
      </form>

      {/* Inline item scanner (scan a book barcode/QR → jump to it) */}
      {showItemScanner && (
        <BarcodeScanner
          active={showItemScanner}
          onResult={handleItemScan}
          onClose={() => setShowItemScanner(false)}
        />
      )}

      {/* Summary row */}
      {!isLoading && items.length > 0 && (
        <div className="flex items-center gap-3 text-[13px] text-muted-foreground">
          <span className="font-semibold text-foreground">{items.length}</span> item{items.length !== 1 ? 's' : ''}
          {submittedQuery
            ? <span>matching <span className="font-semibold text-foreground">"{submittedQuery}"</span></span>
            : <span>in catalog</span>
          }
          <span className="ml-auto flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
            {availableCount} available
          </span>
        </div>
      )}

      {/* Loading */}
      {isLoading && (
        <div className="flex justify-center py-10">
          <Loader2 size={20} className="animate-spin text-muted-foreground" />
        </div>
      )}

      {/* Error */}
      {isError && (
        <p className="text-xs text-red-500 text-center py-6">Failed to load catalog. Check your connection.</p>
      )}

      {/* No results from search */}
      {!isLoading && !isError && submittedQuery && items.length === 0 && (
        <div className="text-center py-10 text-muted-foreground">
          <BookOpen size={28} className="mx-auto opacity-20 mb-2" />
          <p className="text-sm">No items found for "{submittedQuery}"</p>
          <button type="button" onClick={handleClear} className="text-xs text-accent mt-1 hover:underline">
            Clear filter
          </button>
        </div>
      )}

      {/* Item list */}
      {!isLoading && items.length > 0 && (
        <div className="grid gap-2">
          {items.map((item) => (
            <div key={item.id}>
              <div
                className={`rounded-xl border p-3.5 transition-all cursor-pointer ${
                  selectedItem?.id === item.id
                    ? 'border-accent/50 bg-accent/5 shadow-sm'
                    : item.available_copies > 0
                      ? 'border-border bg-card hover:bg-muted/30 hover:border-accent/20'
                      : 'border-border bg-muted/20 opacity-60'
                }`}
                onClick={() => setSelectedItem(selectedItem?.id === item.id ? null : item)}
              >
                <div className="flex items-start gap-3">
                  {/* Book spine graphic */}
                  <div className={`w-9 h-12 rounded flex items-center justify-center shrink-0 ${
                    item.available_copies > 0 ? 'bg-accent/10' : 'bg-muted'
                  }`}>
                    <BookOpen size={16} className={item.available_copies > 0 ? 'text-accent/70' : 'text-muted-foreground/40'} />
                  </div>

                  <div className="flex-1 min-w-0 grid gap-0.5">
                    <p className="text-sm font-bold text-foreground line-clamp-1">{item.title}</p>
                    <p className="text-xs text-muted-foreground line-clamp-1">{item.authors || '—'}</p>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      {item.isbn && (
                        <span className="text-[12px] text-muted-foreground font-mono">ISBN: {item.isbn}</span>
                      )}
                      {item.location && (
                        <span className="flex items-center gap-0.5 text-[12px] text-muted-foreground">
                          <MapPin size={9} /> {item.location}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="shrink-0 text-right grid gap-1 items-start">
                    <Badge
                      className={`text-[12px] font-semibold border ${
                        item.available_copies > 0
                          ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'
                          : 'bg-red-500/10 text-red-600 border-red-500/20'
                      }`}
                    >
                      {item.available_copies > 0 ? `${item.available_copies} available` : 'All checked out'}
                    </Badge>
                    <Badge variant="outline" className="text-[11px]">{item.item_type || 'BOOK'}</Badge>
                    {item.available_copies > 0 && selectedItem?.id !== item.id && (
                      <span className="text-[11px] text-accent font-semibold">Click to checkout →</span>
                    )}
                  </div>
                </div>
              </div>

              {selectedItem?.id === item.id && item.available_copies > 0 && (
                <div className="mt-2">
                  <CheckoutPanel
                    item={item}
                    onClose={() => setSelectedItem(null)}
                    onSuccess={() => {
                      queryClient.invalidateQueries({ queryKey: ['catalog-all'] })
                      queryClient.invalidateQueries({ queryKey: ['catalog-search', submittedQuery] })
                      queryClient.invalidateQueries({ queryKey: ['overdue-loans'] })
                      setSelectedItem(null)
                    }}
                  />
                </div>
              )}
              {selectedItem?.id === item.id && item.available_copies < 1 && (
                <div className="mt-2 rounded-xl border border-red-200 bg-red-50 dark:bg-red-950/20 p-3 text-xs text-red-600 flex items-center gap-2">
                  <AlertCircle size={13} /> No copies available. The member can place a hold instead.
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Active Overdue Panel ───────────────────────────────────────────

function OverduePanel() {
  const queryClient = useQueryClient()

  const { data: overdueLoans = [], isLoading, isError, refetch } = useQuery({
    queryKey: ['overdue-loans'],
    queryFn: getOverdueLoans,
  })

  const returnMutation = useMutation({
    mutationFn: (loanId) => returnItem(loanId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['overdue-loans'] })
      queryClient.invalidateQueries({ queryKey: ['overdue-loans-widget'] })
      queryClient.invalidateQueries({ queryKey: ['catalog-all'] })
      toast.success('Item returned successfully.')
    },
    onError: (err) => toast.error(circulationErrorMessage(err, 'Return failed.')),
  })

  if (isLoading) return <div className="flex justify-center py-10"><Loader2 size={18} className="animate-spin text-muted-foreground" /></div>
  if (isError) return <p className="text-xs text-red-500 text-center py-6">Failed to load overdue loans.</p>
  if (!overdueLoans.length) return (
    <div className="text-center py-10 text-muted-foreground">
      <CheckCircle2 size={28} className="mx-auto opacity-20 mb-2 text-emerald-500" />
      <p className="text-sm">No overdue loans — all clear!</p>
    </div>
  )

  return (
    <div className="grid gap-2">
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">{overdueLoans.length} overdue loan{overdueLoans.length !== 1 ? 's' : ''}</span>
        <Button size="sm" variant="ghost" className="h-7 text-[13px] gap-1" onClick={() => refetch()}>
          <RefreshCw size={11} /> Refresh
        </Button>
      </div>
      {overdueLoans.map((loan) => (
        <div key={loan.id} className="rounded-xl border border-red-200/60 bg-red-50/30 dark:bg-red-950/10 dark:border-red-900/20 p-3.5 grid gap-2">
          <div className="flex items-start justify-between gap-2 flex-wrap">
            <div className="grid gap-0.5 flex-1 min-w-0">
              <p className="text-sm font-bold text-foreground truncate">{loan.item_title || 'Unknown Item'}</p>
              <p className="text-xs text-muted-foreground">
                {loan.member_name || 'Unknown member'} · {loan.member_email || ''}
              </p>
            </div>
            <Badge className="text-[12px] border bg-red-500/10 text-red-600 border-red-500/20 font-semibold uppercase shrink-0">
              OVERDUE
            </Badge>
          </div>
          <div className="flex items-center justify-between text-[13px] text-muted-foreground border-t border-border/40 pt-2">
            <span>Due: <span className="text-red-600 font-semibold">{new Date(loan.due_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</span></span>
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-[13px] gap-1.5"
              disabled={returnMutation.isPending}
              onClick={() => returnMutation.mutate(loan.id)}
            >
              {returnMutation.isPending ? <Loader2 size={11} className="animate-spin" /> : <RotateCcw size={11} />}
              Return
            </Button>
          </div>
        </div>
      ))}
    </div>
  )
}

// ── Borrow Requests Panel ───────────────────────────────────────────

function BorrowRequestsPanel() {
  const queryClient = useQueryClient()
  const { data: requests = [], isLoading, isError, refetch } = useQuery({
    queryKey: ['pending-borrow-requests'],
    queryFn: getPendingBorrowRequests,
  })
  const [expanded, setExpanded] = useState(null) // { id, mode: 'approve'|'reject' }
  const [loanDays, setLoanDays] = useState(14)
  const [rejectReason, setRejectReason] = useState('')
  const [showScanner, setShowScanner] = useState(false)
  const [scanResult, setScanResult] = useState(null) // { matched, title } | null
  const [scanning, setScanning] = useState(false)

  const openApprove = (req) => {
    setExpanded({ id: req.id, mode: 'approve' })
    setLoanDays(14)
    setShowScanner(false)
    setScanResult(null)
  }

  const handleScanResult = async (code, expectedItemId) => {
    setShowScanner(false)
    setScanning(true)
    try {
      const { item } = await lookupCatalog(code)
      setScanResult({ matched: String(item.id) === String(expectedItemId), title: item.title })
    } catch {
      setScanResult({ matched: false, title: null })
      toast.error(`No catalog item matched "${code}".`)
    } finally {
      setScanning(false)
    }
  }

  const approveMutation = useMutation({
    mutationFn: ({ id, days }) => approveBorrowRequest(id, days),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pending-borrow-requests'] })
      queryClient.invalidateQueries({ queryKey: ['catalog-all'] })
      toast.success('Request approved — item checked out.')
      setExpanded(null)
    },
    onError: (err) => toast.error(circulationErrorMessage(err, 'Approval failed.')),
  })

  const rejectMutation = useMutation({
    mutationFn: ({ id, reason }) => rejectBorrowRequest(id, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pending-borrow-requests'] })
      toast.success('Request rejected.')
      setExpanded(null)
      setRejectReason('')
    },
    onError: (err) => toast.error(circulationErrorMessage(err, 'Rejection failed.')),
  })

  if (isLoading) return <div className="flex justify-center py-10"><Loader2 size={18} className="animate-spin text-muted-foreground" /></div>
  if (isError) return <p className="text-xs text-red-500 text-center py-6">Failed to load borrow requests.</p>
  if (!requests.length) return (
    <div className="text-center py-10 text-muted-foreground">
      <ClipboardList size={28} className="mx-auto opacity-20 mb-2" />
      <p className="text-sm">No pending borrow requests.</p>
    </div>
  )

  return (
    <div className="grid gap-2">
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">{requests.length} pending request{requests.length !== 1 ? 's' : ''}</span>
        <Button size="sm" variant="ghost" className="h-7 text-[13px] gap-1" onClick={() => refetch()}>
          <RefreshCw size={11} /> Refresh
        </Button>
      </div>
      {requests.map((req) => (
        <div key={req.id} className="rounded-xl border border-border bg-card p-3.5 grid gap-2.5">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div className="grid gap-0.5 flex-1 min-w-0">
              <p className="text-sm font-bold text-foreground truncate">{req.item_title || 'Unknown Item'}</p>
              <p className="text-xs text-muted-foreground">
                {req.member_name || 'Unknown member'} · {req.member_email || ''}
              </p>
            </div>
            <Badge variant="outline" className="text-[12px] shrink-0">
              {req.item_available_copies ?? 0} available
            </Badge>
          </div>

          {expanded?.id !== req.id && (
            <div className="flex items-center gap-2 border-t border-border/50 pt-2.5">
              <span className="text-[13px] text-muted-foreground mr-auto">
                Requested {new Date(req.requested_at || req.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
              </span>
              <Button size="sm" variant="outline" className="h-7 text-[13px] gap-1.5 border-emerald-500/30 text-emerald-700 hover:bg-emerald-500/10 dark:text-emerald-400"
                onClick={() => openApprove(req)}>
                <Check size={11} /> Approve
              </Button>
              <Button size="sm" variant="outline" className="h-7 text-[13px] gap-1.5 border-red-500/30 text-red-700 hover:bg-red-500/10 dark:text-red-400"
                onClick={() => { setExpanded({ id: req.id, mode: 'reject' }); setRejectReason('') }}>
                <Ban size={11} /> Reject
              </Button>
            </div>
          )}

          {expanded?.id === req.id && expanded.mode === 'approve' && (
            <div className="border-t border-border/50 pt-2.5 grid gap-2.5">
              <div className="grid gap-1.5">
                <Label className="text-[13px] font-semibold">Verify physical book</Label>
                {scanResult ? (
                  <div className={`flex items-center gap-1.5 text-[13px] font-semibold rounded-lg px-2.5 py-1.5 border w-fit ${
                    scanResult.matched
                      ? 'text-emerald-700 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/20'
                      : 'text-amber-700 dark:text-amber-400 bg-amber-500/10 border-amber-500/20'
                  }`}>
                    {scanResult.matched ? <CheckCircle2 size={12} /> : <AlertCircle size={12} />}
                    {scanResult.matched
                      ? `Verified: "${scanResult.title}" matches this request`
                      : scanResult.title
                        ? `Scanned "${scanResult.title}" — doesn't match this request`
                        : 'Scanned code did not match any catalog item'}
                    <button type="button" className="ml-1 text-muted-foreground hover:text-foreground" onClick={() => setScanResult(null)}>
                      <X size={11} />
                    </button>
                  </div>
                ) : (
                  <Button type="button" size="sm" variant="outline" className="h-7 w-fit text-[13px] gap-1.5"
                    disabled={scanning}
                    onClick={() => setShowScanner(v => !v)}>
                    {scanning ? <Loader2 size={11} className="animate-spin" /> : <ScanLine size={11} />}
                    {showScanner ? 'Close Scanner' : 'Scan Book Barcode / QR'}
                  </Button>
                )}
                {showScanner && (
                  <BarcodeScanner
                    active={showScanner}
                    onResult={(code) => handleScanResult(code, req.item_id)}
                    onClose={() => setShowScanner(false)}
                  />
                )}
              </div>

              <Label className="text-[13px] font-semibold">Loan period (days)</Label>
              <div className="flex items-center gap-2">
                <Input type="number" min={1} max={60} value={loanDays}
                  onChange={e => setLoanDays(parseInt(e.target.value, 10) || 14)}
                  className="h-8 w-24 text-xs" />
                <Button size="sm" className="h-8 text-xs gap-1.5 bg-accent hover:bg-accent/90 text-white"
                  disabled={approveMutation.isPending}
                  onClick={() => approveMutation.mutate({ id: req.id, days: loanDays })}>
                  {approveMutation.isPending ? <Loader2 size={12} className="animate-spin" /> : <BookCheck size={12} />}
                  Confirm & Checkout
                </Button>
                <Button size="sm" variant="ghost" className="h-8 text-xs" onClick={() => setExpanded(null)}>Cancel</Button>
              </div>
            </div>
          )}

          {expanded?.id === req.id && expanded.mode === 'reject' && (
            <div className="border-t border-border/50 pt-2.5 grid gap-2">
              <Label className="text-[13px] font-semibold">Reason (shown to the member)</Label>
              <Textarea rows={2} value={rejectReason} onChange={e => setRejectReason(e.target.value)}
                placeholder="e.g. Please collect within 2 days of an approved request next time." className="text-xs resize-none" />
              <div className="flex items-center gap-2">
                <Button size="sm" variant="outline" className="h-8 text-xs gap-1.5 border-red-500/30 text-red-700 hover:bg-red-500/10 dark:text-red-400"
                  disabled={rejectMutation.isPending}
                  onClick={() => rejectMutation.mutate({ id: req.id, reason: rejectReason })}>
                  {rejectMutation.isPending ? <Loader2 size={12} className="animate-spin" /> : <Ban size={12} />}
                  Confirm Reject
                </Button>
                <Button size="sm" variant="ghost" className="h-8 text-xs" onClick={() => setExpanded(null)}>Cancel</Button>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

// ── Subscriptions Panel ─────────────────────────────────────────────

function SubscriptionsPanel() {
  const queryClient = useQueryClient()
  const [selectedMember, setSelectedMember] = useState(null)
  const [months, setMonths] = useState(1)
  const [expandedRenewal, setExpandedRenewal] = useState(null) // { memberId, mode: 'approve'|'reject' }
  const [renewMonths, setRenewMonths] = useState(1)
  const [renewReason, setRenewReason] = useState('')

  const { data, isLoading, isError } = useQuery({
    queryKey: ['subscriptions-list'],
    queryFn: () => listSubscriptions({ limit: 25 }),
  })

  const activateMutation = useMutation({
    mutationFn: () => activateSubscription(selectedMember.id, months),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subscriptions-list'] })
      toast.success(`Subscription activated for ${selectedMember.name || selectedMember.email}.`)
      setSelectedMember(null)
      setMonths(1)
    },
    onError: (err) => toast.error(circulationErrorMessage(err, 'Activation failed.')),
  })

  const renewApproveMutation = useMutation({
    mutationFn: ({ memberId, renewMonths }) => activateSubscription(memberId, renewMonths),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subscriptions-list'] })
      toast.success('Renewal approved.')
      setExpandedRenewal(null)
    },
    onError: (err) => toast.error(circulationErrorMessage(err, 'Renewal approval failed.')),
  })

  const renewRejectMutation = useMutation({
    mutationFn: ({ memberId, reason }) => rejectSubscriptionRenewal(memberId, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subscriptions-list'] })
      toast.success('Renewal request rejected.')
      setExpandedRenewal(null)
      setRenewReason('')
    },
    onError: (err) => toast.error(circulationErrorMessage(err, 'Rejection failed.')),
  })

  const subscriptions = data?.items || []
  const renewalRequests = subscriptions.filter(sub => sub.renewal_requested_at)

  return (
    <div className="grid gap-5">
      {renewalRequests.length > 0 && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 grid gap-2.5">
          <p className="text-xs font-semibold text-amber-700 dark:text-amber-400 uppercase tracking-wide flex items-center gap-1.5">
            <Clock3 size={13} /> {renewalRequests.length} Renewal Request{renewalRequests.length !== 1 ? 's' : ''} — requires librarian approval
          </p>
          <div className="grid gap-2">
            {renewalRequests.map(sub => (
              <div key={sub.id} className="rounded-lg bg-card border border-border px-3 py-2.5 grid gap-2">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-foreground truncate">{sub.member_name || sub.member_email}</p>
                    <p className="text-[12px] text-muted-foreground">
                      Requested {new Date(sub.renewal_requested_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </p>
                  </div>
                  {expandedRenewal?.memberId !== sub.member_id && (
                    <div className="flex items-center gap-1.5 shrink-0">
                      <Button size="sm" variant="outline" className="h-7 text-[13px] gap-1.5 border-emerald-500/30 text-emerald-700 hover:bg-emerald-500/10 dark:text-emerald-400"
                        onClick={() => { setExpandedRenewal({ memberId: sub.member_id, mode: 'approve' }); setRenewMonths(1) }}>
                        <Check size={11} /> Approve
                      </Button>
                      <Button size="sm" variant="outline" className="h-7 text-[13px] gap-1.5 border-red-500/30 text-red-700 hover:bg-red-500/10 dark:text-red-400"
                        onClick={() => { setExpandedRenewal({ memberId: sub.member_id, mode: 'reject' }); setRenewReason('') }}>
                        <Ban size={11} /> Reject
                      </Button>
                    </div>
                  )}
                </div>

                {expandedRenewal?.memberId === sub.member_id && expandedRenewal.mode === 'approve' && (
                  <div className="border-t border-border/50 pt-2 flex items-center gap-2">
                    <Select value={renewMonths} onChange={e => setRenewMonths(parseInt(e.target.value, 10))} className="h-8 text-xs w-28">
                      <option value={1}>1 month</option>
                      <option value={3}>3 months</option>
                      <option value={6}>6 months</option>
                      <option value={12}>12 months</option>
                    </Select>
                    <Button size="sm" className="h-8 text-xs gap-1.5 bg-accent hover:bg-accent/90 text-white"
                      disabled={renewApproveMutation.isPending}
                      onClick={() => renewApproveMutation.mutate({ memberId: sub.member_id, renewMonths })}>
                      {renewApproveMutation.isPending ? <Loader2 size={12} className="animate-spin" /> : <CalendarCheck size={12} />}
                      Confirm Renewal
                    </Button>
                    <Button size="sm" variant="ghost" className="h-8 text-xs" onClick={() => setExpandedRenewal(null)}>Cancel</Button>
                  </div>
                )}

                {expandedRenewal?.memberId === sub.member_id && expandedRenewal.mode === 'reject' && (
                  <div className="border-t border-border/50 pt-2 grid gap-2">
                    <Textarea rows={2} value={renewReason} onChange={e => setRenewReason(e.target.value)}
                      placeholder="Reason shown to the member (optional)" className="text-xs resize-none" />
                    <div className="flex items-center gap-2">
                      <Button size="sm" variant="outline" className="h-8 text-xs gap-1.5 border-red-500/30 text-red-700 hover:bg-red-500/10 dark:text-red-400"
                        disabled={renewRejectMutation.isPending}
                        onClick={() => renewRejectMutation.mutate({ memberId: sub.member_id, reason: renewReason })}>
                        {renewRejectMutation.isPending ? <Loader2 size={12} className="animate-spin" /> : <Ban size={12} />}
                        Confirm Reject
                      </Button>
                      <Button size="sm" variant="ghost" className="h-8 text-xs" onClick={() => setExpandedRenewal(null)}>Cancel</Button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="rounded-xl border border-accent/30 bg-accent/5 p-4 grid gap-3">
        <p className="text-xs font-semibold text-foreground uppercase tracking-wide">Activate / Renew Subscription</p>
        <div className="grid sm:grid-cols-[1fr_auto_auto] gap-2 items-start">
          <MemberSearchInput value={selectedMember} onChange={setSelectedMember} />
          <Select value={months} onChange={e => setMonths(parseInt(e.target.value, 10))} className="h-8 text-xs w-28">
            <option value={1}>1 month</option>
            <option value={3}>3 months</option>
            <option value={6}>6 months</option>
            <option value={12}>12 months</option>
          </Select>
          <Button size="sm" className="h-8 text-xs gap-1.5 bg-accent hover:bg-accent/90 text-white"
            disabled={!selectedMember || activateMutation.isPending}
            onClick={() => activateMutation.mutate()}>
            {activateMutation.isPending ? <Loader2 size={12} className="animate-spin" /> : <CalendarCheck size={12} />}
            Activate
          </Button>
        </div>
        <p className="text-[12px] text-muted-foreground">
          Confirms the member has paid off-app, then records the subscription period. Renewing extends the existing expiry.
        </p>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-8"><Loader2 size={18} className="animate-spin text-muted-foreground" /></div>
      ) : isError ? (
        <p className="text-xs text-red-500 text-center py-6">Failed to load subscriptions.</p>
      ) : !subscriptions.length ? (
        <p className="text-xs text-muted-foreground text-center py-6">No subscriptions activated yet.</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-xs">
            <thead className="bg-muted/30 border-b border-border">
              <tr>
                {['Member', 'Status', 'Start', 'Expires'].map(h => (
                  <th key={h} className="text-left px-3 py-2.5 font-semibold text-muted-foreground">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {subscriptions.map((sub, i) => (
                <tr key={sub.id} className={`border-b border-border/50 ${i % 2 ? 'bg-muted/10' : ''}`}>
                  <td className="px-3 py-2.5">
                    <p className="font-semibold text-foreground">{sub.member_name || '—'}</p>
                    <p className="text-[12px] text-muted-foreground">{sub.member_email}</p>
                  </td>
                  <td className="px-3 py-2.5">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <Badge className={`text-[11px] font-semibold border uppercase ${
                        sub.status === 'ACTIVE' && new Date(sub.end_date) > new Date()
                          ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'
                          : 'bg-muted/30 text-muted-foreground border-border'
                      }`}>
                        {sub.status}
                      </Badge>
                      {sub.renewal_requested_at && (
                        <Badge className="text-[11px] font-semibold border uppercase bg-amber-500/10 text-amber-600 border-amber-500/20">
                          Renewal requested
                        </Badge>
                      )}
                    </div>
                  </td>
                  <td className="px-3 py-2.5 text-muted-foreground">{new Date(sub.start_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</td>
                  <td className="px-3 py-2.5 text-muted-foreground">{new Date(sub.end_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

// ── Add Book Panel ──────────────────────────────────────────────────

const CATEGORY_OPTIONS = ['textbook', 'reference', 'journal', 'magazine', 'thesis', 'dvd', 'other']

function AddBookPanel() {
  const queryClient = useQueryClient()
  const emptyForm = {
    title: '', author: '', isbn: '', subject: '', description: '',
    item_type: 'textbook', language: 'EN', publisher: '', publish_year: '',
    total_copies: 1, cover_image_url: '',
    location_floor: '', location_shelf: '', location_column: '',
  }
  const [form, setForm] = useState(emptyForm)
  const set = (key) => (e) => setForm(p => ({ ...p, [key]: e.target.value }))

  const createMutation = useMutation({
    mutationFn: () => {
      const locationParts = [
        form.location_floor && `Floor ${form.location_floor}`,
        form.location_shelf && `Shelf ${form.location_shelf}`,
        form.location_column && `Col ${form.location_column}`,
      ].filter(Boolean)

      return createCatalogItem({
        ...form,
        publish_year: form.publish_year ? parseInt(form.publish_year, 10) : undefined,
        total_copies: parseInt(form.total_copies, 10) || 1,
        location: locationParts.join(' · ') || undefined,
      })
    },
    onSuccess: (item) => {
      queryClient.invalidateQueries({ queryKey: ['catalog-all'] })
      toast.success(`"${item.title}" added to the catalog.`)
      setForm(emptyForm)
    },
    onError: (err) => toast.error(circulationErrorMessage(err, 'Could not add book.')),
  })

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!form.title.trim()) { toast.error('Title is required.'); return }
    createMutation.mutate()
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-4 max-w-2xl">
      <div className="grid sm:grid-cols-2 gap-3">
        <div className="grid gap-1.5">
          <Label className="text-xs font-semibold">Title *</Label>
          <Input value={form.title} onChange={set('title')} required className="text-xs" />
        </div>
        <div className="grid gap-1.5">
          <Label className="text-xs font-semibold">Author</Label>
          <Input value={form.author} onChange={set('author')} className="text-xs" />
        </div>
      </div>

      <div className="grid sm:grid-cols-3 gap-3">
        <div className="grid gap-1.5">
          <Label className="text-xs font-semibold">ISBN</Label>
          <Input value={form.isbn} onChange={set('isbn')} className="text-xs" />
        </div>
        <div className="grid gap-1.5">
          <Label className="text-xs font-semibold">Category</Label>
          <Select value={form.item_type} onChange={set('item_type')} className="text-xs">
            {CATEGORY_OPTIONS.map(c => <option key={c} value={c}>{c[0].toUpperCase() + c.slice(1)}</option>)}
          </Select>
        </div>
        <div className="grid gap-1.5">
          <Label className="text-xs font-semibold">Total Copies</Label>
          <Input type="number" min={1} value={form.total_copies} onChange={set('total_copies')} className="text-xs" />
        </div>
      </div>

      <div className="grid sm:grid-cols-3 gap-3">
        <div className="grid gap-1.5">
          <Label className="text-xs font-semibold">Subject</Label>
          <Input value={form.subject} onChange={set('subject')} className="text-xs" />
        </div>
        <div className="grid gap-1.5">
          <Label className="text-xs font-semibold">Publisher</Label>
          <Input value={form.publisher} onChange={set('publisher')} className="text-xs" />
        </div>
        <div className="grid gap-1.5">
          <Label className="text-xs font-semibold">Publish Year</Label>
          <Input type="number" value={form.publish_year} onChange={set('publish_year')} className="text-xs" />
        </div>
      </div>

      <div className="grid gap-1.5">
        <Label className="text-xs font-semibold">Description</Label>
        <Textarea rows={2} value={form.description} onChange={set('description')} className="text-xs resize-none" />
      </div>

      <div className="grid gap-1.5">
        <Label className="text-xs font-semibold">Cover Image URL</Label>
        <Input value={form.cover_image_url} onChange={set('cover_image_url')} placeholder="https://…" className="text-xs" />
      </div>

      <div className="rounded-xl border border-border bg-muted/10 p-3 grid gap-2.5">
        <p className="text-xs font-semibold text-foreground flex items-center gap-1.5"><MapPin size={13} className="text-accent" /> Shelf Location</p>
        <div className="grid sm:grid-cols-3 gap-3">
          <div className="grid gap-1.5">
            <Label className="text-[13px] font-semibold text-muted-foreground">Floor</Label>
            <Input value={form.location_floor} onChange={set('location_floor')} placeholder="e.g. 2" className="text-xs" />
          </div>
          <div className="grid gap-1.5">
            <Label className="text-[13px] font-semibold text-muted-foreground">Shelf</Label>
            <Input value={form.location_shelf} onChange={set('location_shelf')} placeholder="e.g. B" className="text-xs" />
          </div>
          <div className="grid gap-1.5">
            <Label className="text-[13px] font-semibold text-muted-foreground">Column</Label>
            <Input value={form.location_column} onChange={set('location_column')} placeholder="e.g. 3" className="text-xs" />
          </div>
        </div>
      </div>

      <Button type="submit" size="sm" className="w-fit gap-1.5 bg-accent hover:bg-accent/90 text-white" disabled={createMutation.isPending}>
        {createMutation.isPending ? <Loader2 size={13} className="animate-spin" /> : <PlusCircle size={13} />}
        {createMutation.isPending ? 'Adding…' : 'Add Book'}
      </Button>
    </form>
  )
}

// ── Main Page ──────────────────────────────────────────────────────

const TABS = [
  { id: 'checkout', label: 'Checkout', icon: BookCheck },
  { id: 'requests', label: 'Borrow Requests', icon: ClipboardList },
  { id: 'subscriptions', label: 'Subscriptions', icon: CalendarCheck },
  { id: 'addbook', label: 'Add Book', icon: PlusCircle },
  { id: 'overdue',  label: 'Overdue',  icon: AlertCircle },
]

export default function CatalogCirculationPage() {
  const [activeTab, setActiveTab] = useState('checkout')

  return (
    <div className="mx-auto w-full max-w-5xl grid gap-6 px-4 py-2">

      <div className="border-b border-border pb-3">
        <h2 className="text-xl font-bold text-foreground">Circulation Desk</h2>
        <p className="text-xs text-muted-foreground mt-0.5">
          Search the physical catalog, issue loans to members, and track overdue items.
        </p>
      </div>

      <Card className="border-border">
        <CardHeader className="p-0 border-b border-border">
          <div className="flex">
            {TABS.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                type="button"
                onClick={() => setActiveTab(id)}
                className={`flex items-center gap-1.5 px-5 py-3 text-xs font-semibold border-b-2 shrink-0 transition-colors ${
                  activeTab === id
                    ? 'border-accent text-accent bg-accent/5'
                    : 'border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/20'
                }`}
              >
                <Icon size={13} />
                {label}
              </button>
            ))}
          </div>
        </CardHeader>
        <CardContent className="p-5">
          {activeTab === 'checkout' && <CatalogSearchPanel />}
          {activeTab === 'requests' && <BorrowRequestsPanel />}
          {activeTab === 'subscriptions' && <SubscriptionsPanel />}
          {activeTab === 'addbook' && <AddBookPanel />}
          {activeTab === 'overdue'  && <OverduePanel />}
        </CardContent>
      </Card>

    </div>
  )
}
