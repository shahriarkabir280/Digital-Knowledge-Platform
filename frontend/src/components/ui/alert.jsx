import { cva } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const alertVariants = cva(
  'rounded-lg border px-4 py-3 text-sm flex items-start gap-2',
  {
    variants: {
      variant: {
        default: 'border-[hsl(var(--border))] bg-[hsl(var(--card))] text-[hsl(var(--card-foreground))]',
        error:   'border-red-200 bg-red-50 text-red-700',
        success: 'border-emerald-200 bg-emerald-50 text-emerald-700',
        warning: 'border-amber-200 bg-amber-50 text-amber-700',
        info:    'border-[hsl(var(--ring)/.3)] bg-[hsl(var(--primary)/.06)] text-[hsl(var(--primary))]',
      },
    },
    defaultVariants: { variant: 'default' },
  },
)

function Alert({ className, variant, ...props }) {
  return <div role="alert" className={cn(alertVariants({ variant }), className)} {...props} />
}

export { Alert }
