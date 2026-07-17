import LibraryMemberTabs from '../components/library/LibraryMemberTabs.jsx'

export default function LibraryActivityPage() {
  return (
    <div className="mx-auto grid w-full max-w-5xl gap-6 px-4 py-2">

      <div className="border-b border-border pb-3">
        <h2 className="text-xl font-bold text-foreground">Library Activity</h2>
        <p className="text-xs text-muted-foreground">
          Your active loans, borrow requests, borrowing history, fines, holds, and offline library subscription.
        </p>
      </div>

      <LibraryMemberTabs />

    </div>
  )
}
