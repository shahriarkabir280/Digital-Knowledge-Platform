/**
 * Catalog Circulation Page
 * Staff/Admin page to search physical catalog items and perform checkouts.
 */

import { useState, useEffect, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  BookCheck, Search, Loader2, AlertCircle, BookOpen,
  User, MapPin, CheckCircle2, X, RefreshCw, RotateCcw, ScanLine
} from 'lucide-react'
import { searchCatalog, checkoutItem, getOverdueLoans, returnItem, searchMembers, lookupCatalog } from '../services/api/library.js'
import { circulationErrorMessage } from '../services/api/errorMessages.js'
import BarcodeScanner from '../components/library/BarcodeScanner.jsx'
import { toast } from 'sonner'

// ── Member Search Combobox ─────────────────────────────────────────

function MemberSearchInput({ value, onChange }) {
  const [query, setQuery] = useState(value?.name || '')
  const [results, setResults] = useState([])
  const [searching, setSearching] = useState(false)
  const [open, setOpen] = useState(false)
  const debounceRef = useRef(null)
  const containerRef = useRef(null)

  useEffect(() => {
    function handleClick(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const handleInput = (e) => {
    const q = e.target.value
    setQuery(q)
    onChange(null) // clear selected member when typing
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (q.trim().length < 2) { setResults([]); setOpen(false); return }
    debounceRef.current = setTimeout(async () => {
      setSearching(true)
      try {
        const data = await searchMembers(q.trim())
        setResults(data)
        setOpen(true)
      } catch {
        setResults([])
      } finally {
        setSearching(false)
      }
    }, 300)
  }

  const selectMember = (member) => {
    setQuery(`${member.name} (${member.email})`)
    onChange(member)
    setOpen(false)
    setResults([])
  }

  const clear = () => {
    setQuery('')
    onChange(null)
    setResults([])
    setOpen(false)
  }

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <User size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={handleInput}
          placeholder="Search by name or email…"
          className="pl-7 pr-7 text-xs"
        />
        {(query || searching) && (
          <button
            type="button"
            onClick={clear}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            {searching ? <Loader2 size={11} className="animate-spin" /> : <X size={11} />}
          </button>
        )}
      </div>
      {open && results.length > 0 && (
        <div className="absolute z-50 mt-1 w-full rounded-lg border border-border bg-card shadow-lg overflow-hidden">
          {results.map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => selectMember(m)}
              className="w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-muted/40 transition-colors border-b border-border/40 last:border-0"
            >
              <div className="w-7 h-7 rounded-full bg-accent/20 text-accent font-bold text-xs flex items-center justify-center shrink-0">
                {(m.name || m.email).charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-foreground truncate">{m.name || '—'}</p>
                <p className="text-[10px] text-muted-foreground truncate">{m.email}</p>
              </div>
              <Badge variant="outline" className="text-[9px] ml-auto shrink-0">{m.role}</Badge>
            </button>
          ))}
        </div>
      )}
      {open && results.length === 0 && !searching && query.length >= 2 && (
        <div className="absolute z-50 mt-1 w-full rounded-lg border border-border bg-card shadow-lg px-3 py-2.5 text-xs text-muted-foreground">
          No members found.
        </div>
      )}
    </div>
  )
}

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
              {selectedMember.email && <p className="text-[10px] text-muted-foreground truncate">{selectedMember.email}</p>}
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
          className="h-7 w-fit gap-1.5 text-[11px]"
          onClick={() => setShowScanner((v) => !v)}
        >
          <ScanLine size={12} />
          {showScanner ? 'Close Scanner' : 'Scan Member Card'}
        </Button>

        <p className="text-[10px] text-muted-foreground">Loan period: 14 days · Max 2 renewals of 7 days each</p>
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
        <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
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
                        <span className="text-[10px] text-muted-foreground font-mono">ISBN: {item.isbn}</span>
                      )}
                      {item.location && (
                        <span className="flex items-center gap-0.5 text-[10px] text-muted-foreground">
                          <MapPin size={9} /> {item.location}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="shrink-0 text-right grid gap-1 items-start">
                    <Badge
                      className={`text-[10px] font-semibold border ${
                        item.available_copies > 0
                          ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'
                          : 'bg-red-500/10 text-red-600 border-red-500/20'
                      }`}
                    >
                      {item.available_copies > 0 ? `${item.available_copies} available` : 'All checked out'}
                    </Badge>
                    <Badge variant="outline" className="text-[9px]">{item.item_type || 'BOOK'}</Badge>
                    {item.available_copies > 0 && selectedItem?.id !== item.id && (
                      <span className="text-[9px] text-accent font-semibold">Click to checkout →</span>
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
        <Button size="sm" variant="ghost" className="h-7 text-[11px] gap-1" onClick={() => refetch()}>
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
            <Badge className="text-[10px] border bg-red-500/10 text-red-600 border-red-500/20 font-semibold uppercase shrink-0">
              OVERDUE
            </Badge>
          </div>
          <div className="flex items-center justify-between text-[11px] text-muted-foreground border-t border-border/40 pt-2">
            <span>Due: <span className="text-red-600 font-semibold">{new Date(loan.due_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</span></span>
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-[11px] gap-1.5"
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

// ── Main Page ──────────────────────────────────────────────────────

const TABS = [
  { id: 'checkout', label: 'Checkout', icon: BookCheck },
  { id: 'overdue',  label: 'Overdue',  icon: AlertCircle },
]

export default function CatalogCirculationPage() {
  const [activeTab, setActiveTab] = useState('checkout')

  return (
    <div className="mx-auto w-full max-w-4xl grid gap-6 px-4 py-2">

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
          {activeTab === 'overdue'  && <OverduePanel />}
        </CardContent>
      </Card>

    </div>
  )
}
