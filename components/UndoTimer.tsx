import { useState, useEffect, useCallback } from 'react'

interface UndoTimerProps {
  deadline: number // timestamp in ms
  onExpired: () => void
  onUndo: () => void
}

export default function UndoTimer({ deadline, onExpired, onUndo }: UndoTimerProps) {
  const getSecondsLeft = useCallback(() => {
    return Math.max(0, Math.ceil((deadline - Date.now()) / 1000))
  }, [deadline])

  const [secondsLeft, setSecondsLeft] = useState(getSecondsLeft)

  useEffect(() => {
    setSecondsLeft(getSecondsLeft())

    const interval = setInterval(() => {
      const remaining = getSecondsLeft()
      setSecondsLeft(remaining)
      if (remaining <= 0) {
        clearInterval(interval)
        onExpired()
      }
    }, 1000)

    return () => clearInterval(interval)
  }, [deadline, getSecondsLeft, onExpired])

  if (secondsLeft <= 0) return null

  return (
    <button
      onClick={onUndo}
      className="px-3 py-1 text-sm font-medium text-amber-700 bg-amber-50 border border-amber-200 rounded-md hover:bg-amber-100 transition-colors"
    >
      Undo ({secondsLeft}s)
    </button>
  )
}
