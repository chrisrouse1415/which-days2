import Link from 'next/link'
import { DateHeading, DateTile } from './AvailabilityGrid'
import LiveSummary from './LiveSummary'

interface DateSummary {
  planDateId: string
  date: string
  status: 'viable' | 'eliminated' | 'locked' | 'reopened'
  unavailableCount: number
  unavailableBy: Array<{ participantId: string; displayName: string }>
}

interface OrganizerViewProps {
  planId: string
  title: string
  participants: Array<{ id: string; display_name: string; is_done: boolean }>
  availabilitySummary: DateSummary[]
  onCrossOffToo: () => void
}

/**
 * What a signed-in organizer sees on their own share link: the plan as their group
 * sees it, read-only, without having to join. Joining to cross off days is optional.
 */
export default function OrganizerView({
  planId,
  title,
  participants,
  availabilitySummary,
  onCrossOffToo,
}: OrganizerViewProps) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold tracking-tight text-ink">{title}</h1>
        <p className="mt-1 text-sm text-stone-500">Organized by you</p>
      </div>

      <div className="rounded-xl border border-pine-200 bg-pine-50 p-4">
        <p className="text-sm font-semibold text-pine-800">This is your plan</p>
        <p className="mt-1 text-sm text-pine-800/80">
          You chose these dates, so you&rsquo;re counted as free on all of them. This is what your
          group sees.
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Link href={`/manage/${planId}`} className="btn-primary !px-3.5 !py-1.5">
            Manage plan
          </Link>
          <button onClick={onCrossOffToo} className="btn-secondary !px-3.5 !py-1.5">
            Cross off days yourself
          </button>
        </div>
      </div>

      <div className="space-y-3">
        <h3 className="section-label">Days</h3>
        <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-4">
          {availabilitySummary.map((date) => {
            const crossedOff = date.status === 'eliminated'
            return (
              <DateTile key={date.planDateId} eliminated={crossedOff}>
                <DateHeading date={date.date} eliminated={crossedOff} />
                <p className="mt-auto truncate py-1 text-center text-[11px] text-stone-400">
                  {date.unavailableBy.length > 0 ? (
                    <>{date.unavailableBy.map((u) => u.displayName).join(', ')} can&rsquo;t</>
                  ) : (
                    <span className="font-medium text-pine-600">Open</span>
                  )}
                </p>
              </DateTile>
            )
          })}
        </div>
      </div>

      <LiveSummary participants={participants} availabilitySummary={availabilitySummary} />
    </div>
  )
}
