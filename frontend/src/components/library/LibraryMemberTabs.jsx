/**
 * Library Member Tabs
 * My Loans, Borrowing History, My Fines, My Holds
 * Rendered inside LibraryProfilePage for logged-in members.
 */

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  BookOpen, Clock, CheckCircle2, AlertTriangle, RefreshCw,
  Loader2, Ban, RotateCcw, History, DollarSign, BookMarked,
  FileText, FileSpreadsheet, Download, CalendarCheck, ClipboardList
} from 'lucide-react'
import {
  getMyLoans, renewLoan, getMyFines, payFine,
  getMyHolds, cancelHold, getBorrowingHistory, exportBorrowingHistory,
  getMySubscription, getMyBorrowRequests, cancelBorrowRequest,
  requestSubscriptionRenewal
} from '../../services/api/library.js'
import { circulationErrorMessage } from '../../services/api/errorMessages.js'
import { toast } from 'sonner'

// ── Helpers ──────────────────────────────────────────────────────

function statusBadge(status) {
  const map = {
    ACTIVE:   'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
    OVERDUE:  'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20',
    RETURNED: 'bg-muted/30 text-muted-foreground border-border',
    QUEUED:   'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
    READY:    'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20',
    PENDING:  'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
    PAID:     'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
    WAIVED:   'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20',
  }
  return map[status] || 'bg-muted/30 text-muted-foreground border-border'
}

function formatDate(dateStr) {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

function EmptyState({ icon: Icon, message }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 gap-3 text-muted-foreground">
      <Icon size={32} className="opacity-30" />
      <p className="text-sm">{message}</p>
    </div>
  )
}

// ── My Loans Tab ─────────────────────────────────────────────────

