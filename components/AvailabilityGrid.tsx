import { useState, useCallback, useEffect, useRef } from 'react'
import UndoTimer from './UndoTimer'
import { getDateParts } from '../lib/format-date'
import { UNDO_WINDOW_MS } from '../lib/constants'

interface AvailabilitySummaryDate {
  planDateId: string
  date: string
  status: 'viable' | 'eliminated' | 'locked' | 'reopened'
  unavailableCount: number
  unavailableBy: Array<{ participantId: string; displayName: string }>
}

interface MyAvailability {
  id: string
  participant_id: string
  plan_date_id: string
  status: 'available' | 'unavailable'
}

interface UndoPending {
  planDateId: string
  eventLogId: string
  deadline: number
}

interface AvailabilityGridProps {
  participantId: string
  planId: string
  shareId: string
  planStatus: string
  isDone: boolean
  availabilitySummary: AvailabilitySummaryDate[]
  myAvailability: MyAvailability[]
  onDataRefresh: () => void
}

function DateTile({
  eliminated,
  children,
}: {
  eliminated: boolean
  children: React.ReactNode
}) {
  return (
    <div
      className={`flex flex-col rounded-xl border p-2.5 transition-colors duration-150 ${
        eliminated ? 'border-stone-200 bg-stone-50' : 'card'
      }`}
    >
      {children}
    </div>
  )
}

function DateHeading({ date, eliminated }: { date: string; eliminated: boolean }) {
  const { weekday, monthDay } = getDateParts(date)
  return (
    <div className="mb-1.5 text-center">
      <p className={`text-sm font-semibold leading-tight ${eliminated ? 'struck' : 'text-ink'}`}>
        {weekday}
      </p>
      <p className={`text-xs ${eliminated ? 'struck' : 'text-stone-500'}`}>{monthDay}</p>
    </div>
  )
}

