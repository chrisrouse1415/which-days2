import { useState } from 'react'

interface DoneButtonProps {
  participantId: string
  isDone: boolean
  onToggled: (isDone: boolean) => void
}

export default function DoneButton({ participantId, isDone, onToggled }: DoneButtonProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleClick() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/participants/done', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ participantId }),
      })

      if (res.ok) {
        const data = await res.json()
        onToggled(data.is_done)
      } else {
        setError('Something went wrong. Please try again.')
        setTimeout(() => setError(null), 3000)
      }
    } catch {
      setError('Network error. Please try again.')
      setTimeout(() => setError(null), 3000)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-1.5">
      {isDone ? (
        <button
          onClick={handleClick}
          disabled={loading}
          className="w-full min-h-[44px] py-3 text-sm font-semibold text-violet-600 bg-violet-50/80 border border-violet-200/60 rounded-2xl hover:bg-violet-100 hover:border-violet-300/60 disabled:opacity-50 transition-all duration-200"
        >
          {loading ? 'Updating...' : 'Edit my responses'}
        </button>
      ) : (
        <>
          <p className="text-xs text-slate-400 text-center">Available for all remaining dates?</p>
          <button
            onClick={handleClick}
            disabled={loading}
            className="w-full min-h-[44px] py-3 text-sm font-semibold text-white bg-gradient-to-r from-violet-600 to-violet-500 rounded-2xl shadow-lg shadow-violet-600/25 hover:shadow-xl hover:shadow-violet-600/30 hover:-translate-y-0.5 disabled:opacity-50 disabled:hover:translate-y-0 disabled:hover:shadow-lg transition-all duration-200"
          >
            {loading ? 'Updating...' : 'Done'}
          </button>
        </>
      )}
      {error && (
        <p className="mt-1 text-xs text-rose-600" role="alert">{error}</p>
      )}
    </div>
  )
}
