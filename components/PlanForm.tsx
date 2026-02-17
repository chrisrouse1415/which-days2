import { useState, FormEvent } from 'react'
import { useRouter } from 'next/router'
import DatePicker from './DatePicker'

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
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <div className="flex items-center gap-1">
            {Array.from({ length: quota.maxPlans }).map((_, i) => (
              <div
                key={i}
                className={`w-2 h-2 rounded-full ${
                  i < quota.planCount ? 'bg-teal-500' : 'bg-slate-200'
                }`}
              />
            ))}
          </div>
          <span>{quota.planCount} / {quota.maxPlans} plans</span>
          {!quota.canCreate && (
            <span className="text-rose-600 font-semibold">
              Limit reached
            </span>
          )}
        </div>
      )}

      {/* Error message */}
      {error && (
        <div className="p-3 text-sm text-rose-700 bg-rose-50/80 border border-rose-200/60 rounded-xl">
          {error}
        </div>
      )}

      {/* Title */}
      <div>
        <label htmlFor="title" className="block text-sm font-medium text-slate-600 mb-1.5">
          Plan title
        </label>
        <input
          id="title"
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={100}
          placeholder="e.g. Team dinner this month"
          className="block w-full rounded-xl border border-slate-200 bg-white/80 px-4 py-2.5 text-sm shadow-sm placeholder:text-slate-300 focus:border-teal-400 focus:outline-none focus:ring-2 focus:ring-teal-400/20 transition-all"
        />
      </div>

      {/* Dates */}
      <div>
        <label className="block text-sm font-medium text-slate-600 mb-2">
          Dates
        </label>
        <DatePicker selectedDates={dates} onChange={setDates} maxDates={30} />
      </div>

      {/* Submit */}
      <div>
        <button
          type="submit"
          disabled={isSubmitting || (!isEdit && quota && !quota.canCreate)}
          className="w-full rounded-xl bg-gradient-to-r from-teal-600 to-teal-500 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-teal-600/25 hover:shadow-xl hover:shadow-teal-600/30 hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:shadow-lg transition-all duration-200"
        >
          {isSubmitting
            ? (isEdit ? 'Saving...' : 'Creating...')
            : (isEdit ? 'Save Changes' : 'Create Plan')}
        </button>
        {!isEdit && quota && !quota.canCreate && (
          <p className="text-xs text-slate-400 text-center mt-2">
            Plan limit reached — lock or delete a plan to free a slot
          </p>
        )}
      </div>
    </form>
  )
}
