import { useState, FormEvent } from 'react'
import { useRouter } from 'next/router'
import DatePicker from './DatePicker'
import { MAX_DATES, MAX_TITLE_LENGTH } from '../lib/constants'

interface QuotaInfo {
  planCount: number
  maxPlans: number
  canCreate: boolean
}

interface PlanFormProps {
  quota?: QuotaInfo
  mode?: 'create' | 'edit'
  planId?: string
  initialTitle?: string
  initialDates?: string[]
}

export default function PlanForm({
  quota,
  mode = 'create',
  planId,
  initialTitle = '',
  initialDates = [],
}: PlanFormProps) {
  const router = useRouter()
  const isEdit = mode === 'edit'
  const [title, setTitle] = useState(initialTitle)
  const [dates, setDates] = useState<string[]>(initialDates)
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)

    const trimmedTitle = title.trim()
    if (!trimmedTitle) {
      setError('Title is required')
      return
    }

    if (dates.length === 0) {
      setError('At least one date is required')
      return
    }

    const uniqueDates = Array.from(new Set(dates))

    if (!isEdit && quota && !quota.canCreate) {
      setError(`You've reached the limit of ${quota.maxPlans} plans`)
      return
    }

    setIsSubmitting(true)

    try {
      if (isEdit) {
        const res = await fetch(`/api/plans/manage?planId=${planId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title: trimmedTitle, dates: uniqueDates }),
        })

        const data = await res.json()

        if (!res.ok) {
          setError(data.error || 'Failed to save changes')
          return
        }

        router.push(`/manage/${planId}`)
      } else {
        const res = await fetch('/api/plans/create', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title: trimmedTitle, dates: uniqueDates }),
        })

        const data = await res.json()

        if (!res.ok) {
          setError(data.error || 'Failed to create plan')
          return
        }

        router.push(`${data.manageUrl}?new=1`)
      }
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Quota indicator (create mode only) */}
      {!isEdit && quota && (
        <div className="flex items-center gap-2 text-sm text-stone-500">
          <div className="flex items-center gap-1" aria-hidden="true">
            {Array.from({ length: quota.maxPlans }).map((_, i) => (
              <div
                key={i}
                className={`h-2 w-2 rounded-full ${i < quota.planCount ? 'bg-pine-600' : 'bg-stone-200'}`}
              />
            ))}
          </div>
          <span>
            {quota.planCount} of {quota.maxPlans} plans
          </span>
          {!quota.canCreate && <span className="font-semibold text-cut-600">Limit reached</span>}
        </div>
      )}

      {error && (
        <div className="rounded-lg border border-cut-200 bg-cut-50 p-3 text-sm text-cut-700" role="alert">
          {error}
        </div>
      )}

      <div>
        <label htmlFor="title" className="mb-1.5 block text-sm font-medium text-stone-700">
          Plan title
        </label>
        <input
          id="title"
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={MAX_TITLE_LENGTH}
          placeholder="e.g. Team dinner this month"
          className="field"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-stone-700">Dates</label>
        <p className="mb-3 mt-0.5 text-xs text-stone-500">
          Choose days that work for you &mdash; your group will cross off the ones they can&rsquo;t make.
        </p>
        <DatePicker selectedDates={dates} onChange={setDates} maxDates={MAX_DATES} />
      </div>

      <div>
        <button
          type="submit"
          disabled={isSubmitting || (!isEdit && quota && !quota.canCreate)}
          className="btn-primary w-full !py-3"
        >
          {isSubmitting
            ? isEdit
              ? 'Saving…'
              : 'Creating…'
            : isEdit
              ? 'Save changes'
              : 'Create plan'}
        </button>
        {!isEdit && quota && !quota.canCreate && (
          <p className="mt-2 text-center text-xs text-stone-500">
            Plan limit reached &mdash; delete a plan to free up a slot
          </p>
        )}
      </div>
    </form>
  )
}
