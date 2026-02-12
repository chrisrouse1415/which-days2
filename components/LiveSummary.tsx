interface DateSummary {
  planDateId: string
  date: string
  status: 'viable' | 'eliminated' | 'locked' | 'reopened'
  unavailableCount: number
  unavailableBy: Array<{ participantId: string; displayName: string }>
}

interface LiveSummaryProps {
  participantCount: number
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
  participantCount,
  doneCount,
  availabilitySummary,
}: LiveSummaryProps) {
  const viableDates = availabilitySummary.filter(
    (d) => d.status === 'viable' || d.status === 'reopened'
  )
  const eliminatedDates = availabilitySummary.filter((d) => d.status === 'eliminated')

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide">Summary</h3>

      <div className="bg-white border border-gray-200 rounded-lg p-4 space-y-3">
        <p className="text-sm text-gray-600">
          <span className="font-medium text-gray-900">{doneCount}</span> of{' '}
          <span className="font-medium text-gray-900">{participantCount}</span> participant
          {participantCount !== 1 ? 's' : ''} done
        </p>

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