function MyLoansTab() {
  const queryClient = useQueryClient()
  const { data: loans = [], isLoading, isError } = useQuery({
    queryKey: ['my-loans'],
    queryFn: getMyLoans,
  })

  const renewMutation = useMutation({
    mutationFn: (loanId) => renewLoan(loanId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-loans'] })
      toast.success('Loan renewed successfully!')
    },
    onError: (err) => toast.error(circulationErrorMessage(err, 'Renewal failed')),
  })

  if (isLoading) return (
    <div className="flex justify-center py-12"><Loader2 size={20} className="animate-spin text-muted-foreground" /></div>
  )
  if (isError) return (
    <div className="text-sm text-red-500 py-8 text-center">Failed to load loans. Please try again.</div>
  )
  if (!loans.length) return <EmptyState icon={BookOpen} message="No active loans found." />

  return (
    <div className="grid gap-3">
      {loans.map((loan) => {
        const dueDate = new Date(loan.due_date)
        const now = new Date()
        const isOverdue = dueDate < now && loan.status !== 'RETURNED'
        const renewalsLeft = 2 - (loan.renewed_count || loan.renewal_count || 0)
        const daysRemaining = Math.ceil((dueDate - now) / (1000 * 60 * 60 * 24))
        const timeRemainingLabel = loan.status === 'RETURNED'
          ? null
          : isOverdue
            ? `Overdue by ${Math.abs(daysRemaining)} day${Math.abs(daysRemaining) === 1 ? '' : 's'}`
            : daysRemaining === 0
              ? 'Due today'
              : `${daysRemaining} day${daysRemaining === 1 ? '' : 's'} left`

        return (
          <div key={loan.id} className="rounded-xl border border-border bg-card p-4 grid gap-3">
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div className="grid gap-0.5 flex-1 min-w-0">
                <p className="text-sm font-bold text-foreground truncate">
                  {loan.item_title || loan.catalog_item_title || 'Unknown Item'}
                </p>
                <p className="text-xs text-muted-foreground">
                  {loan.item_author || loan.catalog_item_author || 'Unknown author'}
                </p>
              </div>
              <Badge className={`text-[12px] font-semibold border uppercase shrink-0 ${statusBadge(loan.status)}`}>
                {loan.status}
              </Badge>
            </div>

            <div className="grid grid-cols-2 gap-2 text-[13px] text-muted-foreground">
              <div>
                <p className="font-semibold text-foreground">Checked Out</p>
                <p>{formatDate(loan.checkout_date)}</p>
              </div>
              <div>
                <p className={`font-semibold ${isOverdue ? 'text-red-600' : 'text-foreground'}`}>Due Date</p>
                <p className={isOverdue ? 'text-red-600 font-bold' : ''}>{formatDate(loan.due_date)}</p>
                {timeRemainingLabel && (
                  <p className={`text-[12px] font-semibold mt-0.5 ${
                    isOverdue ? 'text-red-600' : daysRemaining <= 1 ? 'text-amber-600' : 'text-muted-foreground'
                  }`}>
                    {timeRemainingLabel}
                  </p>
                )}
              </div>
            </div>

            {loan.status !== 'RETURNED' && (
              <div className="flex items-center gap-2 border-t border-border/60 pt-2.5">
                {isOverdue && (
                  <div className="flex items-center gap-1 text-xs text-red-600 font-semibold">
                    <AlertTriangle size={12} />
                    Overdue — fines may apply
                  </div>
                )}
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-[13px] gap-1.5 ml-auto"
                  disabled={renewalsLeft <= 0 || renewMutation.isPending}
                  onClick={() => renewMutation.mutate(loan.id)}
                  title={renewalsLeft <= 0 ? 'Maximum renewals reached' : 'Renew loan for 7 more days'}
                >
                  {renewMutation.isPending ? <Loader2 size={11} className="animate-spin" /> : <RefreshCw size={11} />}
                  Renew {renewalsLeft > 0 ? `(${renewalsLeft} left)` : '(max reached)'}
                </Button>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

// ── Borrowing History Tab ─────────────────────────────────────────

function HistoryTab() {
  const [page, setPage] = useState(1)
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [exporting, setExporting] = useState(null) // 'csv' | 'pdf' | null

  const { data, isLoading, isError } = useQuery({
    queryKey: ['borrowing-history', page],
    queryFn: () => getBorrowingHistory({ page, limit: 15 }),
    keepPreviousData: true,
  })

  const loans = data?.items || []
  const pagination = data?.pagination

  const handleExport = async (format) => {
    setExporting(format)
    try {
      await exportBorrowingHistory(format, { from: dateFrom || undefined, to: dateTo || undefined })
    } catch (err) {
      toast.error(err.message || `${format.toUpperCase()} export failed`)
    } finally {
      setExporting(null)
    }
  }

  if (isLoading) return (
    <div className="flex justify-center py-12"><Loader2 size={20} className="animate-spin text-muted-foreground" /></div>
  )
  if (isError) return (
    <div className="text-sm text-red-500 py-8 text-center">Failed to load history.</div>
  )

  return (
    <div className="grid gap-3">
      {/* Date range filter + export row */}
      <div className="flex flex-wrap items-end gap-2">
        <div className="grid gap-1">
          <label className="text-[12px] font-semibold text-muted-foreground uppercase tracking-wide">From</label>
          <input
            type="date"
            value={dateFrom}
            onChange={e => setDateFrom(e.target.value)}
            className="h-7 rounded-md border border-border bg-card px-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-accent"
          />
        </div>
        <div className="grid gap-1">
          <label className="text-[12px] font-semibold text-muted-foreground uppercase tracking-wide">To</label>
          <input
            type="date"
            value={dateTo}
            onChange={e => setDateTo(e.target.value)}
            className="h-7 rounded-md border border-border bg-card px-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-accent"
          />
        </div>
        <div className="flex gap-2 ml-auto">
          <button
            type="button"
            disabled={exporting === 'csv'}
            onClick={() => handleExport('csv')}
            className="flex items-center gap-1.5 h-7 px-2.5 rounded-md border border-border bg-card text-xs font-semibold text-foreground hover:bg-muted/40 transition-colors disabled:opacity-50"
          >
            {exporting === 'csv' ? <Loader2 size={11} className="animate-spin" /> : <FileSpreadsheet size={11} />}
            CSV
          </button>
          <button
            type="button"
            disabled={exporting === 'pdf'}
            onClick={() => handleExport('pdf')}
            className="flex items-center gap-1.5 h-7 px-2.5 rounded-md border border-border bg-card text-xs font-semibold text-foreground hover:bg-muted/40 transition-colors disabled:opacity-50"
          >
            {exporting === 'pdf' ? <Loader2 size={11} className="animate-spin" /> : <FileText size={11} />}
            PDF
          </button>
        </div>
      </div>

      {!loans.length ? (
        <EmptyState icon={History} message="No borrowing history yet." />
      ) : (
        <>
          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full text-xs">
              <thead className="bg-muted/30 border-b border-border">
                <tr>
                  {['Title', 'Checked Out', 'Due', 'Returned', 'Status'].map(h => (
                    <th key={h} className="text-left px-3 py-2.5 font-semibold text-muted-foreground">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loans.map((loan, i) => (
                  <tr key={loan.id} className={`border-b border-border/50 ${i % 2 ? 'bg-muted/10' : ''}`}>
                    <td className="px-3 py-2.5 font-semibold text-foreground max-w-[200px] truncate">
                      {loan.item_title || 'Unknown'}
                    </td>
                    <td className="px-3 py-2.5 text-muted-foreground">{formatDate(loan.checkout_date)}</td>
                    <td className="px-3 py-2.5 text-muted-foreground">{formatDate(loan.due_date)}</td>
                    <td className="px-3 py-2.5 text-muted-foreground">{formatDate(loan.return_date)}</td>
                    <td className="px-3 py-2.5">
                      <Badge className={`text-[11px] font-semibold border uppercase ${statusBadge(loan.status)}`}>
                        {loan.status}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {pagination && pagination.totalPages > 1 && (
            <div className="flex items-center justify-between text-xs text-muted-foreground pt-1">
              <span>{pagination.total} total records</span>
              <div className="flex gap-2">
                <button
                  type="button"
                  className="h-7 px-2.5 rounded-md border border-border text-xs font-medium disabled:opacity-40 hover:bg-muted/30"
                  disabled={page === 1}
                  onClick={() => setPage(p => p - 1)}
                >Prev</button>
                <span className="flex items-center px-2 font-medium">{page} / {pagination.totalPages}</span>
                <button
                  type="button"
                  className="h-7 px-2.5 rounded-md border border-border text-xs font-medium disabled:opacity-40 hover:bg-muted/30"
                  disabled={page >= pagination.totalPages}
                  onClick={() => setPage(p => p + 1)}
                >Next</button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}

// ── Fines Tab ─────────────────────────────────────────────────────

function FinesTab() {
  const queryClient = useQueryClient()
  const { data: fines = [], isLoading, isError } = useQuery({
    queryKey: ['my-fines'],
    queryFn: getMyFines,
  })

  const payMutation = useMutation({
    mutationFn: (fineId) => payFine(fineId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-fines'] })
      toast.success('Fine marked as paid.')
    },
    onError: (err) => toast.error(err.message || 'Payment failed'),
  })

  if (isLoading) return (
    <div className="flex justify-center py-12"><Loader2 size={20} className="animate-spin text-muted-foreground" /></div>
  )
  if (isError) return (
    <div className="text-sm text-red-500 py-8 text-center">Failed to load fines.</div>
  )
  if (!fines.length) return <EmptyState icon={DollarSign} message="No outstanding fines — great!" />

  const totalPending = fines.filter(f => f.status === 'PENDING').reduce((s, f) => s + parseFloat(f.amount || 0), 0)

  return (
    <div className="grid gap-3">
      {totalPending > 0 && (
        <div className="flex items-center gap-2 rounded-xl bg-amber-500/10 border border-amber-500/20 p-3 text-xs font-semibold text-amber-700 dark:text-amber-400">
          <AlertTriangle size={13} />
          Total outstanding: ৳{totalPending.toFixed(2)} BDT
        </div>
      )}

      {fines.map((fine) => (
        <div key={fine.id} className="rounded-xl border border-border bg-card p-4 grid gap-3">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div className="grid gap-0.5 flex-1 min-w-0">
              <p className="text-sm font-bold text-foreground truncate">
                {fine.item_title || 'Unknown Item'}
              </p>
              <p className="text-xs text-muted-foreground">
                Due: {formatDate(fine.due_date)} · Returned: {formatDate(fine.return_date)}
              </p>
            </div>
            <div className="text-right shrink-0">
              <p className="text-base font-extrabold text-foreground">৳{parseFloat(fine.amount).toFixed(2)}</p>
              <Badge className={`text-[11px] font-semibold border uppercase mt-0.5 ${statusBadge(fine.status)}`}>
                {fine.status}
              </Badge>
            </div>
          </div>

          {fine.status === 'PENDING' && (
            <div className="border-t border-border/60 pt-2.5 flex justify-end">
              <Button
                size="sm"
                className="h-7 text-[13px] gap-1.5 bg-accent hover:bg-accent/90 text-white"
                disabled={payMutation.isPending}
                onClick={() => payMutation.mutate(fine.id)}
              >
                {payMutation.isPending ? <Loader2 size={11} className="animate-spin" /> : <CheckCircle2 size={11} />}
                Mark as Paid
              </Button>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

// ── My Holds Tab ──────────────────────────────────────────────────

function HoldsTab() {
  const queryClient = useQueryClient()
  const { data: holds = [], isLoading, isError } = useQuery({
    queryKey: ['my-holds'],
    queryFn: getMyHolds,
  })

  const cancelMutation = useMutation({
    mutationFn: (holdId) => cancelHold(holdId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-holds'] })
      toast.success('Hold cancelled.')
    },
    onError: (err) => toast.error(circulationErrorMessage(err, 'Cancel failed')),
  })

  if (isLoading) return (
    <div className="flex justify-center py-12"><Loader2 size={20} className="animate-spin text-muted-foreground" /></div>
  )
  if (isError) return (
    <div className="text-sm text-red-500 py-8 text-center">Failed to load holds.</div>
  )
  if (!holds.length) return <EmptyState icon={BookMarked} message="No hold requests placed." />

  return (
    <div className="grid gap-3">
      {holds.map((hold) => (
        <div key={hold.id} className="rounded-xl border border-border bg-card p-4 grid gap-3">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div className="grid gap-0.5 flex-1 min-w-0">
              <p className="text-sm font-bold text-foreground truncate">
                {hold.item_title || 'Unknown Item'}
              </p>
              <p className="text-xs text-muted-foreground">
                {hold.item_author || 'Unknown author'}
              </p>
            </div>
            <Badge className={`text-[12px] font-semibold border uppercase shrink-0 ${statusBadge(hold.status)}`}>
              {hold.status}
            </Badge>
          </div>

          <div className="flex items-center justify-between text-[13px] text-muted-foreground border-t border-border/60 pt-2.5">
            <span>Placed: {formatDate(hold.placed_at || hold.created_at)}</span>
            {['QUEUED', 'READY'].includes(hold.status) && (
              <Button
                size="sm"
                variant="ghost"
                className="h-7 text-[13px] gap-1.5 text-red-600 hover:text-red-700 hover:bg-red-500/10"
                disabled={cancelMutation.isPending}
                onClick={() => cancelMutation.mutate(hold.id)}
              >
                {cancelMutation.isPending ? <Loader2 size={11} className="animate-spin" /> : <Ban size={11} />}
                Cancel Hold
              </Button>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}

// ── Subscription Tab ─────────────────────────────────────────────

function SubscriptionTab() {
  const queryClient = useQueryClient()
  const { data, isLoading, isError } = useQuery({
    queryKey: ['my-subscription'],
    queryFn: getMySubscription,
  })

  const renewalMutation = useMutation({
    mutationFn: requestSubscriptionRenewal,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-subscription'] })
      toast.success('Renewal request sent — a librarian will review it shortly.')
    },
    onError: (err) => toast.error(circulationErrorMessage(err, 'Could not request renewal.')),
  })

  if (isLoading) return (
    <div className="flex justify-center py-12"><Loader2 size={20} className="animate-spin text-muted-foreground" /></div>
  )
  if (isError) return (
    <div className="text-sm text-red-500 py-8 text-center">Failed to load subscription status.</div>
  )

  const { subscription, isActive } = data || {}

  if (!subscription) {
    return (
      <div className="flex flex-col items-center justify-center py-12 gap-3 text-center">
        <CalendarCheck size={32} className="opacity-30 text-muted-foreground" />
        <div className="grid gap-1 max-w-sm">
          <p className="text-sm font-semibold text-foreground">No subscription yet</p>
          <p className="text-xs text-muted-foreground">
            A monthly subscription is required to borrow from the physical (offline) library.
            Visit the circulation desk or contact a librarian to activate one.
          </p>
        </div>
      </div>
    )
  }

  const endDate = new Date(subscription.end_date)
  const daysRemaining = Math.ceil((endDate - new Date()) / (1000 * 60 * 60 * 24))
  const renewalPending = Boolean(subscription.renewal_requested_at)

  return (
    <div className="grid gap-3">
      <div className={`rounded-xl border p-4 grid gap-3 ${isActive ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-border bg-muted/10'}`}>
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="grid gap-0.5">
            <p className="text-sm font-bold text-foreground">Offline Library Subscription</p>
            <p className="text-xs text-muted-foreground">
              {isActive ? `Renews / expires ${formatDate(subscription.end_date)}` : `Expired ${formatDate(subscription.end_date)}`}
            </p>
          </div>
          <Badge className={`text-[12px] font-semibold border uppercase shrink-0 ${statusBadge(isActive ? 'ACTIVE' : 'RETURNED')}`}>
            {isActive ? 'Active' : subscription.status}
          </Badge>
        </div>
        {isActive && (
          <p className="text-xs text-muted-foreground border-t border-border/60 pt-2.5">
            {daysRemaining > 0 ? `${daysRemaining} day${daysRemaining === 1 ? '' : 's'} remaining` : 'Expires today'}
          </p>
        )}

        <div className="flex items-center gap-2 border-t border-border/60 pt-2.5">
          {renewalPending ? (
            <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-600 dark:text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-2">
              <Clock size={13} />
              Renewal requested — awaiting librarian
            </div>
          ) : (
            <Button
              size="sm"
              variant="outline"
              className="h-8 text-xs gap-1.5"
              disabled={renewalMutation.isPending}
              onClick={() => renewalMutation.mutate()}
            >
              {renewalMutation.isPending ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
              Request Renewal
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Borrow Requests Tab ─────────────────────────────────────────────

function RequestsTab() {
  const queryClient = useQueryClient()
  const { data: requests = [], isLoading, isError } = useQuery({
    queryKey: ['my-borrow-requests'],
    queryFn: getMyBorrowRequests,
  })

  const cancelMutation = useMutation({
    mutationFn: (requestId) => cancelBorrowRequest(requestId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-borrow-requests'] })
      toast.success('Borrow request cancelled.')
    },
    onError: (err) => toast.error(circulationErrorMessage(err, 'Cancel failed')),
  })

  if (isLoading) return (
    <div className="flex justify-center py-12"><Loader2 size={20} className="animate-spin text-muted-foreground" /></div>
  )
  if (isError) return (
    <div className="text-sm text-red-500 py-8 text-center">Failed to load borrow requests.</div>
  )
  if (!requests.length) return <EmptyState icon={ClipboardList} message="No borrow requests placed." />

  return (
    <div className="grid gap-3">
      {requests.map((request) => (
        <div key={request.id} className="rounded-xl border border-border bg-card p-4 grid gap-3">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div className="grid gap-0.5 flex-1 min-w-0">
              <p className="text-sm font-bold text-foreground truncate">
                {request.item_title || 'Unknown Item'}
              </p>
              <p className="text-xs text-muted-foreground">
                {request.item_author || 'Unknown author'}
              </p>
            </div>
            <Badge className={`text-[12px] font-semibold border uppercase shrink-0 ${statusBadge(request.status)}`}>
              {request.status}
            </Badge>
          </div>

          {request.status === 'REJECTED' && request.reject_reason && (
            <p className="text-xs text-red-600 dark:text-red-400 bg-red-500/5 border border-red-500/20 rounded-md px-2.5 py-1.5">
              {request.reject_reason}
            </p>
          )}

          <div className="flex items-center justify-between text-[13px] text-muted-foreground border-t border-border/60 pt-2.5">
            <span>Requested: {formatDate(request.requested_at || request.created_at)}</span>
            {request.status === 'PENDING' && (
              <Button
                size="sm"
                variant="ghost"
                className="h-7 text-[13px] gap-1.5 text-red-600 hover:text-red-700 hover:bg-red-500/10"
                disabled={cancelMutation.isPending}
                onClick={() => cancelMutation.mutate(request.id)}
              >
                {cancelMutation.isPending ? <Loader2 size={11} className="animate-spin" /> : <Ban size={11} />}
                Cancel Request
              </Button>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}

// ── Main exported component ───────────────────────────────────────

const TABS = [
  { id: 'loans',   label: 'My Loans',  icon: BookOpen  },
  { id: 'requests',label: 'Requests',  icon: ClipboardList },
  { id: 'history', label: 'History',   icon: History   },
  { id: 'fines',   label: 'Fines',     icon: DollarSign },
  { id: 'holds',   label: 'Holds',     icon: Clock     },
  { id: 'subscription', label: 'Subscription', icon: CalendarCheck },
]

export default function LibraryMemberTabs() {
  const [activeTab, setActiveTab] = useState('loans')

  return (
    <Card className="border-border">
      <CardHeader className="p-0 border-b border-border">
        <div className="flex overflow-x-auto">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => setActiveTab(id)}
              className={`
                flex items-center gap-1.5 px-4 py-3 text-xs font-semibold border-b-2 shrink-0 transition-colors
                ${activeTab === id
                  ? 'border-accent text-accent bg-accent/5'
                  : 'border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/20'
                }
              `}
            >
              <Icon size={13} />
              {label}
            </button>
          ))}
        </div>
      </CardHeader>
      <CardContent className="p-5">
        {activeTab === 'loans'   && <MyLoansTab />}
        {activeTab === 'requests' && <RequestsTab />}
        {activeTab === 'history' && <HistoryTab />}
        {activeTab === 'fines'   && <FinesTab />}
        {activeTab === 'holds'   && <HoldsTab />}
        {activeTab === 'subscription' && <SubscriptionTab />}
      </CardContent>
    </Card>
  )
}
