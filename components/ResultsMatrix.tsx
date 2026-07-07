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
  onDataRefresh: () => void
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
    return <p className="text-sm text-stone-400">No dates in this plan.</p>
  }

  if (participants.length === 0) {
    return (
      <div className="card p-8 text-center">
        <p className="text-sm font-medium text-ink">No responses yet</p>
        <p className="mt-1 text-sm text-stone-500">
          Share the link above &mdash; responses appear here as they come in.
        </p>
      </div>
    )
  }

  return (
    <div className="card overflow-x-auto">
      <table className="min-w-full text-sm">
        <thead>
          <tr className="bg-stone-50">
            <th className="sticky left-0 z-10 border-b border-stone-200 bg-stone-50 px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-stone-500">
              Date
            </th>
            <th className="border-b border-stone-200 px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-stone-500">
              Status
            </th>
            {participants.map((p) => (
              <th
                key={p.id}
                className="border-b border-stone-200 px-3 py-2.5 text-center text-xs font-semibold text-stone-600"
              >
                <span className="block">{p.display_name}</span>
                {p.is_done && <span className="text-xs font-medium text-pine-600">done</span>}
              </th>
            ))}
            {planStatus === 'active' && (
              <th className="border-b border-stone-200 px-3 py-2.5 text-center text-xs font-semibold uppercase tracking-wider text-stone-500">
                Actions
              </th>
            )}
          </tr>
        </thead>
        <tbody className="divide-y divide-stone-100">
          {dates.map((date) => {
            const isEliminated = date.status === 'eliminated'
            return (
              <tr key={date.id} className={isEliminated ? 'bg-stone-50' : 'bg-white'}>
                <td
                  className={`sticky left-0 z-10 whitespace-nowrap px-3 py-2.5 font-semibold ${
                    isEliminated ? 'struck bg-stone-50' : 'bg-white text-ink'
                  }`}
                >
                  {formatDate(date.date)}
                </td>
                <td className="px-3 py-2.5">
                  <StatusBadge status={date.status} />
                </td>
                {participants.map((p) => {
                  const status = matrix[date.id]?.[p.id] ?? 'available'
                  return (
                    <td key={p.id} className="px-3 py-2.5 text-center">
                      {status === 'unavailable' ? (
                        <span className="font-medium text-cut-500" title="Unavailable" aria-label="Unavailable">
                          &#x2717;
                        </span>
                      ) : (
                        <span className="font-medium text-pine-600" title="Available" aria-label="Available">
                          &#x2713;
                        </span>
                      )}
                    </td>
                  )
                })}
                {planStatus === 'active' && (
                  <td className="min-h-[44px] min-w-[44px] px-3 py-2.5 text-center">
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
