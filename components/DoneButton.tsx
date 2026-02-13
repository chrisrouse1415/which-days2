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
    <div>
      {isDone ? (
        <button
          onClick={handleClick}
          disabled={loading}
          className="w-full min-h-[44px] py-3 text-sm font-medium text-violet-700 bg-violet-50 border border-violet-200 rounded-xl hover:bg-violet-100 disabled:opacity-50 transition-colors"
        >
          {loading ? 'Updating...' : 'Done — Edit my responses'}
        </button>
      ) : (
        <button
          onClick={handleClick}
          disabled={loading}
          className="w-full min-h-[44px] py-3 text-sm font-medium text-white bg-violet-600 rounded-xl shadow-md shadow-violet-600/20 hover:bg-violet-700 disabled:opacity-50 transition-colors"
        >
          {loading ? 'Updating...' : "I'm done"}
        </button>
      )}
      {error && (
        <p className="mt-1 text-xs text-rose-600" role="alert">{error}</p>
      )}
    </div>
  )
}
