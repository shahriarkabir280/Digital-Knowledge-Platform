import { cn } from '@/lib/utils'

function Select({ className, ...props }) {
  return (
    <select
      className={cn(
        'flex h-10 w-full rounded-lg border border-[hsl(var(--input))] bg-background px-3 py-2 text-sm text-[hsl(var(--foreground))] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--ring))] focus-visible:border-[hsl(var(--ring))] disabled:cursor-not-allowed disabled:opacity-50',
        className,
      )}
      {...props}
    />
  )
}

export { Select }
