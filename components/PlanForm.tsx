import { useState, FormEvent } from 'react'
import { useRouter } from 'next/router'

interface QuotaInfo {
  activePlanCount: number
  maxPlans: number
  canCreate: boolean
}

interface PlanFormProps {
  quota: QuotaInfo
}

export default function PlanForm({ quota }: PlanFormProps) {
  const router = useRouter()
  const [title, setTitle] = useState('')
  const [dates, setDates] = useState<string[]>([''])
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  function addDate() {
    if (dates.length >= 30) return
    setDates([...dates, ''])
  }

  function removeDate(index: number) {
    if (dates.length <= 1) return
    setDates(dates.filter((_, i) => i !== index))
  }

  function updateDate(index: number, value: string) {
    const updated = [...dates]
    updated[index] = value
    setDates(updated)
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)

    // Client-side validation
    const trimmedTitle = title.trim()
    if (!trimmedTitle) {
      setError('Title is required')
      return
    }

    const filledDates = dates.filter((d) => d !== '')
    if (filledDates.length === 0) {
      setError('At least one date is required')
      return
    }

    const uniqueDates = Array.from(new Set(filledDates))
    if (uniqueDates.length !== filledDates.length) {
      setError('Duplicate dates are not allowed')
      return
    }

    if (!quota.canCreate) {
      setError(`You've reached the limit of ${quota.maxPlans} active plans`)
      return
    }

    setIsSubmitting(true)

    try {
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
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-lg mx-auto space-y-6">
      {/* Quota indicator */}
      <div className="text-sm text-gray-500">
        Active plans: {quota.activePlanCount} / {quota.maxPlans}
        {!quota.canCreate && (
          <span className="ml-2 text-red-600 font-medium">
            Limit reached
          </span>
        )}
      </div>

      {/* Error message */}
      {error && (
        <div className="p-3 text-sm text-red-700 bg-red-50 border border-red-200 rounded-md">
          {error}
        </div>
      )}

      {/* Title */}
      <div>
        <label htmlFor="title" className="block text-sm font-medium text-gray-700">
          Plan title
        </label>
        <input
          id="title"
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={100}
          placeholder="e.g. Team dinner this month"
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
      </div>

      {/* Dates */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Dates
        </label>
        <div className="space-y-2">
          {dates.map((date, index) => (
            <div key={index} className="flex items-center gap-2">
              <input
                type="date"
                value={date}
                onChange={(e) => updateDate(index, e.target.value)}
                className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
              {dates.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeDate(index)}
                  className="px-2 py-2 text-sm text-red-600 hover:text-red-800"
                  aria-label="Remove date"
                >
                  Remove
                </button>
              )}
            </div>
          ))}
        </div>
        {dates.length < 30 && (
          <button
            type="button"
            onClick={addDate}
            className="mt-2 text-sm text-blue-600 hover:text-blue-800"
          >
            + Add another date
          </button>
        )}
      </div>

      {/* Submit */}
      <button
        type="submit"
        disabled={isSubmitting || !quota.canCreate}
        className="w-full rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isSubmitting ? 'Creating...' : 'Create Plan'}
      </button>
    </form>
  )
}
