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
      <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide">Summary</h3>

      <div className="bg-white border border-gray-200 rounded-lg p-4 space-y-3">
        <div className="text-sm text-gray-600 space-y-1">
          <p>
            <span className="font-medium text-gray-900">{doneCount}</span> of{' '}
            <span className="font-medium text-gray-900">{participantCount}</span> participant
            {participantCount !== 1 ? 's' : ''} done
          </p>
          {doneNames.length > 0 && (
            <p className="text-xs text-green-700">
              Done: {doneNames.join(', ')}
            </p>
          )}
          {notDoneNames.length > 0 && (
            <p className="text-xs text-gray-400">
              Waiting on: {notDoneNames.join(', ')}
            </p>
          )}
        </div>

        {viableDates.length === 0 && eliminatedDates.length > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-md p-3" role="alert">
            <p className="text-sm font-medium text-amber-800">
              All dates have been eliminated. The plan owner can reopen dates if needed.
            </p>
          </div>
        )}

        {doneCount === participantCount &&
          participantCount > 0 &&
          viableDates.length > 0 && (
            <div className="bg-green-50 border border-green-200 rounded-md p-3" role="alert">
              <p className="text-sm font-medium text-green-800">
                Everyone&apos;s done! {viableDates.length} date{viableDates.length !== 1 ? 's' : ''} work
                {viableDates.length === 1 ? 's' : ''} for the group.
              </p>
            </div>
          )}

        {viableDates.length > 0 && (
          <div>
            <p className="text-xs font-medium text-green-700 mb-1">
              Viable dates ({viableDates.length})
            </p>
            <div className="flex flex-wrap gap-2">
              {viableDates.map((d) => (
                <span
                  key={d.planDateId}
                  className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-green-100 text-green-800"
                >
                  {formatDate(d.date)}
                </span>
              ))}
            </div>
          </div>
        )}

        {eliminatedDates.length > 0 && (
          <div>
            <p className="text-xs font-medium text-red-700 mb-1">
              Eliminated ({eliminatedDates.length})
            </p>
            <div className="flex flex-wrap gap-2">
              {eliminatedDates.map((d) => (
                <span
                  key={d.planDateId}
                  className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-red-100 text-red-800 line-through"
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
