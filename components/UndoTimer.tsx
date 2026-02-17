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
      className="w-full px-2 py-1.5 min-h-[36px] text-xs font-semibold text-amber-700 bg-amber-50/80 border border-amber-200/60 rounded-xl hover:bg-amber-100 disabled:opacity-50 transition-all"
    >
      Undo ({secondsLeft}s)
    </button>
  )
}
