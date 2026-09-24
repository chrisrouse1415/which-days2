import { useEffect, useRef, useState } from 'react'

/**
 * Landing-page hero: a desk flip calendar that pages through candidate days
 * (about 30% smaller on mobile).
 * A red pencil strikes out each day that doesn't work, the page flips over the
 * rings and the pad gets thinner, until the day that works for everyone gets
 * circled in green. Then a fresh pad drops in and it starts again.
 */

interface Day {
  weekday: string
  date: number
  note: string
  works?: boolean
}

const DAYS: Day[] = [
  { weekday: 'Thursday', date: 11, note: 'Sam can’t' },
  { weekday: 'Friday', date: 12, note: 'Priya can’t' },
  { weekday: 'Saturday', date: 13, note: 'Works for everyone', works: true },
]
const SURVIVOR = DAYS.findIndex((d) => d.works)
const LAST = DAYS.length - 1

// Ink paths live in a 100 × 80 box laid over the date numeral
const STRIKE_PATH = 'M4 56 Q48 40 96 26'
const CIRCLE_PATH = 'M52 6 C22 4 6 22 8 42 C10 64 34 76 58 73 C82 70 95 54 92 34 C89 15 70 5 44 9'

type Phase = 'idle' | 'drawing' | 'marked' | 'flipping' | 'resetting'

const BEFORE_MARK_MS = 600
const STRIKE_MS = 520
const CIRCLE_MS = 1100
const HOLD_STRUCK_MS = 1000
const HOLD_WORKS_MS = 2800
const FLIP_MS = 700
const RESET_MS = 500

const easeInOut = (t: number) => (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2)

/** 0 → 1 over `duration` while `active`, driven by animation frames. */
function useDrawProgress(active: boolean, duration: number) {
  const [progress, setProgress] = useState(0)
  useEffect(() => {
    if (!active) {
      setProgress(0)
      return
    }
    let frame = 0
    const start = performance.now()
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration)
      setProgress(easeInOut(t))
      if (t < 1) frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [active, duration])
  return progress
}

/** A colored pencil whose lead tip sits at the element's top-left corner. */
function Pencil({ works }: { works?: boolean }) {
  const body = works ? 'fill-pine-600' : 'fill-cut-500'
  return (
    <svg viewBox="0 0 40 40" className="absolute left-0 top-0 h-9 w-9 -translate-y-full overflow-visible sm:h-12 sm:w-12">
      {/* Held at 45°, tip at bottom-left (0, 40) */}
      <g transform="rotate(-45 0 40)">
        <path d="M0 40 L7 36.5 L7 43.5 Z" className="fill-amber-100" />
        <path d="M0 40 L2.6 38.7 L2.6 41.3 Z" className={body} />
        <rect x="7" y="36.5" width="36" height="7" rx="0.5" className={body} />
        <rect x="7" y="39.2" width="36" height="1.4" className="fill-black/10" />
        <rect x="43" y="36.5" width="4" height="7" className="fill-stone-300" />
        <rect x="47" y="36.5" width="6" height="7" rx="1.5" className="fill-rose-200" />
      </g>
    </svg>
  )
}

function Ink({ day, drawing, marked }: { day: Day; drawing: boolean; marked: boolean }) {
  const pathRef = useRef<SVGPathElement>(null)
  const progress = useDrawProgress(drawing, day.works ? CIRCLE_MS : STRIKE_MS)
  const shown = marked ? 1 : progress

  // Where the pencil tip is right now, as a fraction of the ink box
  let tip = { x: 0, y: 0 }
  const path = pathRef.current
  if (path) {
    const p = path.getPointAtLength(shown * path.getTotalLength())
    tip = { x: p.x / 100, y: p.y / 80 }
  }

  return (
    <div className="pointer-events-none absolute -inset-x-4 -inset-y-3">
      <svg viewBox="0 0 100 80" preserveAspectRatio="none" className="h-full w-full overflow-visible">
        <path
          ref={pathRef}
          d={day.works ? CIRCLE_PATH : STRIKE_PATH}
          pathLength={1}
          strokeDasharray="1 2"
          strokeDashoffset={1 - shown}
          className={`fill-none ${day.works ? 'stroke-pine-600' : 'stroke-cut-500'}`}
          strokeWidth={day.works ? 2.5 : 3.5}
          strokeLinecap="round"
        />
      </svg>
      <div
        className={`flip-pencil absolute ${drawing ? 'flip-pencil-down' : ''}`}
        style={{ left: `${tip.x * 100}%`, top: `${tip.y * 100}%` }}
      >
        <Pencil works={day.works} />
      </div>
    </div>
  )
}

