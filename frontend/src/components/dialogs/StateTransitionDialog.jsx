import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

const actionConfig = {
  publish: {
    title: 'Publish Document',
    subtitle: 'Publish note',
    placeholder: 'e.g., "Ready for publication - meets all quality criteria."',
    confirmLabel: 'Publish',
    variant: 'secondary',
    required: true,
  },
  reject: {
    title: 'Request Revision',
    subtitle: 'Revision reason',
    placeholder: 'e.g., "Please address formatting issues and resubmit."',
    confirmLabel: 'Reject to Draft',
    variant: 'destructive',
    required: true,
  },
  archive: {
    title: 'Archive Document',
    subtitle: 'Archive reason',
    placeholder: 'e.g., "Archived per retention policy." (optional)',
    confirmLabel: 'Archive',
    variant: 'outline',
    required: false,
  },
}

export default function StateTransitionDialog({
  isOpen,
  action,
  documentTitle,
  onConfirm,
  onCancel,
  isSubmitting,
}) {
  const [note, setNote] = useState('')
  const [error, setError] = useState('')

  if (!isOpen || !action || !actionConfig[action]) {
    return null
  }

  const config = actionConfig[action]

  const handleConfirm = () => {
    setError('')

    if (config.required && !note.trim()) {
      setError(
        config.subtitle === 'Publish note'
          ? 'Please provide a publish note'
          : 'Please provide a reason for this action'
      )
      return
    }

    onConfirm(note.trim())
    setNote('')
  }

  const handleCancel = () => {
    setNote('')
    setError('')
    onCancel()
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      handleCancel()
    }
  }

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 z-40 bg-black/50"
        onClick={handleCancel}
        role="presentation"
      />

      {/* Dialog */}
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        onKeyDown={handleKeyDown}
        role="alertdialog"
        aria-labelledby="dialog-title"
        aria-describedby="dialog-description"
      >
        <Card className="w-full max-w-md shadow-lg">
          <CardHeader>
            <CardTitle id="dialog-title">{config.title}</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4">
            <p id="dialog-description" className="text-sm text-muted-foreground">
              {documentTitle && (
                <>
                  <strong>{documentTitle}</strong>
                  <br />
                </>
              )}
              {config.subtitle}
            </p>

            <div className="grid gap-1.5">
              <Label htmlFor="state-note">
                {config.subtitle}
                {config.required && <span className="text-red-600"> *</span>}
              </Label>
              <textarea
                id="state-note"
                value={note}
                onChange={(e) => {
                  setNote(e.target.value)
                  if (error) setError('')
                }}
                placeholder={config.placeholder}
                disabled={isSubmitting}
                rows={4}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
              />
              {error && <p className="text-sm text-red-600">{error}</p>}
            </div>

            <div className="flex flex-wrap gap-2 justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={handleCancel}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant={config.variant}
                onClick={handleConfirm}
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Processing...' : config.confirmLabel}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  )
}
