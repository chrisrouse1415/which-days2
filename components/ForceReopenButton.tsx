import { useState } from 'react'

interface ForceReopenButtonProps {
  planId: string
  planDateId: string
  dateLabel: string
  onReopened: () => void
}

export default function ForceReopenButton({
  planId,
  planDateId,
  dateLabel,
  onReopened,
}: ForceReopenButtonProps) {
  const [loading, setLoading] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleReopen() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/plans/force-reopen', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planId, planDateId }),
      })

      if (res.ok) {
        setConfirming(false)
        onReopened()
      } else {
        setError('Failed to reopen')
        setTimeout(() => setError(null), 3000)
      }
    } catch {
      setError('Network error')
      setTimeout(() => setError(null), 3000)
    } finally {
      setLoading(false)
    }
  }

  if (confirming) {
    return (
      <div>
        <div className="flex items-center justify-end gap-1">
          <button
            onClick={handleReopen}
            disabled={loading}
            className="rounded-lg bg-amber-600 px-2.5 py-1 text-xs font-semibold text-white transition-colors hover:bg-amber-700 disabled:opacity-50"
          >
            {loading ? 'Reopening…' : 'Confirm'}
          </button>
          <button
            onClick={() => setConfirming(false)}
            className="rounded-lg border border-stone-300 px-2.5 py-1 text-xs font-semibold text-stone-600 transition-colors hover:bg-stone-50"
          >
            Cancel
          </button>
        </div>
        {error && (
          <p className="mt-1 text-xs text-cut-600" role="alert">
            {error}
          </p>
        )}
      </div>
    )
  }

  return (
    <button
      onClick={() => setConfirming(true)}
      className="rounded-lg border border-amber-300 px-2.5 py-1 text-xs font-semibold text-amber-700 transition-colors hover:bg-amber-50"
      title={`Reopen ${dateLabel} — resets all responses for this date`}
      aria-label={`Reopen ${dateLabel}`}
    >
      Reopen
    </button>
  )
}