export default function AvailabilityGrid({
  participantId,
  planStatus,
  isDone,
  availabilitySummary,
  myAvailability,
  onDataRefresh,
}: AvailabilityGridProps) {
  const [undoPending, setUndoPending] = useState<UndoPending[]>([])
  const [optimisticDates, setOptimisticDates] = useState<Record<string, 'eliminated'>>({})
  const [optimisticMy, setOptimisticMy] = useState<Record<string, 'unavailable'>>({})
  const [togglingIds, setTogglingIds] = useState<Set<string>>(new Set())
  const [error, setError] = useState<string | null>(null)
  const prevIsDone = useRef(isDone)

  // When participant marks done, clear all undo timers immediately
  useEffect(() => {
    if (isDone && !prevIsDone.current) {
      setUndoPending([])
      setOptimisticDates({})
      setOptimisticMy({})
    }
    prevIsDone.current = isDone
  }, [isDone])

  const getMyStatus = useCallback(
    (planDateId: string): 'available' | 'unavailable' => {
      if (optimisticMy[planDateId]) return optimisticMy[planDateId]
      const row = myAvailability.find((a) => a.plan_date_id === planDateId)
      return row?.status ?? 'available'
    },
    [myAvailability, optimisticMy]
  )

  function clearOptimistic(planDateId: string) {
    setOptimisticDates((prev) => {
      const next = { ...prev }
      delete next[planDateId]
      return next
    })
    setOptimisticMy((prev) => {
      const next = { ...prev }
      delete next[planDateId]
      return next
    })
  }

  async function handleToggle(planDateId: string) {
    if (togglingIds.has(planDateId)) return
    setTogglingIds((prev) => new Set(prev).add(planDateId))

    // Optimistic update — show eliminated tile + undo timer immediately
    const optimisticDeadline = Date.now() + UNDO_WINDOW_MS
    setOptimisticDates((prev) => ({ ...prev, [planDateId]: 'eliminated' }))
    setOptimisticMy((prev) => ({ ...prev, [planDateId]: 'unavailable' }))
    setUndoPending((prev) => [
      ...prev,
      { planDateId, eventLogId: '', deadline: optimisticDeadline },
    ])

    try {
      const res = await fetch('/api/availability/toggle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ participantId, planDateId }),
      })

      if (!res.ok) {
        // Revert all optimistic updates
        clearOptimistic(planDateId)
        setUndoPending((prev) => prev.filter((u) => u.planDateId !== planDateId))
        const data = await res.json().catch(() => ({}))
        setError(data.error || 'Failed to update. Please try again.')
        setTimeout(() => setError(null), 3000)
        return
      }

      const data = await res.json()

      // Update with real eventLogId (keep optimistic deadline to avoid timer jump)
      setUndoPending((prev) =>
        prev.map((u) => (u.planDateId === planDateId ? { ...u, eventLogId: data.eventLogId } : u))
      )
    } catch {
      // Revert all optimistic updates
      clearOptimistic(planDateId)
      setUndoPending((prev) => prev.filter((u) => u.planDateId !== planDateId))
      setError('Network error. Please try again.')
      setTimeout(() => setError(null), 3000)
    } finally {
      setTogglingIds((prev) => {
        const next = new Set(prev)
        next.delete(planDateId)
        return next
      })
    }
  }

  async function handleUndo(planDateId: string, eventLogId: string) {
    try {
      const res = await fetch('/api/availability/undo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ participantId, eventLogId }),
      })

      if (res.ok) {
        setUndoPending((prev) => prev.filter((u) => u.planDateId !== planDateId))
        clearOptimistic(planDateId)
        onDataRefresh()
      }
    } catch {
      // Ignore — timer will expire naturally
    }
  }

  function handleUndoExpired(planDateId: string) {
    setUndoPending((prev) => prev.filter((u) => u.planDateId !== planDateId))
    clearOptimistic(planDateId)
    onDataRefresh()
  }

  if (planStatus === 'deleted') {
    return (
      <div className="space-y-3">
        <h3 className="section-label">Your availability</h3>
        <div className="rounded-xl border border-stone-200 bg-stone-50 p-5" role="alert">
          <p className="text-sm font-medium text-stone-600">This plan has been deleted.</p>
        </div>
      </div>
    )
  }

  if (planStatus === 'locked') {
    return (
      <div className="space-y-3">
        <h3 className="section-label">Your availability</h3>
        <div className="rounded-xl border border-pine-200 bg-pine-50 p-4" role="alert">
          <p className="text-sm font-medium text-pine-800">
            This plan is locked &mdash; no more changes allowed.
          </p>
        </div>
        <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-4">
          {availabilitySummary.map((date) => {
            const isEliminated = date.status === 'eliminated'
            const myStatus = getMyStatus(date.planDateId)

            return (
              <DateTile key={date.planDateId} eliminated={isEliminated}>
                <DateHeading date={date.date} eliminated={isEliminated} />
                <div className="mt-auto">
                  {myStatus === 'unavailable' ? (
                    <p className="py-1 text-center text-[11px] text-stone-400">You can&rsquo;t do this</p>
                  ) : isEliminated ? (
                    <p className="py-1 text-center text-[11px] text-stone-400">Eliminated</p>
                  ) : (
                    <p className="py-1 text-center text-[11px] font-medium text-pine-600">Available</p>
                  )}
                </div>
              </DateTile>
            )
          })}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <h3 className="section-label">Your availability</h3>

      {error && (
        <p className="rounded-lg border border-cut-200 bg-cut-50 px-3 py-2 text-xs text-cut-700" role="alert">
          {error}
        </p>
      )}

      <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-4">
        {availabilitySummary.map((date) => {
          const dateStatus: string = optimisticDates[date.planDateId] ?? date.status
          const myStatus = getMyStatus(date.planDateId)
          const undoEntry = undoPending.find((u) => u.planDateId === date.planDateId)
          const isLocked = dateStatus === 'locked'
          const isEliminated = dateStatus === 'eliminated'
          const othersWhoCant = date.unavailableBy.filter((u) => u.participantId !== participantId)
          const eliminatedByOthers =
            isEliminated && othersWhoCant.length > 0 && myStatus !== 'unavailable'

          return (
            <DateTile key={date.planDateId} eliminated={isEliminated}>
              <DateHeading date={date.date} eliminated={isEliminated} />

              {othersWhoCant.length > 0 && (
                <p className="mb-1.5 truncate text-center text-[11px] text-stone-400">
                  {othersWhoCant.map((u) => u.displayName).join(', ')} can&rsquo;t
                </p>
              )}

              <div className="mt-auto">
                {isLocked ? (
                  <p className="py-1 text-center text-[11px] text-stone-400">Locked</p>
                ) : undoEntry ? (
                  <UndoTimer
                    deadline={undoEntry.deadline}
                    disabled={!undoEntry.eventLogId}
                    onExpired={() => handleUndoExpired(date.planDateId)}
                    onUndo={() => handleUndo(date.planDateId, undoEntry.eventLogId)}
                  />
                ) : myStatus === 'unavailable' ? (
                  <p className="py-1 text-center text-[11px] text-stone-400">You can&rsquo;t do this</p>
                ) : eliminatedByOthers ? (
                  <p className="py-1 text-center text-[11px] text-stone-400">Eliminated</p>
                ) : isDone ? (
                  <p className="py-1 text-center text-[11px] font-medium text-pine-600">Available</p>
                ) : (
                  <button
                    onClick={() => handleToggle(date.planDateId)}
                    disabled={togglingIds.has(date.planDateId)}
                    className="min-h-[36px] w-full rounded-lg border border-cut-200 bg-white px-2 py-1.5 text-xs font-semibold text-cut-600 transition-colors duration-150 hover:bg-cut-50 disabled:opacity-50"
                  >
                    Can&rsquo;t do this
                  </button>
                )}
              </div>
            </DateTile>
          )
        })}
      </div>
    </div>
  )
}
