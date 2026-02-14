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
  const notDoneNames = participants.filter((p) => !p.is_done).map((p) => p.display_name)
  const viableDates = availabilitySummary.filter(
    (d) => d.status === 'viable' || d.status === 'reopened'
  )
  const eliminatedDates = availabilitySummary.filter((d) => d.status === 'eliminated')

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-medium text-slate-500 uppercase tracking-wide"><span role="img" aria-label="Summary">📊</span> Summary</h3>

      <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-3 shadow-sm">
        <div className="text-sm text-slate-600 space-y-1">
          <p>
            <span className="font-medium text-slate-900">{doneCount}</span> of{' '}
            <span className="font-medium text-slate-900">{participantCount}</span> participant
            {participantCount !== 1 ? 's' : ''} done
          </p>
          {doneNames.length > 0 && (
            <p className="text-xs text-emerald-700">
              Done: {doneNames.join(', ')}
            </p>
          )}
          {notDoneNames.length > 0 && (
            <p className="text-xs text-slate-400">
              Waiting for: {notDoneNames.join(', ')}
            </p>
          )}
        </div>

        {viableDates.length === 0 && eliminatedDates.length > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3" role="alert">
            <p className="text-sm font-medium text-amber-800">
              All dates have been eliminated. The plan owner can reopen dates if needed.
            </p>
          </div>
        )}

        {doneCount === participantCount &&
          participantCount > 0 &&
          viableDates.length > 0 && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3" role="alert">
              <p className="text-sm font-medium text-emerald-800">
                Everyone&apos;s done! {viableDates.length} date{viableDates.length !== 1 ? 's' : ''} work
                {viableDates.length === 1 ? 's' : ''} for the group.
              </p>
            </div>
          )}

        {viableDates.length > 0 && (
          <div>
            <p className="text-xs font-medium text-emerald-700 mb-1">
              Viable dates ({viableDates.length})
            </p>
            <div className="flex flex-wrap gap-2">
              {viableDates.map((d) => (
                <span
                  key={d.planDateId}
                  className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-emerald-100 text-emerald-800"
                >
                  {formatDate(d.date)}
                </span>
              ))}
            </div>
          </div>
        )}

        {eliminatedDates.length > 0 && (
          <div>
            <p className="text-xs font-medium text-rose-700 mb-1">
              Eliminated ({eliminatedDates.length})
            </p>
            <div className="flex flex-wrap gap-2">
              {eliminatedDates.map((d) => (
                <span
                  key={d.planDateId}
                  className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-rose-100 text-rose-800 line-through"
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
