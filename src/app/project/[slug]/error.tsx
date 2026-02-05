'use client'

import { useEffect } from 'react'
import { toast } from 'sonner'

export default function EditorError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('Editor error boundary caught:', error)
    toast.error('Editor error', {
      description: error.message || 'The editor encountered an error.',
      action: { label: 'Reload editor', onClick: reset },
      duration: 15000,
    })
  }, [error, reset])

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-4">
      <h2 className="text-xl font-semibold">Editor Error</h2>
      <p className="text-muted-foreground text-sm max-w-md text-center">
        {error.message || 'The editor encountered an error. Your work has been auto-saved.'}
      </p>
      <div className="flex gap-2">
        <button
          onClick={reset}
          className="rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground hover:bg-primary/90"
        >
          Reload editor
        </button>
        <a
          href="/dashboard"
          className="rounded-md border px-4 py-2 text-sm hover:bg-muted"
        >
          Go to dashboard
        </a>
      </div>
    </div>
  )
}
