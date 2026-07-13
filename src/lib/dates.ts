// Small date helpers. Dates the user picks are calendar dates (YYYY-MM-DD);
// they're anchored to local noon so timezone edges never shift the day.

const DAY = 24 * 60 * 60 * 1000

export function dateInputToTs(dateStr: string): number {
  const [y, m, d] = dateStr.split('-').map(Number)
  return new Date(y, m - 1, d, 12).getTime()
}

export function tsToDateInput(ts: number): string {
  const d = new Date(ts)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

export function todayInput(): string {
  return tsToDateInput(Date.now())
}

/** Whole days from today to the given date; negative = past. */
export function daysFromToday(dateStr: string, now = Date.now()): number {
  return Math.round((dateInputToTs(dateStr) - dateInputToTs(tsToDateInput(now))) / DAY)
}

/** "today", "tomorrow", "in 12 days", "3 days ago" */
export function relativeDay(dateStr: string, now = Date.now()): string {
  const days = daysFromToday(dateStr, now)
  if (days === 0) return 'today'
  if (days === 1) return 'tomorrow'
  if (days === -1) return 'yesterday'
  if (days > 1) return `in ${days} days`
  return `${-days} days ago`
}

/** "about 16 years", "about 8 months", "a few weeks" — friendship durations are approximate by nature. */
export function friendshipDuration(sinceStr: string, now = Date.now()): string {
  const days = Math.max(0, (now - dateInputToTs(sinceStr)) / DAY)
  if (days < 45) return 'a few weeks'
  if (days < 365) {
    const months = Math.round(days / 30.4)
    return `about ${months} month${months === 1 ? '' : 's'}`
  }
  const years = days / 365.25
  if (years < 1.5) return 'about a year'
  return `about ${Math.round(years)} years`
}
