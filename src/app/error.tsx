'use client'

import { useEffect } from 'react'
import { toast } from 'sonner'

export default function CoreError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('Core error boundary caught:', error)
    toast.error('Application error', {
      description: error.message || 'An unexpected error occurred.',
      action: { label: 'Try again', onClick: reset },
    })
  }, [error, reset])

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-4">
      <h2 className="text-xl font-semibold">Something went wrong</h2>
      <p className="text-muted-foreground text-sm max-w-md text-center">
        {error.message || 'An unexpected error occurred.'}
      </p>
      <button
        onClick={reset}
        className="rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground hover:bg-primary/90"
      >
        Try again
      </button>
    </div>
  )
}
