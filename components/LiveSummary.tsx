import { formatDate } from '../lib/format-date'

interface DateSummary {
  planDateId: string
  date: string
  status: 'viable' | 'eliminated' | 'locked' | 'reopened'
  unavailableCount: number
  unavailableBy: Array<{ participantId: string; displayName: string }>
}

interface Participant {
  id: string
  display_name: string
  is_done: boolean
}

interface LiveSummaryProps {
  participants: Participant[]
  availabilitySummary: DateSummary[]
}

export default function LiveSummary({ participants, availabilitySummary }: LiveSummaryProps) {
  const doneNames = participants.filter((p) => p.is_done).map((p) => p.display_name)
  const viableDates = availabilitySummary.filter(
    (d) => d.status === 'viable' || d.status === 'reopened'
  )
  const eliminatedDates = availabilitySummary.filter((d) => d.status === 'eliminated')

  return (
    <div className="space-y-3">
      <h3 className="section-label">Where things stand</h3>

      <div className="card space-y-4 p-5">
        {viableDates.length === 0 && eliminatedDates.length > 0 && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-3" role="alert">
            <p className="text-sm font-medium text-amber-800">
              Every day has been crossed off. The organizer can add or reopen days.
            </p>
          </div>
        )}

        {viableDates.length > 0 && (
          <div>
            <p className="mb-2 text-xs font-semibold text-pine-700">
              Open ({viableDates.length})
            </p>
            <div className="flex flex-wrap gap-1.5">
              {viableDates.map((d) => (
                <span
                  key={d.planDateId}
                  className="inline-flex items-center rounded-lg border border-pine-200 bg-pine-50 px-2.5 py-1 text-xs font-semibold text-pine-800"
                >
                  {formatDate(d.date)}
                </span>
              ))}
            </div>
          </div>
        )}

        {eliminatedDates.length > 0 && (
          <div>
            <p className="mb-2 text-xs font-semibold text-stone-500">
              Crossed off ({eliminatedDates.length})
            </p>
            <div className="flex flex-wrap gap-1.5">
              {eliminatedDates.map((d) => (
                <span
                  key={d.planDateId}
                  className="struck inline-flex items-center rounded-lg border border-stone-200 bg-stone-50 px-2.5 py-1 text-xs font-medium"
                >
                  {formatDate(d.date)}
                </span>
              ))}
            </div>
          </div>
        )}

        {doneNames.length > 0 && (
          <p className="border-t border-stone-100 pt-3 text-xs text-stone-500">
            <span className="font-semibold text-pine-700">Done:</span> {doneNames.join(', ')}
          </p>
        )}
      </div>
    </div>
  )
}
