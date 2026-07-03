import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

export function ResourceCardSkeleton() {
  return (
    <Card className="border-border flex flex-col overflow-hidden">
      {/* Thumbnail skeleton */}
      <Skeleton className="h-40 w-full rounded-none" />

      {/* Card header */}
      <div className="p-4 pb-1 grid gap-2.5">
        <div className="flex justify-between items-start">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-4" />
        </div>
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-3 w-2/3" />
      </div>

      {/* Card content */}
      <div className="p-4 pt-0 flex flex-col gap-3">
        <div className="space-y-1.5">
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-4/5" />
        </div>

        {/* Tags */}
        <div className="flex gap-1.5">
          <Skeleton className="h-4 w-14 rounded-full" />
          <Skeleton className="h-4 w-16 rounded-full" />
          <Skeleton className="h-4 w-12 rounded-full" />
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-border/50 pt-2.5 mt-1">
          <div className="flex items-center gap-2">
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-3 w-3 rounded-full" />
            <Skeleton className="h-3 w-14" />
          </div>
          <div className="flex items-center gap-1.5">
            <Skeleton className="h-6 w-10" />
            <Skeleton className="h-6 w-12" />
          </div>
        </div>
      </div>
    </Card>
  )
}

export function ResourceGridSkeleton({ count = 4 }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {Array.from({ length: count }).map((_, i) => (
        <ResourceCardSkeleton key={i} />
      ))}
    </div>
  )
}

export function SidebarSkeleton() {
  return (
    <div className="grid gap-6 self-start">
      <div className="rounded-xl border border-border p-5 grid gap-3">
        <Skeleton className="h-4 w-32" />
        <div className="space-y-1.5">
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-4/5" />
        </div>
        <Skeleton className="h-9 w-full rounded-lg" />
      </div>

      <div className="rounded-xl border border-border p-4 grid gap-3">
        <Skeleton className="h-4 w-28" />
        <div className="space-y-2">
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-3/4" />
        </div>
      </div>
    </div>
  )
}
