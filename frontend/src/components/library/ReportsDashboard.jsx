/**
 * Reports Dashboard Component
 * Used on LibraryAnalyticsPage for STAFF+ users.
 */

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  BarChart3, FileSpreadsheet, FileText, Loader2, TrendingUp,
  Users, BookOpen, AlertTriangle, Download, RefreshCw
} from 'lucide-react'
import { apiRequest } from '../../services/api/client.js'

const REPORT_TYPES = [
  { id: 'circulation', label: 'Circulation', icon: BarChart3, description: 'Daily checkouts, returns & overdue' },
  { id: 'popular-items', label: 'Popular Items', icon: TrendingUp, description: 'Most borrowed catalog items' },
  { id: 'overdue', label: 'Overdue', icon: AlertTriangle, description: 'Items past due date with fine estimates' },
  { id: 'collection-stats', label: 'Collection', icon: BookOpen, description: 'Holdings breakdown by category' },
  { id: 'member-activity', label: 'Members', icon: Users, description: 'Top borrowers & activity summary' },
  { id: 'fines-summary', label: 'Fines', icon: FileSpreadsheet, description: 'Fine revenue pending, paid & waived' },
]

function StatCard({ label, value, sublabel, color = 'text-accent' }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4 grid gap-1">
      <p className={`text-2xl font-extrabold tracking-tight ${color}`}>{value ?? '—'}</p>
      <p className="text-xs font-semibold text-foreground">{label}</p>
      {sublabel && <p className="text-[12px] text-muted-foreground">{sublabel}</p>}
    </div>
  )
}

