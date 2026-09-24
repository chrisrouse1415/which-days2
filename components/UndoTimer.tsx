import { useState, useEffect, useCallback, useRef } from 'react'

interface UndoTimerProps {
  deadline: number // timestamp in ms
  disabled?: boolean
  onExpired: () => void
  onUndo: () => void
}

export default function UndoTimer({ deadline, disabled, onExpired, onUndo }: UndoTimerProps) {
  const getSecondsLeft = useCallback(() => {
    return Math.max(0, Math.ceil((deadline - Date.now()) / 1000))
  }, [deadline])

  const [secondsLeft, setSecondsLeft] = useState(getSecondsLeft)
  const onExpiredRef = useRef(onExpired)
  onExpiredRef.current = onExpired

  useEffect(() => {
    setSecondsLeft(getSecondsLeft())

    const interval = setInterval(() => {
      const remaining = getSecondsLeft()
      setSecondsLeft(remaining)
      if (remaining <= 0) {
        clearInterval(interval)
        onExpiredRef.current()
      }
    }, 1000)

    return () => clearInterval(interval)
  }, [deadline, getSecondsLeft])

  // Measured once on mount so the draining line runs smoothly in CSS, not per-second
  const [initialMs] = useState(() => Math.max(0, deadline - Date.now()))

  if (secondsLeft <= 0) return null

  return (
    <button
      onClick={onUndo}
      disabled={disabled}
      aria-label={`Undo, ${secondsLeft} seconds remaining`}
      className="relative min-h-[36px] w-full overflow-hidden rounded-lg border border-amber-200 bg-amber-50 px-2 py-1.5 text-xs font-semibold text-amber-700 transition-colors hover:bg-amber-100 disabled:opacity-50"
    >
      Undo
      <span
        aria-hidden="true"
        className="undo-fuse absolute inset-x-0 bottom-0 h-[3px] origin-left bg-amber-400/70"
        style={{ animationDuration: `${initialMs}ms` }}
      />
    </button>
  )
}
