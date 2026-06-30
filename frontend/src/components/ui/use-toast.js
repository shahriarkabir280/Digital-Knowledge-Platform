import { useState, useCallback } from 'react'

const toasts = new Map()
let toastId = 0

export function useToast() {
  const [, setToastCount] = useState(0)

  const toast = useCallback(({ title, description, variant = 'default' }) => {
    const id = ++toastId
    toasts.set(id, { title, description, variant })
    
    // Update component to show new toast
    setToastCount(prev => prev + 1)
    
    // Auto-remove after 5 seconds
    setTimeout(() => {
      toasts.delete(id)
      setToastCount(prev => prev + 1)
    }, 5000)

    return id
  }, [])

  return { toast, toasts: Array.from(toasts.values()) }
}
