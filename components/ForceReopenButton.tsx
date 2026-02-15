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
            className="px-2.5 py-1 text-xs font-semibold text-white bg-amber-600 rounded-lg hover:bg-amber-700 disabled:opacity-50 transition-all"
          >
            {loading ? 'Reopening...' : 'Confirm'}
          </button>
          <button
            onClick={() => setConfirming(false)}
            className="px-2.5 py-1 text-xs font-semibold text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 transition-all"
          >
            Cancel
          </button>
        </div>
        {error && (
          <p className="mt-1 text-xs text-rose-600" role="alert">{error}</p>
        )}
      </div>
    )
  }

  return (
    <button
      onClick={() => setConfirming(true)}
      className="px-2.5 py-1 text-xs font-semibold text-amber-700 border border-amber-200/60 rounded-lg hover:bg-amber-50 transition-all"
      title={`Reopen ${dateLabel} — resets all responses for this date`}
      aria-label={`Reopen ${dateLabel}`}
    >
      Reopen
    </button>
  )
}
