import { useEffect, useState } from 'react'
import { DateHeading, DateTile } from './AvailabilityGrid'
import { formatDate } from '../lib/format-date'

/**
 * Landing-page hero: a looping, non-interactive replay of a plan filling in.
 * It reuses the real date tiles and pencil line, so what visitors see here is
 * what they'll get: friends' "can't"s arrive one at a time and cross days off,
 * a couple of days are left open, and the organizer picks one.
 */

// June 2026: Thursday 11 → Tuesday 16
const DATES = ['2026-06-11', '2026-06-12', '2026-06-13', '2026-06-14', '2026-06-15', '2026-06-16']
const [THU, FRI, SAT, SUN, , TUE] = DATES.map((_, i) => i)

interface DemoState {
  /** Who crossed each day off. Once anyone has, it's gone for everyone, so there's only ever one. */
  crossedOffBy: (string | null)[]
  picked: number | null
}

const START: DemoState = { crossedOffBy: DATES.map(() => null), picked: null }

const cant = (i: number, name: string) => (s: DemoState) => ({
  ...s,
  crossedOffBy: s.crossedOffBy.map((by, j) => (j === i ? name : by)),
})

// [ms from loop start, what happens]
const SCRIPT: [number, (s: DemoState) => DemoState][] = [
  [900, cant(FRI, 'Barney')],
  [1800, cant(SUN, 'Giulia')],
  [2700, cant(TUE, 'Clare')],
  [3600, cant(THU, 'Herbie')],
  // Sat and Mon are still open; the organizer picks Saturday
  [5300, (s) => ({ ...s, picked: SAT })],
  [8800, () => START],
]
const LOOP_MS = 9600

// What reduced-motion visitors see: the end of the story, standing still
const FINAL = SCRIPT.slice(0, -1).reduce((s, [, step]) => step(s), START)

export default function CrossOffDemo() {
  const [state, setState] = useState<DemoState>(START)
  const [still, setStill] = useState(false)
  const [hidden, setHidden] = useState(false)

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setStill(true)
      setState(FINAL)
    }
    // A hidden tab stops the loop; it starts over from the top when visible again
    const onVisibility = () => {
      setHidden(document.hidden)
      if (document.hidden) setState((s) => (s === FINAL ? s : START))
    }
    document.addEventListener('visibilitychange', onVisibility)
    return () => document.removeEventListener('visibilitychange', onVisibility)
  }, [])

  // Play the script on a loop
  useEffect(() => {
    if (still || hidden) return
    let timers: ReturnType<typeof setTimeout>[] = []
    const play = () => {
      timers = SCRIPT.map(([at, step]) => setTimeout(() => setState(step), at))
      timers.push(setTimeout(play, LOOP_MS))
    }
    play()
    return () => timers.forEach(clearTimeout)
  }, [still, hidden])

  const open = DATES.filter((_, i) => !state.crossedOffBy[i])

  return (
    <div
      className="pointer-events-none w-full max-w-[24rem] shrink-0 select-none self-center sm:self-auto"
      aria-hidden="true"
    >
      <div className="card p-4 shadow-raised sm:p-5">
        <p className="font-display text-lg font-semibold tracking-tight text-ink">Games night</p>
        <p className="text-xs text-stone-500">Organized by Chris</p>

        <p className="section-label mt-4">Your availability</p>

        <div className="mt-3 grid grid-cols-3 gap-2">
          {DATES.map((date, i) => {
            const by = state.crossedOffBy[i]
            const picked = state.picked === i
            return (
              <div
                key={date}
                className={`rounded-xl transition-shadow duration-500 ${picked ? 'shadow-[0_0_0_2px] shadow-pine-500' : ''}`}
              >
                <DateTile eliminated={!!by}>
                  <DateHeading date={date} eliminated={!!by} />
                  {by && (
                    <p className="fade-in mb-1.5 truncate text-center text-[11px] text-stone-400">
                      {by} can&rsquo;t
                    </p>
                  )}
                  <div className="mt-auto">
                    {picked ? (
                      <p className="fade-in py-1 text-center text-[11px] font-medium text-pine-600">Picked</p>
                    ) : by ? null : state.picked !== null ? (
                      // Once a day is picked the plan is closed, so the other open days lose their button
                      <p className="fade-in py-1 text-center text-[11px] font-medium text-pine-600">Open</p>
                    ) : (
                      <div className="flex min-h-[32px] w-full items-center justify-center gap-1 whitespace-nowrap rounded-lg border border-stone-300 bg-white px-1 py-1 text-xs font-semibold text-ink">
                        <svg viewBox="0 0 12 12" className="h-3 w-3 text-stone-400">
                          <path d="M1.5 9.5 Q6 6.5 10.5 2.5" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
                        </svg>
                        Cross off
                      </div>
                    )}
                  </div>
                </DateTile>
              </div>
            )
          })}
        </div>

        <div className="mt-4 min-h-[5.5rem] border-t border-stone-100 pt-3">
          {state.picked !== null ? (
            <div key="picked" className="fade-in">
              <p className="text-xs font-semibold text-pine-700">It&rsquo;s happening on</p>
              <p className="mt-1 font-display text-base font-semibold text-ink">
                {formatDate(DATES[state.picked])}
              </p>
            </div>
          ) : (
            <div>
              <p className="text-xs font-semibold text-pine-700">Open ({open.length})</p>
              <div className="mt-1.5 flex flex-wrap gap-1">
                {open.map((date) => (
                  <span
                    key={date}
                    className="inline-flex items-center rounded-md border border-pine-200 bg-pine-50 px-2 py-0.5 text-[11px] font-semibold text-pine-800"
                  >
                    {formatDate(date)}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
