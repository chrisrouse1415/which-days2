import { useState, useCallback } from 'react'
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


export default function AvailabilityGrid({
  participantId,
  planStatus,
  availabilitySummary,
  myAvailability,
  onDataRefresh,
}: AvailabilityGridProps) {
  const [undoPending, setUndoPending] = useState<UndoPending[]>([])
  const [optimisticDates, setOptimisticDates] = useState<Record<string, 'eliminated'>>({})
  const [optimisticMy, setOptimisticMy] = useState<Record<string, 'unavailable'>>({})
  const [togglingIds, setTogglingIds] = useState<Set<string>>(new Set())

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

    // Optimistic update
    setOptimisticDates((prev) => ({ ...prev, [planDateId]: 'eliminated' }))
    setOptimisticMy((prev) => ({ ...prev, [planDateId]: 'unavailable' }))

    try {
      const res = await fetch('/api/availability/toggle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ participantId, planDateId }),
      })

      if (!res.ok) {
        // Revert optimistic updates
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
        return
      }

      const data = await res.json()

      setUndoPending((prev) => [
        ...prev,
        {
          planDateId,
          eventLogId: data.eventLogId,
          deadline: new Date(data.undoDeadline).getTime(),
        },
      ])
    } catch {
      // Revert optimistic updates
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
        <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide">
          Your Availability
        </h3>
        <div
          className={`border rounded-lg p-4 ${
            isLocked
              ? 'bg-blue-50 border-blue-200'
              : 'bg-gray-50 border-gray-200'
          }`}
          role="alert"
        >
          <p className={`text-sm font-medium ${isLocked ? 'text-blue-800' : 'text-gray-600'}`}>
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
      <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide">
        Your Availability
      </h3>

      <div className="divide-y divide-gray-200 border border-gray-200 rounded-lg overflow-hidden">
        {availabilitySummary.map((date) => {
          const dateStatus = getDateStatus(date)
          const myStatus = getMyStatus(date.planDateId)
          const undoEntry = hasActiveUndo(date.planDateId)
          const isLocked = dateStatus === 'locked'
          const isEliminated = dateStatus === 'eliminated'
          const eliminatedByOthers = isEliminated && othersMarkedUnavailable(date) && !iMarkedUnavailable(date.planDateId)

          return (
            <div
              key={date.planDateId}
              className={`flex flex-row items-center justify-between gap-2 px-4 py-3 ${
                isEliminated ? 'bg-gray-50' : 'bg-white'
              }`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <span
                  className={`text-sm font-medium ${
                    isEliminated ? 'text-gray-400 line-through' : 'text-gray-900'
                  }`}
                >
                  {formatDate(date.date)}
                </span>
                {date.unavailableBy.length > 0 && (
                  <span className="text-xs text-gray-400">
                    {date.unavailableBy.map((u) => u.displayName).join(', ')} can&apos;t
                  </span>
                )}
              </div>

              <div>
                {isLocked ? (
                  <span className="text-xs text-gray-400">Locked</span>
                ) : undoEntry ? (
                  <UndoTimer
                    deadline={undoEntry.deadline}
                    onExpired={() => handleUndoExpired(date.planDateId)}
                    onUndo={() => handleUndo(date.planDateId, undoEntry.eventLogId)}
                  />
                ) : myStatus === 'unavailable' ? (
                  <span className="text-xs text-gray-400">Marked unavailable</span>
                ) : eliminatedByOthers ? (
                  <span className="text-xs text-gray-400">Eliminated</span>
                ) : (
                  <button
                    onClick={() => handleToggle(date.planDateId)}
                    disabled={togglingIds.has(date.planDateId)}
                    className="px-4 py-2 min-h-[44px] text-sm font-medium text-red-600 bg-white border border-red-200 rounded-md hover:bg-red-50 disabled:opacity-50 transition-colors"
                  >
                    I can&apos;t do this day
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
