import { useState } from 'react'

interface NeedsReviewBannerProps {
  participantId: string
  onDismissed: () => void
}

export default function NeedsReviewBanner({ participantId, onDismissed }: NeedsReviewBannerProps) {
  const [dismissing, setDismissing] = useState(false)

  async function handleDismiss() {
    setDismissing(true)
    try {
      const res = await fetch('/api/participants/review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ participantId }),
      })

      if (res.ok) {
        onDismissed()
      }
    } catch {
      // Ignore — user can retry
    } finally {
      setDismissing(false)
    }
  }

  return (
    <div
      className="flex items-center justify-between gap-4 rounded-xl border border-amber-200 bg-amber-50 p-4"
      role="alert"
    >
      <p className="text-sm font-medium text-amber-800">
        Dates have changed &mdash; please review your availability.
      </p>
      <button
        onClick={handleDismiss}
        disabled={dismissing}
        className="min-h-[44px] shrink-0 rounded-lg border border-amber-300 bg-white px-4 py-2 text-sm font-semibold text-amber-700 transition-colors hover:bg-amber-100 disabled:opacity-50"
      >
        {dismissing ? 'Dismissing…' : 'Got it'}
      </button>
    </div>
  )
}
