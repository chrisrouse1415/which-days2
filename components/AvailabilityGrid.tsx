import { useState, useCallback, useEffect, useRef } from 'react'
import UndoTimer from './UndoTimer'

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

function formatDate(dateStr: string): string {
  const date = new Date(dateStr + 'T00:00:00')
  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  })
}

function getDateParts(dateStr: string) {
  const date = new Date(dateStr + 'T00:00:00')
  const weekday = date.toLocaleDateString('en-US', { weekday: 'short' })
  const monthDay = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  return { weekday, monthDay }
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

  const getDateStatus = useCallback(
    (date: AvailabilitySummaryDate): string => {
      if (optimisticDates[date.planDateId]) return optimisticDates[date.planDateId]
      return date.status
    },
    [optimisticDates]
  )

  const iMarkedUnavailable = useCallback(
    (planDateId: string): boolean => {
      return getMyStatus(planDateId) === 'unavailable'
    },
    [getMyStatus]
  )

  const hasActiveUndo = useCallback(
    (planDateId: string): UndoPending | undefined => {
      return undoPending.find((u) => u.planDateId === planDateId)
    },
    [undoPending]
  )

  const othersMarkedUnavailable = useCallback(
    (date: AvailabilitySummaryDate): boolean => {
      return date.unavailableBy.some((u) => u.participantId !== participantId)
    },
    [participantId]
  )

  async function handleToggle(planDateId: string) {
    if (togglingIds.has(planDateId)) return
    setTogglingIds((prev) => new Set(prev).add(planDateId))

    // Optimistic update — show grey tile + undo timer immediately
    const optimisticDeadline = Date.now() + 10_000
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
        setUndoPending((prev) => prev.filter((u) => u.planDateId !== planDateId))
        return
      }

      const data = await res.json()

      // Update with real eventLogId (keep optimistic deadline to avoid timer jump)
      setUndoPending((prev) =>
        prev.map((u) =>
          u.planDateId === planDateId
            ? { ...u, eventLogId: data.eventLogId }
            : u
        )
      )
    } catch {
      // Revert all optimistic updates
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
      setUndoPending((prev) => prev.filter((u) => u.planDateId !== planDateId))
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
        // Remove from undo pending
        setUndoPending((prev) => prev.filter((u) => u.planDateId !== planDateId))
        // Clear optimistic state
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
        // Refresh from server
        onDataRefresh()
      }
    } catch {
      // Ignore — timer will expire naturally
    }
  }

  function handleUndoExpired(planDateId: string) {
    setUndoPending((prev) => prev.filter((u) => u.planDateId !== planDateId))
    // Clear optimistic state and refresh from server
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
    onDataRefresh()
  }

  if (planStatus === 'locked' || planStatus === 'deleted') {
    const isLocked = planStatus === 'locked'
    return (
      <div className="space-y-3">
        <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
          Your Availability
        </h3>
        <div
          className={`rounded-2xl p-5 ${
            isLocked
              ? 'bg-teal-50/80 border border-teal-200/60'
              : 'bg-slate-50/80 border border-slate-200/60'
          }`}
          role="alert"
        >
          <p className={`text-sm font-medium ${isLocked ? 'text-teal-800' : 'text-slate-600'}`}>
            {isLocked
              ? 'This plan is locked — no more changes allowed.'
              : 'This plan has been deleted.'}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
        Your Availability
      </h3>

      <div className="grid grid-cols-3 sm:grid-cols-4 gap-2.5">
        {availabilitySummary.map((date) => {
          const dateStatus = getDateStatus(date)
          const myStatus = getMyStatus(date.planDateId)
          const undoEntry = hasActiveUndo(date.planDateId)
          const isLocked = dateStatus === 'locked'
          const isEliminated = dateStatus === 'eliminated'
          const eliminatedByOthers = isEliminated && othersMarkedUnavailable(date) && !iMarkedUnavailable(date.planDateId)
          const { weekday, monthDay } = getDateParts(date.date)

          return (
            <div
              key={date.planDateId}
              className={`flex flex-col rounded-2xl border p-2.5 transition-all duration-200 ${
                isEliminated
                  ? 'bg-slate-50/60 border-slate-200/40'
                  : 'bg-white/80 backdrop-blur-sm border-white/80 shadow-warm hover:shadow-warm-lg'
              }`}
            >
              <div className="text-center mb-1.5">
                <p
                  className={`text-sm font-bold leading-tight ${
                    isEliminated ? 'text-slate-300 line-through' : 'text-slate-800'
                  }`}
                >
                  {weekday}
                </p>
                <p
                  className={`text-xs ${
                    isEliminated ? 'text-slate-300 line-through' : 'text-slate-400'
                  }`}
                >
                  {monthDay}
                </p>
              </div>

              {date.unavailableBy.length > 0 && (
                <p className="text-[10px] text-slate-400 text-center mb-1.5 truncate">
                  {date.unavailableBy.map((u) => u.displayName).join(', ')} can&apos;t
                </p>
              )}

              <div className="mt-auto">
                {isLocked ? (
                  <p className="text-[10px] text-slate-400 text-center py-1">Locked</p>
                ) : undoEntry ? (
                  <UndoTimer
                    deadline={undoEntry.deadline}
                    disabled={!undoEntry.eventLogId}
                    onExpired={() => handleUndoExpired(date.planDateId)}
                    onUndo={() => handleUndo(date.planDateId, undoEntry.eventLogId)}
                  />
                ) : myStatus === 'unavailable' ? (
                  <p className="text-[10px] text-slate-400 text-center py-1">Can&apos;t do this</p>
                ) : eliminatedByOthers ? (
                  <p className="text-[10px] text-slate-400 text-center py-1">Eliminated</p>
                ) : (
                  <button
                    onClick={() => handleToggle(date.planDateId)}
                    disabled={togglingIds.has(date.planDateId)}
                    className="w-full px-2 py-1.5 min-h-[36px] text-xs font-semibold text-rose-500 bg-rose-50/80 border border-rose-200/60 rounded-xl hover:bg-rose-100 hover:border-rose-300/60 disabled:opacity-50 transition-all duration-200"
                  >
                    Can&apos;t do this
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
