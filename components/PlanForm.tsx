import { useState, FormEvent } from 'react'
import { useRouter } from 'next/router'
import DatePicker from './DatePicker'

interface QuotaInfo {
  activePlanCount: number
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

    // Client-side validation
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
      setError(`You've reached the limit of ${quota.maxPlans} active plans`)
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

        router.push(data.manageUrl)
      }
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-lg mx-auto space-y-6">
      {/* Quota indicator (create mode only) */}
      {!isEdit && quota && (
        <div className="text-sm text-slate-500">
          Active plans: {quota.activePlanCount} / {quota.maxPlans}
          {!quota.canCreate && (
            <span className="ml-2 text-rose-600 font-medium">
              Limit reached
            </span>
          )}
        </div>
      )}

      {/* Error message */}
      {error && (
        <div className="p-3 text-sm text-rose-700 bg-rose-50 border border-rose-200 rounded-lg">
          {error}
        </div>
      )}

      {/* Title */}
      <div>
        <label htmlFor="title" className="block text-sm font-medium text-slate-700">
          Plan title
        </label>
        <input
          id="title"
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={100}
          placeholder="e.g. Team dinner this month"
          className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
        />
      </div>

      {/* Dates */}
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-2">
          Dates
        </label>
        <DatePicker selectedDates={dates} onChange={setDates} maxDates={30} />
      </div>

      {/* Submit */}
      <button
        type="submit"
        disabled={isSubmitting || (!isEdit && quota && !quota.canCreate)}
        className="w-full rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white shadow-md shadow-teal-600/20 hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {isSubmitting
          ? (isEdit ? 'Saving...' : 'Creating...')
          : (isEdit ? 'Save Changes' : 'Create Plan')}
      </button>
    </form>
  )
}