function CirculationTable({ data }) {
  if (!data?.daily?.length) return <p className="text-xs text-muted-foreground py-4 text-center">No circulation data for this period.</p>
  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <table className="w-full text-xs">
        <thead className="bg-muted/30 border-b border-border">
          <tr>
            {['Date', 'Checkouts', 'Returns', 'Overdue'].map(h => (
              <th key={h} className="text-left px-3 py-2 font-semibold text-muted-foreground">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.daily.map((row, i) => (
            <tr key={i} className={`border-b border-border/50 ${i % 2 === 0 ? '' : 'bg-muted/10'}`}>
              <td className="px-3 py-2 text-foreground">{row.date ? new Date(row.date).toLocaleDateString() : '—'}</td>
              <td className="px-3 py-2 font-semibold text-emerald-600">{row.checkouts}</td>
              <td className="px-3 py-2 text-blue-600">{row.returns}</td>
              <td className="px-3 py-2 text-red-600">{row.overdue}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function GenericTable({ data, columns }) {
  if (!data?.length) return <p className="text-xs text-muted-foreground py-4 text-center">No data available.</p>
  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <table className="w-full text-xs">
        <thead className="bg-muted/30 border-b border-border">
          <tr>
            {columns.map(c => (
              <th key={c.key} className="text-left px-3 py-2 font-semibold text-muted-foreground">{c.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, i) => (
            <tr key={i} className={`border-b border-border/50 ${i % 2 === 0 ? '' : 'bg-muted/10'}`}>
              {columns.map(c => (
                <td key={c.key} className="px-3 py-2 text-foreground">{row[c.key] ?? '—'}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default function ReportsDashboard() {
  const [activeReport, setActiveReport] = useState('circulation')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [exportLoading, setExportLoading] = useState(false)

  const params = new URLSearchParams()
  if (dateFrom) params.set('from', dateFrom)
  if (dateTo) params.set('to', dateTo)
  const queryString = params.toString()

  const endpointMap = {
    circulation: `/library/reports/circulation`,
    'popular-items': `/library/reports/popular-items`,
    overdue: `/library/reports/overdue`,
    'collection-stats': `/library/reports/collection-stats`,
    'member-activity': `/library/reports/member-activity`,
    'fines-summary': `/library/reports/fines-summary`,
  }

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['library-report', activeReport, queryString],
    queryFn: () => apiRequest(`${endpointMap[activeReport]}${queryString ? `?${queryString}` : ''}`),
    staleTime: 2 * 60 * 1000,
  })

  const handleExport = async (format) => {
    setExportLoading(true)
    try {
      const p = new URLSearchParams({ type: activeReport, format })
      if (dateFrom) p.set('from', dateFrom)
      if (dateTo) p.set('to', dateTo)

      const base = import.meta.env.VITE_API_BASE_URL || (import.meta.env.PROD ? '/api' : 'http://localhost:3000/api')
      const token = JSON.parse(localStorage.getItem('dkp_auth_session') || '{}').token || ''

      const res = await fetch(`${base}/library/reports/export?${p.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      })

      if (!res.ok) throw new Error('Export failed')

      const blob = await res.blob()
      const contentDisposition = res.headers.get('content-disposition') || ''
      const filenameMatch = contentDisposition.match(/filename="([^"]+)"/)
      const filename = filenameMatch?.[1] || `report_${activeReport}_${new Date().toISOString().slice(0, 10)}.${format}`

      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      a.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      alert(err.message || 'Export failed')
    } finally {
      setExportLoading(false)
    }
  }

  const renderReportContent = () => {
    if (isLoading) return (
      <div className="flex items-center justify-center py-16 gap-2 text-muted-foreground text-sm">
        <Loader2 size={18} className="animate-spin" /> Loading report…
      </div>
    )
    if (isError) return (
      <div className="flex items-center justify-center py-16 text-sm text-red-500 gap-2">
        <AlertTriangle size={16} /> Failed to load report data.
      </div>
    )
    if (!data) return null

    switch (activeReport) {
      case 'circulation':
        return (
          <div className="grid gap-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <StatCard label="Total Loans" value={data.totals?.total_loans} />
              <StatCard label="Returned" value={data.totals?.total_returns} color="text-blue-600" />
              <StatCard label="Active" value={data.totals?.total_active} color="text-emerald-600" />
              <StatCard label="Overdue" value={data.totals?.total_overdue} color="text-red-600" />
            </div>
            <CirculationTable data={data} />
          </div>
        )

      case 'popular-items':
        return (
          <GenericTable
            data={data}
            columns={[
              { key: 'title', label: 'Title' },
              { key: 'author', label: 'Author' },
              { key: 'item_type', label: 'Category' },
              { key: 'checkout_count', label: '# Checkouts' },
            ]}
          />
        )

      case 'overdue':
        return (
          <GenericTable
            data={data}
            columns={[
              { key: 'item_title', label: 'Item' },
              { key: 'member_name', label: 'Member' },
              { key: 'days_overdue', label: 'Days Overdue' },
              { key: 'estimated_fine', label: 'Est. Fine (BDT)' },
            ]}
          />
        )

      case 'collection-stats':
        return (
          <div className="grid gap-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <StatCard label="Total Titles" value={data.totals?.total_titles} />
              <StatCard label="Total Copies" value={data.totals?.total_copies} />
              <StatCard label="Available" value={data.totals?.available_copies} color="text-emerald-600" />
              <StatCard label="Checked Out" value={data.totals?.checked_out_titles} color="text-amber-600" />
            </div>
            <GenericTable
              data={data.byType || []}
              columns={[
                { key: 'item_type', label: 'Category' },
                { key: 'item_count', label: 'Titles' },
                { key: 'total_copies', label: 'Total Copies' },
                { key: 'available_copies', label: 'Available' },
              ]}
            />
          </div>
        )

      case 'member-activity':
        return (
          <GenericTable
            data={data}
            columns={[
              { key: 'member_name', label: 'Name' },
              { key: 'member_email', label: 'Email' },
              { key: 'total_loans', label: 'Total Loans' },
              { key: 'returned_count', label: 'Returned' },
              { key: 'overdue_count', label: 'Overdue' },
            ]}
          />
        )

      case 'fines-summary':
        return (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <StatCard label="Total Fines" value={data.total_fines} />
            <StatCard label="Pending (BDT)" value={data.pending_amount ? `৳${parseFloat(data.pending_amount).toFixed(2)}` : '৳0'} color="text-amber-600" />
            <StatCard label="Collected (BDT)" value={data.paid_amount ? `৳${parseFloat(data.paid_amount).toFixed(2)}` : '৳0'} color="text-emerald-600" />
            <StatCard label="Waived (BDT)" value={data.waived_amount ? `৳${parseFloat(data.waived_amount).toFixed(2)}` : '৳0'} color="text-blue-600" />
            <StatCard label="Pending Count" value={data.pending_count} sublabel="Outstanding fines" />
            <StatCard label="Paid Count" value={data.paid_count} sublabel="Settled fines" />
          </div>
        )

      default:
        return null
    }
  }

  return (
    <div className="grid gap-5">
      {/* Report type selector */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {REPORT_TYPES.map(({ id, label, icon: Icon, description }) => (
          <button
            key={id}
            type="button"
            onClick={() => setActiveReport(id)}
            className={`
              flex flex-col gap-1 rounded-xl border p-3 text-left transition-all text-xs cursor-pointer
              ${activeReport === id
                ? 'border-accent bg-accent/5 text-accent'
                : 'border-border bg-card text-foreground hover:border-accent/40 hover:bg-muted/20'
              }
            `}
          >
            <Icon size={15} className={activeReport === id ? 'text-accent' : 'text-muted-foreground'} />
            <span className="font-bold">{label}</span>
            <span className="text-[12px] text-muted-foreground leading-tight">{description}</span>
          </button>
        ))}
      </div>

      {/* Date range filter */}
      <div className="flex flex-wrap gap-3 items-end">
        <div className="grid gap-1">
          <Label className="text-[12px] font-semibold text-muted-foreground uppercase tracking-wide">From</Label>
          <Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="h-8 text-xs w-36" />
        </div>
        <div className="grid gap-1">
          <Label className="text-[12px] font-semibold text-muted-foreground uppercase tracking-wide">To</Label>
          <Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="h-8 text-xs w-36" />
        </div>
        <Button size="sm" variant="outline" className="h-8 gap-1.5 text-xs" onClick={() => refetch()}>
          <RefreshCw size={12} /> Refresh
        </Button>

        <div className="ml-auto flex gap-2">
          <Button
            size="sm"
            variant="outline"
            className="h-8 gap-1.5 text-xs"
            onClick={() => handleExport('xlsx')}
            disabled={exportLoading || isLoading}
          >
            {exportLoading ? <Loader2 size={11} className="animate-spin" /> : <FileSpreadsheet size={11} />}
            Excel
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="h-8 gap-1.5 text-xs"
            onClick={() => handleExport('pdf')}
            disabled={exportLoading || isLoading}
          >
            {exportLoading ? <Loader2 size={11} className="animate-spin" /> : <FileText size={11} />}
            PDF
          </Button>
        </div>
      </div>

      {/* Report content */}
      <Card className="border-border">
        <CardHeader className="p-4 border-b border-border bg-gradient-to-r from-muted/20 to-transparent">
          <CardTitle className="text-sm font-bold flex items-center gap-2">
            {(() => {
              const r = REPORT_TYPES.find(r => r.id === activeReport)
              return r ? <><r.icon size={14} className="text-accent" />{r.label} Report</> : null
            })()}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4">
          {renderReportContent()}
        </CardContent>
      </Card>
    </div>
  )
}
