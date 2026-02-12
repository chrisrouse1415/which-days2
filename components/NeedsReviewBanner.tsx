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
    <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-center justify-between gap-4" role="alert">
      <p className="text-sm text-amber-800">
        Dates have changed &mdash; please review your availability.
      </p>
      <button
        onClick={handleDismiss}
        disabled={dismissing}
        className="shrink-0 px-3 py-2 min-h-[44px] text-sm font-medium text-amber-700 bg-white border border-amber-300 rounded-md hover:bg-amber-50 disabled:opacity-50 transition-colors"
      >
        {dismissing ? 'Dismissing...' : 'Dismiss'}
      </button>
    </div>
  )
}
