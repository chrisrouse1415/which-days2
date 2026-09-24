import { useEffect, useState } from 'react'

/**
 * Landing-page hero: a desk flip calendar that pages through candidate days
 * (about 30% smaller on mobile).
 * Each day gets struck out in red pencil and flipped away, until the one that
 * works for everyone gets circled and lingers.
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

type Phase = 'idle' | 'marked' | 'flipping'

const BEFORE_MARK_MS = 700
const HOLD_STRUCK_MS = 1100
const HOLD_WORKS_MS = 3000
const FLIP_MS = 650

function Page({ day, phase, className = '' }: { day: Day; phase: Phase; className?: string }) {
  const marked = phase !== 'idle'

  return (
    <div className={`flip-page card absolute inset-0 flex flex-col overflow-hidden ${className}`}>
      <div className="bg-ink py-1.5 text-center text-[9px] font-semibold sm:py-2 sm:text-[11px] uppercase tracking-[0.2em] text-white/90">
        June
      </div>
      <div className="flex flex-1 flex-col items-center justify-center px-3 pb-3 pt-2 sm:px-4 sm:pb-4 sm:pt-3">
        <p className="section-label !text-[10px] sm:!text-xs">{day.weekday}</p>
        <div className="relative mt-1">
          <p className="font-display text-5xl font-semibold sm:text-7xl leading-none tracking-tight text-ink tabular-nums">
            {day.date}
          </p>
          <svg
            viewBox="0 0 100 80"
            preserveAspectRatio="none"
            className="absolute -inset-x-4 -inset-y-3 h-[calc(100%+1.5rem)] w-[calc(100%+2rem)] overflow-visible"
          >
            {day.works ? (
              <path
                d="M52 6 C22 4 6 22 8 42 C10 64 34 76 58 73 C82 70 95 54 92 34 C89 15 70 5 44 9"
                pathLength={1}
                className={`flip-ink stroke-pine-600 ${marked ? 'flip-ink-drawn' : ''}`}
                strokeWidth="2.5"
              />
            ) : (
              <path
                d="M4 56 Q48 40 96 26"
                pathLength={1}
                className={`flip-ink stroke-cut-500 ${marked ? 'flip-ink-drawn' : ''}`}
                strokeWidth="3.5"
              />
            )}
          </svg>
        </div>
        <p
          className={`mt-2.5 text-[10px] font-semibold transition-opacity sm:mt-4 sm:text-xs duration-300 ${
            day.works ? 'text-pine-600' : 'text-cut-600'
          } ${marked ? 'opacity-100' : 'opacity-0'}`}
        >
          {day.note}
        </p>
      </div>
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
    const [delay, next] =
      phase === 'idle'
        ? [BEFORE_MARK_MS, () => setPhase('marked')]
        : phase === 'marked'
          ? [works ? HOLD_WORKS_MS : HOLD_STRUCK_MS, () => setPhase('flipping')]
          : [
              FLIP_MS,
              () => {
                setIndex((i) => (i + 1) % DAYS.length)
                setPhase('idle')
              },
            ]
    const t = setTimeout(next, delay)
    return () => clearTimeout(t)
  }, [index, phase, still, hidden])

  const upNext = DAYS[(index + 1) % DAYS.length]

  return (
    <div className="relative w-32 shrink-0 sm:w-44 self-center sm:self-auto select-none" aria-hidden="true">
      {/* Binder rings */}
      <div className="absolute -top-2 left-0 right-0 z-20 flex justify-center gap-11 sm:gap-16">
        <span className="h-5 w-2 rounded-full border-2 border-stone-400 bg-paper" />
        <span className="h-5 w-2 rounded-full border-2 border-stone-400 bg-paper" />
      </div>

      {/* Pad thickness */}
      <div className="absolute inset-x-2 -bottom-3 h-full rounded-xl border border-stone-200 bg-white" />
      <div className="absolute inset-x-1 -bottom-1.5 h-full rounded-xl border border-stone-200 bg-white" />

      <div className="relative h-40 [perspective:700px] sm:h-56">
        <Page day={upNext} phase="idle" />
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
