import { useState } from 'react'
import Link from 'next/link'
import ForceReopenButton from './ForceReopenButton'
import StatusBadge from './StatusBadge'
import { formatDate } from '../lib/format-date'

interface PlanDate {
  id: string
  date: string
  status: 'viable' | 'eliminated' | 'locked' | 'reopened'
}

interface Participant {
  id: string
  display_name: string
  is_done: boolean
}

interface ResultsMatrixProps {
  planId: string
  planStatus: string
  dates: PlanDate[]
  participants: Participant[]
  matrix: Record<string, Record<string, string>>
  editHref: string
  onDataRefresh: () => void
}

const isOpen = (d: PlanDate) => d.status === 'viable' || d.status === 'reopened'
// Picked first, then open days, then crossed-off ones — each group in date order
const rank = (d: PlanDate) => (d.status === 'locked' ? 0 : isOpen(d) ? 1 : 2)

function PickDayButton({
  planId,
  planDateId,
  dateLabel,
  onPicked,
}: {
  planId: string
  planDateId: string
  dateLabel: string
  onPicked: () => void
}) {
  const [confirming, setConfirming] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handlePick() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/plans/manage?planId=${planId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pickDateId: planDateId }),
      })
      if (res.ok) {
        onPicked()
      } else {
        const data = await res.json().catch(() => ({}))
        setError(data.error || 'Couldn’t pick this day')
        setTimeout(() => setError(null), 3000)
      }
    } catch {
      setError('Network error')
      setTimeout(() => setError(null), 3000)
    } finally {
      setLoading(false)
    }
  }

  if (confirming) {
    return (
      <div>
        <div className="flex items-center justify-end gap-1">
          <button
            onClick={handlePick}
            disabled={loading}
            className="rounded-lg bg-pine-600 px-2.5 py-1 text-xs font-semibold text-white transition-colors hover:bg-pine-700 disabled:opacity-50"
          >
            {loading ? 'Picking…' : 'Confirm'}
          </button>
          <button
            onClick={() => setConfirming(false)}
            className="rounded-lg border border-stone-300 px-2.5 py-1 text-xs font-semibold text-stone-600 transition-colors hover:bg-stone-50"
          >
            Cancel
          </button>
        </div>
        {error && (
          <p className="mt-1 text-xs text-cut-600" role="alert">
            {error}
          </p>
        )}
      </div>
    )
  }

  return (
    <button
      onClick={() => setConfirming(true)}
      className="rounded-lg border border-pine-200 bg-pine-50 px-2.5 py-1 text-xs font-semibold text-pine-700 transition-colors hover:bg-pine-100"
      title={`Pick ${dateLabel} — tells everyone this is the day and closes the plan`}
      aria-label={`Pick ${dateLabel}`}
    >
      Pick this day
    </button>
  )
}

function CantMark() {
  return (
    <>
      <svg viewBox="0 0 12 12" className="mx-auto h-3.5 w-3.5 text-cut-500" aria-hidden="true">
        <path d="M1.5 9.5 Q6 6.5 10.5 2.5" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
      </svg>
      <span className="sr-only">Can&rsquo;t make it</span>
    </>
  )
}

export default function ResultsMatrix({
  planId,
  planStatus,
  dates,
  participants,
  matrix,
  editHref,
  onDataRefresh,
}: ResultsMatrixProps) {
  if (dates.length === 0) {
    return <p className="text-sm text-stone-400">No dates in this plan.</p>
  }

  const isActive = planStatus === 'active'
  const openCount = dates.filter(isOpen).length
  const sorted = dates.slice().sort((a, b) => rank(a) - rank(b) || a.date.localeCompare(b.date))

  return (
    <div className="space-y-3">
      {isActive &&
        (openCount === 0 ? (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4">
            <p className="text-sm font-medium text-amber-800">
              Every day has been crossed off. Add more dates, or reopen one below.
            </p>
            <Link href={editHref} className="btn-secondary !px-3.5 !py-1.5">
              Add dates
            </Link>
          </div>
        ) : (
          <p className="text-sm text-stone-600">
            <span className="font-semibold text-pine-700">
              {openCount} of {dates.length}
            </span>{' '}
            {dates.length === 1 ? 'day' : 'days'} still open
            {participants.length === 0 && (
              <span className="text-stone-400"> &middot; no responses yet</span>
            )}
          </p>
        ))}

      <div className="card overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="bg-stone-50">
              <th className="sticky left-0 z-10 border-b border-stone-200 bg-stone-50 px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-stone-500">
                Day
              </th>
              {participants.map((p) => (
                <th
                  key={p.id}
                  className="border-b border-stone-200 px-3 py-2.5 text-center text-xs font-semibold text-stone-600"
                >
                  <span className="block whitespace-nowrap">{p.display_name}</span>
                  {p.is_done && <span className="text-[11px] font-medium text-pine-600">done</span>}
                </th>
              ))}
              <th className="border-b border-stone-200 px-3 py-2.5">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100">
            {sorted.map((date) => {
              const crossedOff = date.status === 'eliminated'
              const rowBg = crossedOff ? 'bg-stone-50' : date.status === 'locked' ? 'bg-pine-50' : 'bg-white'
              return (
                <tr key={date.id} className={rowBg}>
                  <td
                    className={`sticky left-0 z-10 whitespace-nowrap px-3 py-2.5 font-semibold ${rowBg} ${
                      crossedOff ? 'struck' : 'text-ink'
                    }`}
                  >
                    {formatDate(date.date)}
                    {crossedOff && <span className="sr-only"> (crossed off)</span>}
                  </td>
                  {participants.map((p) => (
                    <td key={p.id} className="px-3 py-2.5 text-center">
                      {matrix[date.id]?.[p.id] === 'unavailable' && <CantMark />}
                    </td>
                  ))}
                  <td className="whitespace-nowrap px-3 py-2 text-right">
                    {date.status === 'locked' ? (
                      <StatusBadge status="locked" />
                    ) : !isActive ? null : crossedOff ? (
                      <ForceReopenButton
                        planId={planId}
                        planDateId={date.id}
                        dateLabel={formatDate(date.date)}
                        onReopened={onDataRefresh}
                      />
                    ) : (
                      <PickDayButton
                        planId={planId}
                        planDateId={date.id}
                        dateLabel={formatDate(date.date)}
                        onPicked={onDataRefresh}
                      />
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
