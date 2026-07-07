import { useState, useCallback, useMemo } from 'react'

interface DatePickerProps {
  selectedDates: string[]
  onChange: (dates: string[]) => void
  maxDates?: number
}

function formatISO(year: number, month: number, day: number): string {
  const m = String(month + 1).padStart(2, '0')
  const d = String(day).padStart(2, '0')
  return `${year}-${m}-${d}`
}

function parseDateStr(s: string): { year: number; month: number; day: number } {
  const parts = s.split('-')
  return { year: Number(parts[0]), month: Number(parts[1]) - 1, day: Number(parts[2]) }
}

function formatDisplay(dateStr: string): string {
  const { year, month, day } = parseDateStr(dateStr)
  return new Date(year, month, day).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function listDatesBetween(start: string, end: string): string[] {
  let a = start
  let b = end
  if (a > b) {
    const tmp = a
    a = b
    b = tmp
  }

  const result: string[] = []
  let cur = parseDateStr(a)
  for (;;) {
    const s = formatISO(cur.year, cur.month, cur.day)
    result.push(s)
    if (s === b) break
    const next = new Date(cur.year, cur.month, cur.day + 1)
    cur = { year: next.getFullYear(), month: next.getMonth(), day: next.getDate() }
  }
  return result
}

const DAY_LABELS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']

export default function DatePicker({
  selectedDates,
  onChange,
  maxDates = 30,
}: DatePickerProps) {
  const today = new Date()
  const [viewYear, setViewYear] = useState(today.getFullYear())
  const [viewMonth, setViewMonth] = useState(today.getMonth())
  const [rangeMode, setRangeMode] = useState(false)
  const [rangeStart, setRangeStart] = useState<string | null>(null)
  const [hoverDate, setHoverDate] = useState<string | null>(null)

  const todayStr = formatISO(today.getFullYear(), today.getMonth(), today.getDate())

  const selectedSet = useMemo(() => new Set(selectedDates), [selectedDates])

  // Build the calendar grid for the current view month
  const calendarDays = useMemo(() => {
    const firstDay = new Date(viewYear, viewMonth, 1).getDay()
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate()
    const cells: Array<{ key: string; day: number; month: number; year: number; isCurrentMonth: boolean }> = []

    // Leading days from previous month
    if (firstDay > 0) {
      const prevMonthDays = new Date(viewYear, viewMonth, 0).getDate()
      const m = viewMonth === 0 ? 11 : viewMonth - 1
      const y = viewMonth === 0 ? viewYear - 1 : viewYear
      for (let d = firstDay - 1; d >= 0; d--) {
        const dayNum = prevMonthDays - d
        cells.push({ key: formatISO(y, m, dayNum), day: dayNum, month: m, year: y, isCurrentMonth: false })
      }
    }

    // Current month days
    for (let d = 1; d <= daysInMonth; d++) {
      cells.push({ key: formatISO(viewYear, viewMonth, d), day: d, month: viewMonth, year: viewYear, isCurrentMonth: true })
    }

    // Trailing days to finish the last week only (no full extra rows)
    if (cells.length % 7 > 0) {
      const nm = viewMonth === 11 ? 0 : viewMonth + 1
      const ny = viewMonth === 11 ? viewYear + 1 : viewYear
      let trailDay = 1
      while (cells.length % 7 !== 0) {
        cells.push({ key: formatISO(ny, nm, trailDay), day: trailDay, month: nm, year: ny, isCurrentMonth: false })
        trailDay++
      }
    }

    return cells
  }, [viewYear, viewMonth])

  const monthLabel = new Date(viewYear, viewMonth, 1).toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  })

  function prevMonth() {
    if (viewMonth === 0) {
      setViewYear(viewYear - 1)
      setViewMonth(11)
    } else {
      setViewMonth(viewMonth - 1)
    }
  }

  function nextMonth() {
    if (viewMonth === 11) {
      setViewYear(viewYear + 1)
      setViewMonth(0)
    } else {
      setViewMonth(viewMonth + 1)
    }
  }

  const rangePreview = useMemo(() => {
    if (!rangeMode || !rangeStart || !hoverDate) return new Set<string>()
    return new Set(listDatesBetween(rangeStart, hoverDate))
  }, [rangeMode, rangeStart, hoverDate])

  // Add candidate dates that aren't already selected, capped at maxDates
  const addDates = useCallback(
    (candidates: string[]) => {
      const toAdd = candidates.filter((s) => !selectedSet.has(s))
      const remaining = maxDates - selectedDates.length
      const adding = toAdd.slice(0, remaining)
      if (adding.length === 0) return
      const next = selectedDates.concat(adding)
      next.sort()
      onChange(next)
    },
    [selectedDates, selectedSet, maxDates, onChange]
  )

  const toggleDate = useCallback(
    (dateStr: string) => {
      if (selectedSet.has(dateStr)) {
        onChange(selectedDates.filter((d) => d !== dateStr))
      } else {
        addDates([dateStr])
      }
    },
    [selectedDates, selectedSet, onChange, addDates]
  )

  function handleDayClick(dateStr: string, cellMonth: number, cellYear: number) {
    // Navigate to the clicked month if out-of-month
    if (cellMonth !== viewMonth || cellYear !== viewYear) {
      setViewMonth(cellMonth)
      setViewYear(cellYear)
    }

    if (rangeMode) {
      if (!rangeStart) {
        setRangeStart(dateStr)
      } else {
        addDates(listDatesBetween(rangeStart, dateStr))
        setRangeStart(null)
        setRangeMode(false)
        setHoverDate(null)
      }
    } else {
      toggleDate(dateStr)
    }
  }

  // Shortcut: add all days of the visible month matching a predicate
  function addMonthDays(match: (dayOfWeek: number) => boolean) {
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate()
    const candidates: string[] = []
    for (let d = 1; d <= daysInMonth; d++) {
      if (match(new Date(viewYear, viewMonth, d).getDay())) {
        candidates.push(formatISO(viewYear, viewMonth, d))
      }
    }
    addDates(candidates)
  }

  const atMax = selectedDates.length >= maxDates

  const shortcutClass =
    'rounded-lg border border-stone-300 bg-white px-3 py-1.5 text-xs font-semibold text-stone-600 transition-colors hover:bg-stone-50 disabled:cursor-not-allowed disabled:opacity-40'

  return (
    <div className="space-y-4">
      {/* Count indicator */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-stone-500">
          <span className="font-semibold text-ink">{selectedDates.length}</span>
          {' of '}
          {maxDates} dates selected
        </p>
        {atMax && (
          <span className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-xs font-semibold text-amber-700">
            Maximum reached
          </span>
        )}
      </div>

      {/* Shortcuts */}
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" onClick={() => addMonthDays((dow) => dow >= 1 && dow <= 5)} disabled={atMax} className={shortcutClass}>
          Weekdays
        </button>
        <button type="button" onClick={() => addMonthDays((dow) => dow === 0 || dow === 6)} disabled={atMax} className={shortcutClass}>
          Weekends
        </button>
        <button type="button" onClick={() => addMonthDays(() => true)} disabled={atMax} className={shortcutClass}>
          All
        </button>
        <div className="h-5 w-px bg-stone-200" />
        <button
          type="button"
          onClick={() => {
            setRangeMode(!rangeMode)
            setRangeStart(null)
            setHoverDate(null)
          }}
          className={
            'rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors ' +
            (rangeMode
              ? 'border-pine-600 bg-pine-50 text-pine-700'
              : 'border-stone-300 bg-white text-stone-600 hover:bg-stone-50')
          }
        >
          {rangeMode ? (rangeStart ? 'Click end date' : 'Click start date') : 'Select range'}
        </button>
      </div>

      {/* Calendar */}
      <div className="card overflow-hidden">
        {/* Month navigation */}
        <div className="flex items-center justify-between border-b border-stone-200 bg-stone-50 px-4 py-3">
          <button
            type="button"
            onClick={prevMonth}
            className="rounded-lg p-1.5 text-stone-500 transition-colors hover:bg-white hover:text-ink"
            aria-label="Previous month"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h3 className="text-sm font-semibold text-ink">{monthLabel}</h3>
          <button
            type="button"
            onClick={nextMonth}
            className="rounded-lg p-1.5 text-stone-500 transition-colors hover:bg-white hover:text-ink"
            aria-label="Next month"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>

        {/* Day headers */}
        <div className="grid grid-cols-7 border-b border-stone-100">
          {DAY_LABELS.map((label) => (
            <div key={label} className="py-2 text-center text-xs font-semibold text-stone-400">
              {label}
            </div>
          ))}
        </div>

        {/* Day cells */}
        <div className="grid grid-cols-7">
          {calendarDays.map((cell) => {
            const isSelected = selectedSet.has(cell.key)
            const isToday = cell.key === todayStr
            const isOtherMonth = !cell.isCurrentMonth
            const isPast = cell.key < todayStr
            const inRangePreview = rangePreview.has(cell.key)
            const isRangeStart = rangeMode && rangeStart === cell.key

            let colorClasses: string
            if (isSelected) {
              colorClasses = 'bg-pine-600 text-white hover:bg-pine-700'
            } else if (isRangeStart) {
              colorClasses = 'bg-pine-500 text-white'
            } else if (inRangePreview) {
              colorClasses = 'bg-pine-100 text-pine-800'
            } else if (isOtherMonth) {
              colorClasses = 'text-stone-300 hover:bg-stone-50'
            } else if (isPast) {
              colorClasses = 'text-stone-400 hover:bg-stone-100'
            } else {
              colorClasses = 'text-ink hover:bg-pine-50'
            }

            if (atMax && !isSelected) {
              colorClasses = isOtherMonth || isPast ? 'text-stone-200 cursor-not-allowed' : 'text-stone-400 cursor-not-allowed'
            }

            const ringClass = isToday && !isSelected ? ' rounded-lg ring-2 ring-inset ring-pine-500' : ''

            return (
              <button
                key={cell.key}
                type="button"
                onClick={() => handleDayClick(cell.key, cell.month, cell.year)}
                onMouseEnter={() => {
                  if (rangeMode && rangeStart) setHoverDate(cell.key)
                }}
                disabled={atMax && !isSelected && !rangeMode}
                className={`relative flex aspect-square min-h-[44px] cursor-pointer select-none items-center justify-center text-sm font-medium transition-colors duration-150 ${colorClasses}${ringClass}`}
                aria-label={cell.key + (isSelected ? ' (selected)' : '')}
                aria-pressed={isSelected}
              >
                {cell.day}
              </button>
            )
          })}
        </div>
      </div>

      {/* Selected dates chips */}
      {selectedDates.length > 0 && (
        <>
          <div className="flex flex-wrap gap-1.5">
            {selectedDates.map((dateStr) => (
              <button
                key={dateStr}
                type="button"
                onClick={() => toggleDate(dateStr)}
                aria-label={`Remove ${formatDisplay(dateStr)}`}
                className="inline-flex items-center gap-1 rounded-lg border border-pine-200 bg-pine-50 px-2.5 py-1 text-xs font-semibold text-pine-800 transition-colors hover:bg-pine-100"
              >
                {formatDisplay(dateStr)}
                <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => onChange([])}
            className="text-sm font-medium text-cut-600 transition-colors hover:text-cut-700"
          >
            Clear all dates
          </button>
        </>
      )}
    </div>
  )
}
