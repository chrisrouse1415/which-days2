import { useState, FormEvent } from 'react'
import { MAX_NAME_LENGTH } from '../lib/constants'

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
    if (trimmed.length > MAX_NAME_LENGTH) {
      setError(`Name must be ${MAX_NAME_LENGTH} characters or fewer`)
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
          setError(data.error || 'That name is already taken')
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
    <div className="mx-auto max-w-sm">
      <div className="card p-8 shadow-raised">
        <div className="mb-6">
          <p className="section-label">You&rsquo;re invited</p>
          <h2 className="mt-2 font-display text-2xl font-semibold tracking-tight text-ink">
            {planTitle}
          </h2>
          {ownerName && <p className="mt-1 text-sm text-stone-500">Organized by {ownerName}</p>}
        </div>

        {error && (
          <div className="mb-5 rounded-lg border border-cut-200 bg-cut-50 p-3 text-sm text-cut-700" role="alert">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="displayName" className="mb-1.5 block text-sm font-medium text-stone-700">
              Your name
            </label>
            <input
              id="displayName"
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              maxLength={MAX_NAME_LENGTH}
              placeholder="e.g. Chris"
              autoFocus
              className="field"
            />
            <p className="mt-1.5 text-xs text-stone-400">
              So the group knows who can&rsquo;t make which days.
            </p>
          </div>

          <button type="submit" disabled={isSubmitting} className="btn-primary w-full !py-3">
            {isSubmitting ? 'Joining…' : 'Join plan'}
          </button>
        </form>
      </div>
    </div>
  )
}
