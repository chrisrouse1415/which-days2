import { useState, useCallback, useMemo } from 'react'

interface DatePickerProps {
  selectedDates: string[]
  onChange: (dates: string[]) => void
  maxDates?: number
}

function formatISO(year: number, month: number, day: number): string {
  const m = String(month + 1).padStart(2, '0')
  const d = String(day).padStart(2, '0')
  return year + '-' + m + '-' + d
}

function parseDateStr(s: string): { year: number; month: number; day: number } {
  const parts = s.split('-')
  return { year: Number(parts[0]), month: Number(parts[1]) - 1, day: Number(parts[2]) }
}

function formatDisplay(dateStr: string): string {
  const { year, month, day } = parseDateStr(dateStr)
  const d = new Date(year, month, day)
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
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

  const selectedSet = useMemo(() => {
    const s = new Set<string>()
    for (var i = 0; i < selectedDates.length; i++) {
      s.add(selectedDates[i])
    }
    return s
  }, [selectedDates])

  // Build the 6-row calendar grid for the current view month
  const calendarDays = useMemo(() => {
    const firstDay = new Date(viewYear, viewMonth, 1).getDay()
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate()
    const cells: Array<{ key: string; day: number; month: number; year: number; isCurrentMonth: boolean }> = []

    // Leading days from previous month
    if (firstDay > 0) {
      const prevMonthDays = new Date(viewYear, viewMonth, 0).getDate()
      for (var d = firstDay - 1; d >= 0; d--) {
        const dayNum = prevMonthDays - d
        const m = viewMonth === 0 ? 11 : viewMonth - 1
        const y = viewMonth === 0 ? viewYear - 1 : viewYear
        cells.push({ key: formatISO(y, m, dayNum), day: dayNum, month: m, year: y, isCurrentMonth: false })
      }
    }

    // Current month days
    for (var d2 = 1; d2 <= daysInMonth; d2++) {
      cells.push({ key: formatISO(viewYear, viewMonth, d2), day: d2, month: viewMonth, year: viewYear, isCurrentMonth: true })
    }

    // Trailing days to finish the last week only (no full extra rows)
    var remainder = cells.length % 7
    if (remainder > 0) {
      var trailDay = 1
      var nm = viewMonth === 11 ? 0 : viewMonth + 1
      var ny = viewMonth === 11 ? viewYear + 1 : viewYear
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

  // Compute range preview dates
  const rangePreview = useMemo(() => {
    if (!rangeMode || !rangeStart || !hoverDate) return new Set<string>()
    var a = rangeStart
    var b = hoverDate
    if (a > b) { var tmp = a; a = b; b = tmp }

    var preview = new Set<string>()
    var cur = parseDateStr(a)
    var end = b
    while (true) {
      var s = formatISO(cur.year, cur.month, cur.day)
      preview.add(s)
      if (s === end) break
      var next = new Date(cur.year, cur.month, cur.day + 1)
      cur = { year: next.getFullYear(), month: next.getMonth(), day: next.getDate() }
    }
    return preview
  }, [rangeMode, rangeStart, hoverDate])

  const toggleDate = useCallback(
    (dateStr: string) => {
      if (selectedSet.has(dateStr)) {
        onChange(selectedDates.filter(function (d) { return d !== dateStr }))
      } else {
        if (selectedDates.length >= maxDates) return
        var next = selectedDates.concat([dateStr])
        next.sort()
        onChange(next)
      }
    },
    [selectedDates, selectedSet, maxDates, onChange]
  )

  function addDatesRange(start: string, end: string) {
    var a = start
    var b = end
    if (a > b) { var tmp = a; a = b; b = tmp }

    var toAdd: string[] = []
    var cur = parseDateStr(a)
    var endStr = b
    while (true) {
      var s = formatISO(cur.year, cur.month, cur.day)
      if (!selectedSet.has(s)) toAdd.push(s)
      if (s === endStr) break
      var next = new Date(cur.year, cur.month, cur.day + 1)
      cur = { year: next.getFullYear(), month: next.getMonth(), day: next.getDate() }
    }

    var remaining = maxDates - selectedDates.length
    var adding = toAdd.slice(0, remaining)
    if (adding.length === 0) return
    var next2 = selectedDates.concat(adding)
    next2.sort()
    onChange(next2)
  }

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
        addDatesRange(rangeStart, dateStr)
        setRangeStart(null)
        setRangeMode(false)
        setHoverDate(null)
      }
    } else {
      toggleDate(dateStr)
    }
  }

  // Shortcuts
  function addWeekdays() {
    var daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate()
    var toAdd: string[] = []
    for (var d = 1; d <= daysInMonth; d++) {
      var dow = new Date(viewYear, viewMonth, d).getDay()
      if (dow >= 1 && dow <= 5) {
        var s = formatISO(viewYear, viewMonth, d)
        if (!selectedSet.has(s)) toAdd.push(s)
      }
    }
    var remaining = maxDates - selectedDates.length
    var adding = toAdd.slice(0, remaining)
    if (adding.length === 0) return
    var next = selectedDates.concat(adding)
    next.sort()
    onChange(next)
  }

  function addWeekends() {
    var daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate()
    var toAdd: string[] = []
    for (var d = 1; d <= daysInMonth; d++) {
      var dow = new Date(viewYear, viewMonth, d).getDay()
      if (dow === 0 || dow === 6) {
        var s = formatISO(viewYear, viewMonth, d)
        if (!selectedSet.has(s)) toAdd.push(s)
      }
    }
    var remaining = maxDates - selectedDates.length
    var adding = toAdd.slice(0, remaining)
    if (adding.length === 0) return
    var next = selectedDates.concat(adding)
    next.sort()
    onChange(next)
  }

  function addAll() {
    var daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate()
    var toAdd: string[] = []
    for (var d = 1; d <= daysInMonth; d++) {
      var s = formatISO(viewYear, viewMonth, d)
      if (!selectedSet.has(s)) toAdd.push(s)
    }
    var remaining = maxDates - selectedDates.length
    var adding = toAdd.slice(0, remaining)
    if (adding.length === 0) return
    var next = selectedDates.concat(adding)
    next.sort()
    onChange(next)
  }

  function clearAll() {
    onChange([])
  }

  var isPast = function (dateStr: string): boolean {
    return dateStr < todayStr
  }

  var atMax = selectedDates.length >= maxDates

  return (
    <div className="space-y-4">
      {/* Count indicator */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-600">
          <span className="font-semibold text-teal-700">{selectedDates.length}</span>
          {' / '}
          {maxDates} dates selected
        </p>
        {atMax && (
          <span className="text-xs font-medium text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">
            Maximum reached
          </span>
        )}
      </div>

      {/* Shortcuts */}
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={addWeekdays}
          disabled={atMax}
          className="px-3 py-1.5 text-xs font-medium rounded-full border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          Weekdays
        </button>
        <button
          type="button"
          onClick={addWeekends}
          disabled={atMax}
          className="px-3 py-1.5 text-xs font-medium rounded-full border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          Weekends
        </button>
        <button
          type="button"
          onClick={addAll}
          disabled={atMax}
          className="px-3 py-1.5 text-xs font-medium rounded-full border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          All
        </button>
        <div className="w-px h-5 bg-slate-200" />
        <button
          type="button"
          onClick={() => {
            setRangeMode(!rangeMode)
            setRangeStart(null)
            setHoverDate(null)
          }}
          className={
            'px-3 py-1.5 text-xs font-medium rounded-full border transition-colors ' +
            (rangeMode
              ? 'border-violet-400 bg-violet-100 text-violet-700 shadow-sm'
              : 'border-violet-200 bg-violet-50 text-violet-600 hover:bg-violet-100')
          }
        >
          {rangeMode ? (rangeStart ? 'Click end date' : 'Click start date') : 'Select Range'}
        </button>
      </div>

      {/* Calendar */}
      <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-sm">
        {/* Month navigation */}
        <div className="flex items-center justify-between px-4 py-3 bg-slate-50 border-b border-slate-200">
          <button
            type="button"
            onClick={prevMonth}
            className="p-1.5 rounded-lg hover:bg-slate-200 text-slate-600 transition-colors"
            aria-label="Previous month"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h3 className="text-sm font-semibold text-slate-800">{monthLabel}</h3>
          <button
            type="button"
            onClick={nextMonth}
            className="p-1.5 rounded-lg hover:bg-slate-200 text-slate-600 transition-colors"
            aria-label="Next month"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>

        {/* Day headers */}
        <div className="grid grid-cols-7 border-b border-slate-100">
          {DAY_LABELS.map(function (label) {
            return (
              <div key={label} className="py-2 text-center text-xs font-medium text-slate-400">
                {label}
              </div>
            )
          })}
        </div>

        {/* Day cells */}
        <div className="grid grid-cols-7">
          {calendarDays.map(function (cell) {
            var isSelected = selectedSet.has(cell.key)
            var isToday = cell.key === todayStr
            var isOtherMonth = !cell.isCurrentMonth
            var dateIsPast = isPast(cell.key)
            var inRangePreview = rangePreview.has(cell.key)
            var isRangeStart = rangeMode && rangeStart === cell.key

            var base = 'relative flex items-center justify-center aspect-square text-sm font-medium transition-all cursor-pointer select-none min-h-[44px]'
            var colorClasses: string

            if (isSelected) {
              colorClasses = 'bg-teal-500 text-white hover:bg-teal-600'
            } else if (isRangeStart) {
              colorClasses = 'bg-violet-500 text-white'
            } else if (inRangePreview) {
              colorClasses = 'bg-violet-100 text-violet-700'
            } else if (isOtherMonth) {
              colorClasses = 'text-slate-300 hover:bg-slate-50'
            } else if (dateIsPast) {
              colorClasses = 'text-slate-400 hover:bg-slate-100'
            } else {
              colorClasses = 'text-slate-700 hover:bg-slate-100'
            }

            if (atMax && !isSelected) {
              colorClasses = isOtherMonth ? 'text-slate-200 cursor-not-allowed' : (dateIsPast ? 'text-slate-300 cursor-not-allowed' : 'text-slate-400 cursor-not-allowed')
            }

            var ringClass = isToday && !isSelected ? ' ring-2 ring-teal-400 ring-inset rounded-lg' : ''

            return (
              <button
                key={cell.key}
                type="button"
                onClick={function () { handleDayClick(cell.key, cell.month, cell.year) }}
                onMouseEnter={function () {
                  if (rangeMode && rangeStart) setHoverDate(cell.key)
                }}
                disabled={atMax && !isSelected && !rangeMode}
                className={base + ' ' + colorClasses + ringClass}
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
        <div className="flex flex-wrap gap-1.5">
          {selectedDates.map(function (dateStr) {
            return (
              <button
                key={dateStr}
                type="button"
                onClick={function () { toggleDate(dateStr) }}
                className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium bg-teal-50 text-teal-700 border border-teal-200 rounded-full hover:bg-teal-100 transition-colors"
              >
                {formatDisplay(dateStr)}
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )
          })}
        </div>
      )}

      {/* Clear dates */}
      {selectedDates.length > 0 && (
        <button
          type="button"
          onClick={clearAll}
          className="text-sm text-rose-600 hover:text-rose-800 transition-colors"
        >
          Clear all dates
        </button>
      )}
    </div>
  )
}
