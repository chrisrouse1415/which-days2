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
    <div className="max-w-sm mx-auto">
      <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-8 shadow-warm-lg border border-white/80">
        <div className="text-center mb-6">
          <span className="inline-block text-5xl mb-3 animate-bounce-once" role="img" aria-label="Calendar">🗓️</span>
          <h2 className="font-display text-2xl font-bold text-slate-900 mb-1 tracking-tight">
            Join {ownerName ? `${ownerName}\u2019s` : 'this'} plan
          </h2>
          <p className="text-base text-slate-500">{planTitle}</p>
        </div>

        {error && (
          <div className="mb-5 p-3 text-sm text-rose-700 bg-rose-50 border border-rose-200 rounded-xl">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="displayName" className="block text-sm font-medium text-slate-600 mb-1.5">
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
              className="block w-full rounded-xl border border-slate-200 bg-white/80 px-4 py-2.5 text-sm shadow-sm placeholder:text-slate-300 focus:border-teal-400 focus:outline-none focus:ring-2 focus:ring-teal-400/20 transition-all"
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-xl bg-gradient-to-r from-teal-600 to-teal-500 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-teal-600/25 hover:shadow-xl hover:shadow-teal-600/30 hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:shadow-lg transition-all duration-200"
          >
            {isSubmitting ? 'Joining...' : 'Join Plan'}
          </button>
        </form>
      </div>
    </div>
  )
}