function Page({
  day,
  phase,
  className = '',
}: {
  day: Day
  phase: Phase
  className?: string
}) {
  const marked = phase === 'marked' || phase === 'flipping' || phase === 'resetting'

  return (
    <div className={`flip-page card absolute inset-0 flex flex-col ${className}`}>
      <div className="rounded-t-[11px] bg-ink py-1.5 text-center text-[9px] font-semibold uppercase tracking-[0.2em] text-white/90 sm:py-2 sm:text-[11px]">
        June
      </div>
      <div className="flex flex-1 flex-col items-center justify-center px-3 pb-3 pt-2 sm:px-4 sm:pb-4 sm:pt-3">
        <p className="section-label !text-[10px] sm:!text-xs">{day.weekday}</p>
        <div className="relative mt-1">
          <p className="font-display text-5xl font-semibold leading-none tracking-tight text-ink tabular-nums sm:text-7xl">
            {day.date}
          </p>
          <Ink day={day} drawing={phase === 'drawing'} marked={marked} />
        </div>
        <p
          className={`flip-note mt-2.5 text-[10px] font-semibold sm:mt-4 sm:text-xs ${
            day.works ? 'text-pine-600' : 'text-cut-600'
          } ${marked ? 'flip-note-written' : ''}`}
        >
          {day.note}
        </p>
      </div>
      {/* Darkens as the page turns away from the light */}
      <div className="flip-shade pointer-events-none absolute inset-0 bg-gradient-to-b from-ink/25 to-ink/5" />
    </div>
  )
}

export default function FlipCalendar() {
  const [index, setIndex] = useState(0)
  const [phase, setPhase] = useState<Phase>('idle')
  const [still, setStill] = useState(false)
  const [hidden, setHidden] = useState(false)

  useEffect(() => {
    const onVisibility = () => setHidden(document.hidden)
    document.addEventListener('visibilitychange', onVisibility)
    return () => document.removeEventListener('visibilitychange', onVisibility)
  }, [])

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setStill(true)
      setIndex(SURVIVOR)
      setPhase('marked')
    }
  }, [])

  useEffect(() => {
    if (still || hidden) return
    const works = DAYS[index].works
    const steps: Record<Phase, [number, () => void]> = {
      idle: [BEFORE_MARK_MS, () => setPhase('drawing')],
      drawing: [works ? CIRCLE_MS : STRIKE_MS, () => setPhase('marked')],
      marked: [
        works ? HOLD_WORKS_MS : HOLD_STRUCK_MS,
        () => setPhase(index === LAST ? 'resetting' : 'flipping'),
      ],
      flipping: [
        FLIP_MS,
        () => {
          setIndex((i) => i + 1)
          setPhase('idle')
        },
      ],
      resetting: [
        RESET_MS,
        () => {
          setIndex(0)
          setPhase('idle')
        },
      ],
    }
    const [delay, next] = steps[phase]
    const t = setTimeout(next, delay)
    return () => clearTimeout(t)
  }, [index, phase, still, hidden])

  // Pages still underneath the current one; each flip tears one off the pad
  const pagesBelow = LAST - index
  const upNext = index < LAST ? DAYS[index + 1] : null

  return (
    <div
      className={`flip-pad relative w-32 shrink-0 select-none self-center sm:w-44 sm:self-auto ${
        phase === 'resetting' ? 'flip-pad-out' : 'flip-pad-in'
      }`}
      key={phase === 'resetting' ? 'out' : 'pad'}
      aria-hidden="true"
    >
      {/* Soft shadow on the desk */}
      <div className="absolute inset-x-3 -bottom-6 h-6 rounded-[50%] bg-ink/10 blur-md" />

      {/* Binder rings */}
      <div className="absolute -top-2 left-0 right-0 z-20 flex justify-center gap-11 sm:gap-16">
        <span className="h-5 w-2 rounded-full border-2 border-stone-400 bg-paper" />
        <span className="h-5 w-2 rounded-full border-2 border-stone-400 bg-paper" />
      </div>

      {/* Cardboard back, then one sliver per page left in the pad */}
      <div className="absolute inset-x-2 -bottom-3 h-full rounded-xl border border-stone-300 bg-stone-200" />
      <div
        className={`flip-sliver absolute inset-x-1 -bottom-1.5 h-full rounded-xl border border-stone-200 bg-white ${
          pagesBelow >= 2 ? '' : 'flip-sliver-gone'
        }`}
      />

      <div className="relative h-40 [perspective:700px] sm:h-56">
        {upNext && (
          <div className="absolute inset-0">
            <Page day={upNext} phase="idle" />
            {/* Shadow of the turning page falling across the next one */}
            {phase === 'flipping' && (
              <div className="flip-cast pointer-events-none absolute inset-0 rounded-xl bg-gradient-to-b from-ink/20 to-transparent" />
            )}
          </div>
        )}
        <Page
          key={index}
          day={DAYS[index]}
          phase={phase}
          className={phase === 'flipping' ? 'flip-page-away' : ''}
        />
      </div>
    </div>
  )
}
