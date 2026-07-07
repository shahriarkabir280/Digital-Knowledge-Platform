import ReportsDashboard from '../components/library/ReportsDashboard.jsx'

export default function LibraryAnalyticsPage() {
  return (
    <div className="mx-auto grid w-full max-w-6xl gap-6 px-4 py-2">

      {/* Page Header */}
      <div className="border-b border-border pb-3">
        <p className="text-[10px] font-bold uppercase tracking-widest text-accent mb-1">Admin Analytics</p>
        <h2 className="text-xl font-bold text-foreground">
          Librarian Reports &amp; Analytics
        </h2>
        <p className="text-xs text-muted-foreground mt-0.5">
          Circulation trends, overdue tracking, collection stats, and member activity.
          Export any report to PDF or Excel.
        </p>
      </div>

      <ReportsDashboard />

    </div>
  )
}
