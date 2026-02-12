import ForceReopenButton from './ForceReopenButton'

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

function StatusBadge({ status }: { status: string }) {
  if (status === 'viable' || status === 'reopened') {
    return (
      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
        {status === 'reopened' ? 'reopened' : 'viable'}
      </span>
    )
  }
  if (status === 'eliminated') {
    return (
      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800">
        eliminated
      </span>
    )
  }
  if (status === 'locked') {
    return (
      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
        locked
      </span>
    )
  }
  return null
}

export default function ResultsMatrix({
  planId,
  planStatus,
  dates,
  participants,
  matrix,
  onDataRefresh,
}: ResultsMatrixProps) {
  if (dates.length === 0) {
    return <p className="text-sm text-gray-400">No dates in this plan.</p>
  }

  if (participants.length === 0) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-8 text-center">
        <p className="text-sm text-gray-500">No participants yet. Share the link to get started.</p>
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-sm border border-gray-200 rounded-lg overflow-hidden">
        <thead>
          <tr className="bg-gray-50">
            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wide border-b border-gray-200 sticky left-0 bg-gray-50 z-10">
              Date
            </th>
            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wide border-b border-gray-200">
              Status
            </th>
            {participants.map((p) => (
              <th
                key={p.id}
                className="px-3 py-2 text-center text-xs font-medium text-gray-500 border-b border-gray-200"
              >
                <span className="block">{p.display_name}</span>
                {p.is_done && (
                  <span className="text-green-600 text-xs font-normal">done</span>
                )}
              </th>
            ))}
            {planStatus === 'active' && (
              <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 border-b border-gray-200">
                Actions
              </th>
            )}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          {dates.map((date) => {
            const isEliminated = date.status === 'eliminated'
            return (
              <tr key={date.id} className={isEliminated ? 'bg-gray-50' : 'bg-white'}>
                <td className={`px-3 py-2 font-medium whitespace-nowrap sticky left-0 z-10 ${isEliminated ? 'text-gray-400 line-through bg-gray-50' : 'text-gray-900 bg-white'}`}>
                  {formatDate(date.date)}
                </td>
                <td className="px-3 py-2">
                  <StatusBadge status={date.status} />
                </td>
                {participants.map((p) => {
                  const status = matrix[date.id]?.[p.id] ?? 'available'
                  return (
                    <td key={p.id} className="px-3 py-2 text-center">
                      {status === 'unavailable' ? (
                        <span className="text-red-500" title="Unavailable">
                          &#x2717;
                        </span>
                      ) : (
                        <span className="text-green-500" title="Available">
                          &#x2713;
                        </span>
                      )}
                    </td>
                  )
                })}
                {planStatus === 'active' && (
                  <td className="px-3 py-2 text-center min-w-[44px] min-h-[44px]">
                    {date.status === 'eliminated' && (
                      <ForceReopenButton
                        planId={planId}
                        planDateId={date.id}
                        dateLabel={formatDate(date.date)}
                        onReopened={onDataRefresh}
                      />
                    )}
                  </td>
                )}
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
