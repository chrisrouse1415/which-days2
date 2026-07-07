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
        <button onClick={handleClick} disabled={loading} className="btn-secondary min-h-[44px] w-full !py-3">
          {loading ? 'Updating…' : 'Edit my responses'}
        </button>
      ) : (
        <>
          <p className="text-center text-xs text-stone-500">Available for all remaining dates?</p>
          <button onClick={handleClick} disabled={loading} className="btn-primary min-h-[44px] w-full !py-3">
            {loading ? 'Updating…' : 'I’m done'}
          </button>
        </>
      )}
      {error && (
        <p className="mt-1 text-xs text-cut-600" role="alert">
          {error}
        </p>
      )}
    </div>
  )
}
