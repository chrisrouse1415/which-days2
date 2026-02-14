import { useState, FormEvent } from 'react'

interface JoinFormProps {
  shareId: string
  planTitle: string
  ownerName: string | null
  onJoined: (participantId: string) => void
}

export default function JoinForm({ shareId, planTitle, ownerName, onJoined }: JoinFormProps) {
  const [displayName, setDisplayName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)

    const trimmed = displayName.trim()
    if (!trimmed) {
      setError('Please enter your name')
      return
    }
    if (trimmed.length > 50) {
      setError('Name must be 50 characters or fewer')
      return
    }

    setIsSubmitting(true)

    try {
      const res = await fetch('/api/participants/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ shareId, displayName: trimmed }),
      })

      const data = await res.json()

      if (!res.ok) {
        if (res.status === 409) {
          setError('That name is already taken')
        } else {
          setError(data.error || 'Failed to join plan')
        }
        return
      }

      onJoined(data.id)
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="max-w-md mx-auto">
      <div className="text-center mb-4">
        <span className="text-5xl" role="img" aria-label="Calendar">🗓️</span>
      </div>
      <h2 className="text-2xl font-semibold text-slate-900 mb-1 text-center">
        Join {ownerName ? `${ownerName}\u2019s` : 'this'} plan?
      </h2>
      <p className="text-lg text-slate-500 mb-6 text-center">{planTitle}</p>

      {error && (
        <div className="mb-4 p-3 text-sm text-rose-700 bg-rose-50 border border-rose-200 rounded-lg">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="displayName" className="block text-sm font-medium text-slate-700">
            Your name
          </label>
          <input
            id="displayName"
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            maxLength={50}
            placeholder="e.g. Chris"
            autoFocus
            className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
          />
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white shadow-md shadow-teal-600/20 hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isSubmitting ? 'Joining...' : 'Join Plan'}
        </button>
      </form>
    </div>
  )
}
