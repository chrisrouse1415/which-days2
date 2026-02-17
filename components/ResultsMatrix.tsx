import ForceReopenButton from './ForceReopenButton'
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

function StatusBadge({ status }: { status: string }) {
  if (status === 'viable' || status === 'reopened') {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-lg text-xs font-semibold bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200/60">
        {status === 'reopened' ? 'reopened' : 'viable'}
      </span>
    )
  }
  if (status === 'eliminated') {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-lg text-xs font-semibold bg-rose-50 text-rose-600 ring-1 ring-rose-200/60">
        eliminated
      </span>
    )
  }
  if (status === 'locked') {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-lg text-xs font-semibold bg-slate-50 text-slate-600 ring-1 ring-slate-200">
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
    return <p className="text-sm text-slate-400">No dates in this plan.</p>
  }

  if (participants.length === 0) {
    return (
      <div className="bg-white/80 backdrop-blur-sm border border-white/80 rounded-2xl p-8 text-center shadow-warm">
        <p className="text-sm text-slate-500">No participants yet. Share the link to get started.</p>
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-sm border border-slate-200/60 rounded-2xl overflow-hidden shadow-warm">
        <thead>
          <tr className="bg-slate-50/80">
            <th className="px-3 py-2.5 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider border-b border-slate-200/60 sticky left-0 bg-slate-50/80 z-10">
              Date
            </th>
            <th className="px-3 py-2.5 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider border-b border-slate-200/60">
              Status
            </th>
            {participants.map((p) => (
              <th
                key={p.id}
                className="px-3 py-2.5 text-center text-xs font-semibold text-slate-500 border-b border-slate-200/60"
              >
                <span className="block">{p.display_name}</span>
                {p.is_done && (
                  <span className="text-violet-500 text-xs font-medium">done</span>
                )}
              </th>
            ))}
            {planStatus === 'active' && (
              <th className="px-3 py-2.5 text-center text-xs font-semibold text-slate-400 border-b border-slate-200/60">
                Actions
              </th>
            )}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200/40">
          {dates.map((date) => {
            const isEliminated = date.status === 'eliminated'
            return (
              <tr key={date.id} className={isEliminated ? 'bg-slate-50/40' : 'bg-white/60'}>
                <td className={`px-3 py-2.5 font-semibold whitespace-nowrap sticky left-0 z-10 ${isEliminated ? 'text-slate-400 line-through bg-slate-50/40' : 'text-slate-800 bg-white/60'}`}>
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
                        <span className="text-rose-400" title="Unavailable">
                          &#x2717;
                        </span>
                      ) : (
                        <span className="text-emerald-500" title="Available">
                          &#x2713;
                        </span>
                      )}
                    </td>
                  )
                })}
                {planStatus === 'active' && (
                  <td className="px-3 py-2.5 text-center min-w-[44px] min-h-[44px]">
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
