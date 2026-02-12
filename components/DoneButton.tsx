import { useState } from 'react'

interface DoneButtonProps {
  participantId: string
  isDone: boolean
  onToggled: (isDone: boolean) => void
}

export default function DoneButton({ participantId, isDone, onToggled }: DoneButtonProps) {
  const [loading, setLoading] = useState(false)

  async function handleClick() {
    setLoading(true)
    try {
      const res = await fetch('/api/participants/done', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ participantId }),
      })

      if (res.ok) {
        const data = await res.json()
        onToggled(data.is_done)
      }
    } catch {
      // Ignore — user can retry
    } finally {
      setLoading(false)
    }
  }

  if (isDone) {
    return (
      <button
        onClick={handleClick}
        disabled={loading}
        className="w-full py-3 text-sm font-medium text-green-700 bg-green-50 border border-green-200 rounded-lg hover:bg-green-100 disabled:opacity-50 transition-colors"
      >
        {loading ? 'Updating...' : 'Done — Edit my responses'}
      </button>
    )
  }

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      className="w-full py-3 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
    >
      {loading ? 'Updating...' : "I'm done"}
    </button>
  )
}
