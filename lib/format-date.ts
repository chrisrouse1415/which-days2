export function formatDate(dateStr: string): string {
  const date = new Date(dateStr + 'T00:00:00')
  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  })
}

export function getDateParts(dateStr: string) {
  const date = new Date(dateStr + 'T00:00:00')
  const weekday = date.toLocaleDateString('en-US', { weekday: 'short' })
  const monthDay = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  return { weekday, monthDay }
}

export function getLongDateParts(dateStr: string) {
  const date = new Date(dateStr + 'T00:00:00')
  return {
    weekday: date.toLocaleDateString('en-US', { weekday: 'long' }),
    day: date.getDate(),
    monthYear: date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
  }
}
