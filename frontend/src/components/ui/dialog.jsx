import { useState, createContext, useContext } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'

const DialogContext = createContext()

function Dialog({ open, onOpenChange, children }) {
  const [isOpen, setIsOpen] = useState(open ?? false)

  const handleOpenChange = (newOpen) => {
    setIsOpen(newOpen)
    onOpenChange?.(newOpen)
  }

  const dialogOpen = open ?? isOpen

  return (
    <DialogContext.Provider value={{ open: dialogOpen, onOpenChange: handleOpenChange }}>
      {dialogOpen
        ? createPortal(
            <div className="fixed inset-0 z-50 flex items-center justify-center">
              <div
                className="fixed inset-0 bg-black/50"
                onClick={() => handleOpenChange(false)}
              />
              <div className="relative z-50">
                {children}
              </div>
            </div>,
            document.body,
          )
        : null}
    </DialogContext.Provider>
  )
}

function DialogContent({ children, className }) {
  const { onOpenChange } = useContext(DialogContext)
  
  return (
    <div className={cn(
      'fixed left-[50%] top-[50%] z-50 grid grid-cols-[minmax(0,1fr)] w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 border border-border bg-background p-6 shadow-lg rounded-lg',
      className,
    )}>
      <button
        onClick={() => onOpenChange(false)}
        className="absolute right-4 top-4 rounded-md opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none"
      >
        <X className="h-4 w-4" />
        <span className="sr-only">Close</span>
      </button>
      {children}
    </div>
  )
}

function DialogHeader({ className, ...props }) {
  return (
    <div
      className={cn('flex flex-col space-y-1.5 text-center sm:text-left', className)}
      {...props}
    />
  )
}

function DialogTitle({ className, ...props }) {
  return (
    <h2
      className={cn('text-lg font-semibold leading-none tracking-tight', className)}
      {...props}
    />
  )
}

function DialogDescription({ className, ...props }) {
  return (
    <p
      className={cn('text-sm text-muted-foreground', className)}
      {...props}
    />
  )
}

function DialogFooter({ className, ...props }) {
  return (
    <div
      className={cn('flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2', className)}
      {...props}
    />
  )
}

export {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
}
