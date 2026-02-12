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
          className="w-full min-h-[44px] py-3 text-sm font-medium text-green-700 bg-green-50 border border-green-200 rounded-lg hover:bg-green-100 disabled:opacity-50 transition-colors"
        >
          {loading ? 'Updating...' : 'Done — Edit my responses'}
        </button>
      ) : (
        <button
          onClick={handleClick}
          disabled={loading}
          className="w-full min-h-[44px] py-3 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
        >
          {loading ? 'Updating...' : "I'm done"}
        </button>
      )}
      {error && (
        <p className="mt-1 text-xs text-red-600" role="alert">{error}</p>
      )}
    </div>
  )
}
