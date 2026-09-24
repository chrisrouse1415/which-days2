import type { ReactNode } from 'react'
import { getLongDateParts } from '../lib/format-date'

/**
 * The decided day, circled in green pencil — the same mark as the landing page's
 * flip calendar. The circle draws itself in once on mount.
 */
export default function PickedDay({
  date,
  label,
  children,
}: {
  date: string
  label: string
  children?: ReactNode
}) {
  const { weekday, day, monthYear } = getLongDateParts(date)

  return (
    <div className="card px-6 py-8 text-center">
      <p className="section-label">{label}</p>
      <p className="mt-4 text-sm font-semibold uppercase tracking-[0.15em] text-stone-500">{weekday}</p>
      <div className="relative mx-auto mt-2 inline-block px-5 py-2">
        <p className="font-display text-7xl font-semibold leading-none tracking-tight text-ink tabular-nums">
          {day}
        </p>
        <svg
          viewBox="0 0 100 80"
          preserveAspectRatio="none"
          className="absolute inset-0 h-full w-full overflow-visible"
          aria-hidden="true"
        >
          <path
            d="M52 6 C22 4 6 22 8 42 C10 64 34 76 58 73 C82 70 95 54 92 34 C89 15 70 5 44 9"
            pathLength={1}
            className="ink-draw-in fill-none stroke-pine-600"
            strokeWidth="2.5"
            strokeLinecap="round"
          />
        </svg>
      </div>
      <p className="mt-3 font-display text-xl font-semibold text-ink">{monthYear}</p>
      {children}
    </div>
  )
}
