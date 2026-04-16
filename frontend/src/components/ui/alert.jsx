import { cva } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const alertVariants = cva('rounded-md border p-3 text-sm', {
  variants: {
    variant: {
      default: 'border-border bg-card text-card-foreground',
      error: 'border-red-200 bg-red-50 text-red-700',
      success: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    },
  },
  defaultVariants: {
    variant: 'default',
  },
})

function Alert({ className, variant, ...props }) {
  return <div role="alert" className={cn(alertVariants({ variant }), className)} {...props} />
}

export { Alert }