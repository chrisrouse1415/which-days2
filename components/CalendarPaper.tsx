/**
 * Page background: graph paper where every square is a calendar day.
 *
 * Two tiled SVG patterns are layered:
 *  - a 7-column × 4-week month grid with small day numerals (1–28 tiles seamlessly)
 *  - an 11 × 5 tile of occasional red-pencil strikes, echoing the `.struck` motif
 * Because the tiles have co-prime sizes, the strikes don't visibly repeat.
 */

const CELL = 44
const WEEK = 7
const WEEKS = 4

const MARK_COLS = 11
const MARK_ROWS = 5
// [column, row] of struck-out days within the marks tile
const STRIKES: [number, number][] = [
  [2, 1],
  [7, 0],
  [9, 3],
  [4, 4],
]

// A slightly bowed diagonal so it reads as a hand-drawn pencil line, not a rule
function strikePath(col: number, row: number) {
  const x = col * CELL
  const y = row * CELL
  return `M${x + 9} ${y + CELL - 8} Q${x + CELL / 2 + 3} ${y + CELL / 2 + 2} ${x + CELL - 8} ${y + 9}`
}

export default function CalendarPaper() {
  const days = Array.from({ length: WEEK * WEEKS }, (_, i) => i + 1)

  return (
    <svg
      aria-hidden="true"
      className="calendar-paper pointer-events-none absolute inset-0 -z-10 h-full w-full"
    >
      <defs>
        <pattern
          id="cal-grid"
          x="50%"
          width={CELL * WEEK}
          height={CELL * WEEKS}
          patternUnits="userSpaceOnUse"
        >
          <path
            d={`M${CELL * WEEK} 0H0V${CELL * WEEKS}`}
            fill="none"
            className="stroke-ink/[0.07]"
            strokeWidth="1"
          />
          {Array.from({ length: WEEK - 1 }, (_, i) => (
            <path key={`v${i}`} d={`M${(i + 1) * CELL} 0V${CELL * WEEKS}`} className="stroke-ink/[0.045]" />
          ))}
          {Array.from({ length: WEEKS - 1 }, (_, i) => (
            <path key={`h${i}`} d={`M0 ${(i + 1) * CELL}H${CELL * WEEK}`} className="stroke-ink/[0.07]" />
          ))}
          {days.map((d) => (
            <text
              key={d}
              x={((d - 1) % WEEK) * CELL + 5}
              y={Math.floor((d - 1) / WEEK) * CELL + 13}
              className="fill-ink/[0.13] font-display"
              fontSize="9.5"
            >
              {d}
            </text>
          ))}
        </pattern>

        <pattern
          id="cal-marks"
          x="50%"
          width={CELL * MARK_COLS}
          height={CELL * MARK_ROWS}
          patternUnits="userSpaceOnUse"
        >
          {STRIKES.map(([c, r]) => (
            <path
              key={`${c}-${r}`}
              d={strikePath(c, r)}
              fill="none"
              className="stroke-cut-500/[0.2]"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          ))}
        </pattern>
      </defs>

      <rect width="100%" height="100%" fill="url(#cal-grid)" />
      <rect width="100%" height="100%" fill="url(#cal-marks)" />
    </svg>
  )
}
