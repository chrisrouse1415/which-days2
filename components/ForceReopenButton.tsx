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
        <div className="flex items-center gap-1">
          <button
            onClick={handleReopen}
            disabled={loading}
            className="px-2 py-1 text-xs font-medium text-white bg-amber-600 rounded hover:bg-amber-700 disabled:opacity-50"
          >
            {loading ? 'Reopening...' : 'Confirm'}
          </button>
          <button
            onClick={() => setConfirming(false)}
            className="px-2 py-1 text-xs font-medium text-gray-600 border border-gray-200 rounded hover:bg-gray-50"
          >
            Cancel
          </button>
        </div>
        {error && (
          <p className="mt-1 text-xs text-red-600" role="alert">{error}</p>
        )}
      </div>
    )
  }

  return (
    <button
      onClick={() => setConfirming(true)}
      className="px-2 py-1 text-xs font-medium text-amber-700 border border-amber-200 rounded hover:bg-amber-50 transition-colors"
      title={`Reopen ${dateLabel} — resets all responses for this date`}
      aria-label={`Reopen ${dateLabel}`}
    >
      Reopen
    </button>
  )
}
