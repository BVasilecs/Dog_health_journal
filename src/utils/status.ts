import { DiaryEntry, EntryStatus, StoolWalk } from '../types'

function walksOccurred(entry: DiaryEntry): StoolWalk[] {
  return [entry.stool.morning, entry.stool.afternoon, entry.stool.evening].filter(w => w.occurred)
}

export function getEntryStatus(entry: DiaryEntry): EntryStatus {
  const { behavior, stomach } = entry
  const walks = walksOccurred(entry)

  // Red: any critical flag
  const anyRed = walks.some(
    w => w.visibleBlood || w.bristolScale === 6 || w.bristolScale === 7
  )
  if (
    anyRed ||
    behavior.mood === 'lethargic' ||
    behavior.appetite === 'refused'
  ) return 'red'

  // Green: all occurred walks are Bristol 3-4, no mucus, no blood, no rumbling
  if (walks.length > 0) {
    const allGood = walks.every(
      w =>
        (w.bristolScale === 3 || w.bristolScale === 4) &&
        !w.mucus &&
        !w.visibleBlood
    )
    if (allGood && !stomach.rumbling) return 'green'
  }

  return 'yellow'
}

export function getDayStatus(date: string, entries: DiaryEntry[]): EntryStatus | null {
  const entry = entries.find(e => e.date === date)
  if (!entry) return null
  return getEntryStatus(entry)
}

export function statusColor(status: EntryStatus | null): string {
  if (status === 'green') return '#4d644b'
  if (status === 'red') return '#ba1a1a'
  if (status === 'yellow') return '#ffbc6f'
  return '#c3c8bf'
}

export function statusBg(status: EntryStatus | null): string {
  if (status === 'green') return '#cfeaca'
  if (status === 'red') return '#ffdad6'
  if (status === 'yellow') return '#ffddba'
  return '#efeeea'
}

export function statusEmoji(status: EntryStatus | null): string {
  if (status === 'green') return '✅'
  if (status === 'red') return '🚨'
  if (status === 'yellow') return '⚠️'
  return '—'
}

export function statusLabel(status: EntryStatus | null): string {
  if (status === 'green') return 'Всё хорошо'
  if (status === 'red') return 'Требует внимания'
  if (status === 'yellow') return 'Лёгкие симптомы'
  return 'Нет данных'
}

export function getGoodDayStreak(entries: DiaryEntry[]): number {
  const today = new Date()
  let streak = 0
  for (let i = 0; i < 365; i++) {
    const d = new Date(today)
    d.setDate(d.getDate() - i)
    const dateStr = d.toISOString().split('T')[0]
    const status = getDayStatus(dateStr, entries)
    if (status === 'green') streak++
    else break
  }
  return streak
}

export function getAverageCycleBetweenBadDays(entries: DiaryEntry[]): number | null {
  const badDays = entries
    .filter(e => getEntryStatus(e) === 'red')
    .map(e => e.date)
    .sort()
  if (badDays.length < 2) return null
  let totalGap = 0
  for (let i = 1; i < badDays.length; i++) {
    const prev = new Date(badDays[i - 1])
    const curr = new Date(badDays[i])
    totalGap += (curr.getTime() - prev.getTime()) / (1000 * 60 * 60 * 24)
  }
  return totalGap / (badDays.length - 1)
}

export function getEpisodesThisMonth(entries: DiaryEntry[]): number {
  const now = new Date()
  return entries.filter(e => {
    const d = new Date(e.date)
    return (
      d.getMonth() === now.getMonth() &&
      d.getFullYear() === now.getFullYear() &&
      (getEntryStatus(e) === 'red' || getEntryStatus(e) === 'yellow')
    )
  }).length
}

export function getLastEpisodes(entries: DiaryEntry[], count = 5): DiaryEntry[] {
  return entries
    .filter(e => getEntryStatus(e) === 'red' || getEntryStatus(e) === 'yellow')
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, count)
}

export function getWeeklyEpisodeCounts(entries: DiaryEntry[], weeks = 8): { week: string; count: number; status: EntryStatus }[] {
  const result: { week: string; count: number; status: EntryStatus }[] = []
  const today = new Date()
  for (let w = weeks - 1; w >= 0; w--) {
    const weekStart = new Date(today)
    weekStart.setDate(today.getDate() - today.getDay() - w * 7)
    const weekEnd = new Date(weekStart)
    weekEnd.setDate(weekStart.getDate() + 6)
    const count = entries.filter(e => {
      const d = new Date(e.date)
      return d >= weekStart && d <= weekEnd && getEntryStatus(e) !== 'green'
    }).length
    const label = w === 0 ? 'Сейчас' : `W${weeks - w}`
    const status: EntryStatus = count === 0 ? 'green' : count >= 3 ? 'red' : 'yellow'
    result.push({ week: label, count, status })
  }
  return result
}
