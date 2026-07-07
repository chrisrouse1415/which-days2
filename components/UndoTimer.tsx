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

  if (secondsLeft <= 0) return null

  return (
    <button
      onClick={onUndo}
      disabled={disabled}
      aria-label={`Undo, ${secondsLeft} seconds remaining`}
      className="min-h-[36px] w-full rounded-lg border border-amber-200 bg-amber-50 px-2 py-1.5 text-xs font-semibold text-amber-700 transition-colors hover:bg-amber-100 disabled:opacity-50"
    >
      Undo ({secondsLeft}s)
    </button>
  )
}
