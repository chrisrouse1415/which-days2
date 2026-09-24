import { useEffect, useState } from 'react'
import { DateHeading, DateTile } from './AvailabilityGrid'
import { formatDate } from '../lib/format-date'

/**
 * Landing-page hero: a looping, non-interactive replay of a plan filling in.
 * It reuses the real date tiles and pencil line, so what visitors see here is
 * what they'll get: friends' "can't"s arrive one at a time and cross days off,
 * a couple of days are left open, and the organizer picks one. Then the days
 * and summary fade out and back in at the start, while the card itself stays
 * put, rather than visibly rewinding.
 *
 * Everything runs at half the app's own speed (see `.demo-slow` in globals.css)
 * so it can be followed at a glance, and every tile keeps the same height
 * whatever it shows, so nothing on the page shifts as the loop plays.
 */

// June 2026: Thursday 11 → Tuesday 16
const DATES = ['2026-06-11', '2026-06-12', '2026-06-13', '2026-06-14', '2026-06-15', '2026-06-16']
const [THU, FRI, SAT, SUN, , TUE] = DATES.map((_, i) => i)

interface DemoState {
  /** Who crossed each day off. Once anyone has, it's gone for everyone, so there's only ever one. */
  crossedOffBy: (string | null)[]
  picked: number | null
  /** A "Cross off" button being pressed right now, just before its day is crossed off */
  pressing: number | null
  /** The day just crossed off, which gets the real app's little tile dip */
  justCrossed: number | null
  fading: boolean
  /** Bumped each loop so the card's contents remount fresh (and fade in) instead of rewinding */
  cycle: number
}

const press = (i: number) => (s: DemoState): DemoState => ({ ...s, pressing: i })
const cant = (i: number, name: string) => (s: DemoState): DemoState => ({
  ...s,
  pressing: null,
  justCrossed: i,
  crossedOffBy: s.crossedOffBy.map((by, j) => (j === i ? name : by)),
})

// Each loop starts part-way through, with a couple of days already crossed off
const START: DemoState = {
  crossedOffBy: DATES.map((_, i) => (i === THU ? 'Herbie' : i === FRI ? 'Barney' : null)),
  picked: null,
  pressing: null,
  justCrossed: null,
  fading: false,
  cycle: 0,
}

const LOOP_MS = 14000

// [ms from loop start, what happens]
const SCRIPT: [number, (s: DemoState) => DemoState][] = [
  [1400, press(SUN)],
  [2000, cant(SUN, 'Giulia')],
  [3400, press(TUE)],
  [4000, cant(TUE, 'Clare')],
  // Sat and Mon are still open; the organizer picks Saturday
  [6800, (s) => ({ ...s, picked: SAT })],
  [12800, (s) => ({ ...s, fading: true })],
  [LOOP_MS, (s) => ({ ...START, cycle: s.cycle + 1 })],
]

// What reduced-motion visitors see: the end of the story, standing still
const FINAL = SCRIPT.slice(0, -2).reduce((s, [, step]) => step(s), START)

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
      className="demo-slow pointer-events-none w-full max-w-[24rem] shrink-0 select-none self-center sm:self-auto"
      aria-hidden="true"
    >
      <div className="card p-4 shadow-raised sm:p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="font-display text-lg font-semibold tracking-tight text-ink">Games night 🎲</p>
            <p className="text-xs text-stone-500">Organized by Chris</p>
          </div>
          {/* Says outright that this is an illustration, not something to click */}
          <span className="mt-1 shrink-0 rounded-full bg-stone-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-stone-500">
            Example
          </span>
        </div>

        <p className="section-label mt-4">Your availability</p>

        {/* Only this part fades between loops; the card and its header stay put */}
        <div
          key={state.cycle}
          className={`fade-in transition-opacity duration-1000 ${state.fading ? 'opacity-0' : ''}`}
        >
          <div className="mt-3 grid grid-cols-3 gap-2">
            {DATES.map((date, i) => {
              const by = state.crossedOffBy[i]
              const picked = state.picked === i
              return (
                <div
                  key={date}
                  className={`rounded-xl transition-shadow duration-500 ${picked ? 'shadow-[0_0_0_2px] shadow-pine-500' : ''}`}
                >
                  <DateTile eliminated={!!by} pressed={state.justCrossed === i}>
                    <DateHeading date={date} eliminated={!!by} />
                    {/* One fixed-height line for whatever the tile says, so tiles never change size */}
                    <div className="mt-auto flex h-8 items-center justify-center">
                      {by ? (
                        <p key="by" className="fade-in truncate text-[11px] text-stone-400">
                          {by} can&rsquo;t
                        </p>
                      ) : picked ? (
                        <p key="picked" className="fade-in text-[11px] font-medium text-pine-600">Picked</p>
                      ) : state.picked !== null ? (
                        // Once a day is picked the plan is closed, so the other open days lose their button
                        <p key="open" className="fade-in text-[11px] font-medium text-pine-600">Open</p>
                      ) : (
                        <div
                          className={`flex h-8 w-full items-center justify-center gap-1 whitespace-nowrap rounded-lg border px-1 text-xs font-semibold transition duration-300 ${
                            state.pressing === i
                              ? 'scale-95 border-cut-200 bg-cut-50 text-cut-600'
                              : 'border-stone-300 bg-white text-ink'
                          }`}
                        >
                          <svg
                            viewBox="0 0 12 12"
                            className={`h-3 w-3 transition-colors duration-300 ${state.pressing === i ? 'text-cut-500' : 'text-stone-400'}`}
                          >
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

          <div className="mt-4 h-[5.5rem] border-t border-stone-100 pt-3">
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
    </div>
  )
}
