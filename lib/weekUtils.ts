export function getWeekStart(from: Date = new Date()): Date {
  const d = new Date(from)
  const day = d.getDay() // 0=Sun, 1=Mon
  d.setDate(d.getDate() - ((day + 6) % 7))
  d.setHours(0, 0, 0, 0)
  return d
}

export function getWeekEnd(weekStart: Date): Date {
  const d = new Date(weekStart)
  d.setDate(d.getDate() + 6)
  d.setHours(23, 59, 59, 999)
  return d
}

export function toDateStr(d: Date): string {
  return d.toISOString().slice(0, 10)
}

export function formatWeekRange(weekStart: Date): string {
  const end = getWeekEnd(weekStart)
  const startLabel = weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  const endLabel = end.getMonth() === weekStart.getMonth()
    ? end.toLocaleDateString('en-US', { day: 'numeric' })
    : end.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  return `${startLabel} – ${endLabel}`
}

export function formatMonthLabel(monthStart: string): string {
  return new Date(monthStart + 'T12:00:00').toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
}
