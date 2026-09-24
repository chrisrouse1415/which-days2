import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { DateHeading, DateTile } from './AvailabilityGrid'
import { formatDate } from '../lib/format-date'

/**
 * Landing-page hero: a looping, non-interactive replay of the participant view.
 * It reuses the real date tiles and pencil line, so what visitors see here is
 * what they'll get: you cross off the days you can't make, everyone else's
 * "can't"s arrive, the open days narrow down, and the organizer picks the one
 * that's left.
 */

// June 2026: Thursday 11 → Tuesday 16
const DATES = ['2026-06-11', '2026-06-12', '2026-06-13', '2026-06-14', '2026-06-15', '2026-06-16']
const [THU, FRI, SAT, SUN, MON, TUE] = [0, 1, 2, 3, 4, 5]

interface DayState {
  /** Who crossed this day off. Once anyone has, it's gone for everyone, so there's only ever one. */
  crossedOffBy: 'you' | string | null
}
interface DemoState {
  days: DayState[]
  cursor: number | 'rest' | 'off'
  tapping: boolean
  /** The tile you just crossed off, which gets the little pencil-press dip */
  pressed: number | null
  picked: number | null
}

const START: DemoState = {
  days: DATES.map(() => ({ crossedOffBy: null })),
  cursor: 'off',
  tapping: false,
  pressed: null,
  picked: null,
}

const setDay = (s: DemoState, i: number, patch: Partial<DayState>): DemoState => ({
  ...s,
  days: s.days.map((d, j) => (j === i ? { ...d, ...patch } : d)),
})
const othersCant = (i: number, name: string) => (s: DemoState) => setDay(s, i, { crossedOffBy: name })
const crossOff = (i: number) => (s: DemoState) =>
  setDay({ ...s, tapping: false, pressed: i }, i, { crossedOffBy: 'you' })

// [ms from loop start, what happens]
const SCRIPT: [number, (s: DemoState) => DemoState][] = [
  [500, (s) => ({ ...s, cursor: THU })],
  [1250, (s) => ({ ...s, tapping: true })],
  [1400, crossOff(THU)],
  [2000, (s) => ({ ...s, cursor: SUN })],
  [2750, (s) => ({ ...s, tapping: true })],
  [2900, crossOff(SUN)],
  [3400, (s) => ({ ...s, cursor: 'rest' })],
  [4000, othersCant(FRI, 'Sam')],
  [4800, othersCant(TUE, 'Priya')],
  [5600, othersCant(MON, 'Sam')],
  [6600, (s) => ({ ...s, picked: SAT })],
  [10100, () => START],
]
const LOOP_MS = 10900

// What reduced-motion visitors see: the end of the story, standing still
const FINAL = SCRIPT.slice(0, -1).reduce((s, [, step]) => step(s), START)

function Cursor({ tapping }: { tapping: boolean }) {
  return (
    <svg
      viewBox="0 0 20 24"
      className={`h-5 w-5 drop-shadow transition-transform duration-150 ${tapping ? 'scale-75' : ''}`}
      style={{ transformOrigin: '2px 2px' }}
    >
      <path d="M2 2 L2 19 L6.5 15 L9.5 21.5 L12.5 20 L9.5 13.5 L15.5 13.5 Z" className="fill-ink stroke-white" strokeWidth="1.5" strokeLinejoin="round" />
    </svg>
  )
}

export default function CrossOffDemo() {
  const [state, setState] = useState<DemoState>(START)
  const [still, setStill] = useState(false)
  const [hidden, setHidden] = useState(false)
  const [cursorAt, setCursorAt] = useState({ x: 0, y: 0 })
  const containerRef = useRef<HTMLDivElement>(null)
  const buttonRefs = useRef<(HTMLDivElement | null)[]>([])

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

  // Aim the cursor at the target's "Cross off" button, or park it off to the side
  useLayoutEffect(() => {
    const box = containerRef.current?.getBoundingClientRect()
    if (!box) return
    const target = typeof state.cursor === 'number' ? buttonRefs.current[state.cursor] : null
    if (target) {
      const r = target.getBoundingClientRect()
      setCursorAt({ x: r.left - box.left + r.width * 0.55, y: r.top - box.top + r.height * 0.5 })
    } else if (state.cursor === 'rest') {
      setCursorAt({ x: box.width - 28, y: box.height - 36 })
    } else {
      setCursorAt({ x: box.width * 0.6, y: box.height + 20 })
    }
  }, [state.cursor])

  const open = state.days.map((d, i) => ({ d, i })).filter(({ d }) => !d.crossedOffBy)

  return (
    <div
      ref={containerRef}
      className="pointer-events-none relative w-full max-w-[24rem] shrink-0 select-none self-center sm:self-auto"
      aria-hidden="true"
    >
      <div className="card p-4 shadow-raised sm:p-5">
        <p className="font-display text-lg font-semibold tracking-tight text-ink">Games night</p>
        <p className="text-xs text-stone-500">Organized by Alex</p>

        <p className="section-label mt-4">Your availability</p>

        <div className="mt-3 grid grid-cols-3 gap-2">
          {state.days.map((day, i) => {
            const crossedOff = day.crossedOffBy !== null
            const byOther = crossedOff && day.crossedOffBy !== 'you'
            const picked = state.picked === i
            return (
              <div
                key={DATES[i]}
                className={`rounded-xl transition-shadow duration-500 ${picked ? 'shadow-[0_0_0_2px] shadow-pine-500' : ''}`}
              >
                <DateTile eliminated={crossedOff} pressed={state.pressed === i}>
                  <DateHeading date={DATES[i]} eliminated={crossedOff} />
                  {byOther && (
                    <p className="fade-in mb-1.5 truncate text-center text-[11px] text-stone-400">
                      {day.crossedOffBy} can&rsquo;t
                    </p>
                  )}
                  <div className="mt-auto">
                    {picked ? (
                      <p className="fade-in py-1 text-center text-[11px] font-medium text-pine-600">Picked</p>
                    ) : day.crossedOffBy === 'you' ? (
                      <p className="py-1 text-center text-[11px] text-stone-400">You can&rsquo;t</p>
                    ) : crossedOff ? null : (
                      <div
                        ref={(el) => {
                          buttonRefs.current[i] = el
                        }}
                        className={`flex min-h-[32px] w-full items-center justify-center gap-1 whitespace-nowrap rounded-lg border px-1 py-1 text-xs font-semibold transition-colors duration-150 ${
                          state.cursor === i
                            ? 'border-cut-200 bg-cut-50 text-cut-600'
                            : 'border-stone-300 bg-white text-ink'
                        }`}
                      >
                        <svg
                          viewBox="0 0 12 12"
                          className={`h-3 w-3 transition-colors ${state.cursor === i ? 'text-cut-500' : 'text-stone-400'}`}
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

        <div className="mt-4 min-h-[4.75rem] border-t border-stone-100 pt-3">
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
                {open.map(({ i }) => (
                  <span
                    key={DATES[i]}
                    className="inline-flex items-center rounded-md border border-pine-200 bg-pine-50 px-2 py-0.5 text-[11px] font-semibold text-pine-800"
                  >
                    {formatDate(DATES[i])}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {!still && (
        <div
          className={`absolute left-0 top-0 z-10 transition-[transform,opacity] duration-700 ease-in-out ${
            state.cursor === 'off' ? 'opacity-0' : 'opacity-100'
          }`}
          style={{ transform: `translate(${cursorAt.x}px, ${cursorAt.y}px)` }}
        >
          <Cursor tapping={state.tapping} />
        </div>
      )}
    </div>
  )
}
