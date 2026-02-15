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
  doneCount: number
  availabilitySummary: DateSummary[]
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr + 'T00:00:00')
  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  })
}

export default function LiveSummary({
  participants,
  doneCount,
  availabilitySummary,
}: LiveSummaryProps) {
  const participantCount = participants.length
  const doneNames = participants.filter((p) => p.is_done).map((p) => p.display_name)
  const viableDates = availabilitySummary.filter(
    (d) => d.status === 'viable' || d.status === 'reopened'
  )
  const eliminatedDates = availabilitySummary.filter((d) => d.status === 'eliminated')
  return (
    <div className="space-y-4">
      <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Summary</h3>

      <div className="bg-white/80 backdrop-blur-sm border border-white/80 rounded-2xl p-5 space-y-4 shadow-warm">
        <div className="text-sm text-slate-600">
          <p>
            <span className="font-bold text-slate-900">{doneCount}</span> of{' '}
            <span className="font-bold text-slate-900">{participantCount}</span> participant
            {participantCount !== 1 ? 's' : ''} done
          </p>
          {doneNames.length > 0 && (
            <p className="text-xs text-emerald-600 mt-1">
              Done: {doneNames.join(', ')}
            </p>
          )}
        </div>

        {viableDates.length === 0 && eliminatedDates.length > 0 && (
          <div className="bg-amber-50/80 border border-amber-200/60 rounded-xl p-3" role="alert">
            <p className="text-sm font-medium text-amber-800">
              All dates have been eliminated. The plan owner can reopen dates if needed.
            </p>
          </div>
        )}

        {viableDates.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-emerald-600 mb-2">
              Viable dates ({viableDates.length})
            </p>
            <div className="flex flex-wrap gap-1.5">
              {viableDates.map((d) => (
                <span
                  key={d.planDateId}
                  className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200/60"
                >
                  {formatDate(d.date)}
                </span>
              ))}
            </div>
          </div>
        )}

        {eliminatedDates.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-rose-500 mb-2">
              Eliminated ({eliminatedDates.length})
            </p>
            <div className="flex flex-wrap gap-1.5">
              {eliminatedDates.map((d) => (
                <span
                  key={d.planDateId}
                  className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium bg-rose-50 text-rose-400 ring-1 ring-rose-200/40 line-through"
                >
                  {formatDate(d.date)}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
