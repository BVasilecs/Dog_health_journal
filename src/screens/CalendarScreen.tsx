import { useState } from 'react'
import { useApp } from '../context/AppContext'
import { getDayStatus, statusBg, statusColor, statusEmoji, statusLabel, getEntryStatus } from '../utils/status'
import { BRISTOL_DESCRIPTIONS, STOOL_COLORS } from '../types'
import {
  format, startOfMonth, endOfMonth, eachDayOfInterval,
  getDay, addMonths, subMonths, parseISO, isToday
} from 'date-fns'
import { ru } from 'date-fns/locale'

// Monday-first weekday index (0=Mon … 6=Sun)
function weekdayMon(date: Date) {
  return (getDay(date) + 6) % 7
}

export default function CalendarScreen() {
  const { state, dispatch, getEntryForDate, todayStr } = useApp()
  const [viewDate, setViewDate] = useState(() => new Date())
  const [selectedDate, setSelectedDate] = useState<string | null>(null)

  const monthStart = startOfMonth(viewDate)
  const monthEnd = endOfMonth(viewDate)
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd })
  const leadingEmpties = weekdayMon(monthStart)

  const selectedEntry = selectedDate ? getEntryForDate(selectedDate) : undefined
  const selectedStatus = selectedDate ? getDayStatus(selectedDate, state.entries) : null

  function prev() { setViewDate(d => subMonths(d, 1)); setSelectedDate(null) }
  function next() { setViewDate(d => addMonths(d, 1)); setSelectedDate(null) }

  function openEdit(date: string) {
    dispatch({ type: 'OPEN_ENTRY', payload: date })
  }

  const WEEKDAYS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс']

  return (
    <div className="h-full flex flex-col bg-surface" style={{ paddingBottom: '5rem' }}>
      {/* ── Header ── */}
      <header className="sticky top-0 z-30 bg-surface/80 backdrop-blur-xl px-5 pt-4 pb-2">
        <div className="flex items-center justify-between mb-4">
          <h1 className="font-headline text-2xl font-bold text-on-surface capitalize">
            {format(viewDate, 'LLLL yyyy', { locale: ru })}
          </h1>
          <div className="flex gap-2">
            <button
              onClick={prev}
              className="w-9 h-9 rounded-full bg-surface-container flex items-center justify-center text-on-surface-variant hover:bg-surface-variant transition-colors active:scale-90"
            >
              <span className="material-symbols-outlined text-[20px]">chevron_left</span>
            </button>
            <button
              onClick={next}
              className="w-9 h-9 rounded-full bg-surface-container flex items-center justify-center text-on-surface-variant hover:bg-surface-variant transition-colors active:scale-90"
            >
              <span className="material-symbols-outlined text-[20px]">chevron_right</span>
            </button>
          </div>
        </div>

        {/* Legend */}
        <div className="flex gap-4 text-xs font-label font-medium text-on-surface-variant flex-wrap mb-2">
          {[
            { color: '#4d644b', label: 'Норма' },
            { color: '#ffbc6f', label: 'Симптомы' },
            { color: '#ba1a1a', label: 'Эпизод' },
            { color: '#c3c8bf', label: 'Нет данных' },
          ].map(({ color, label }) => (
            <div key={label} className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: color }} />
              <span>{label}</span>
            </div>
          ))}
        </div>
      </header>

      {/* ── Calendar grid ── */}
      <div className="flex-1 overflow-y-auto px-4">
        <div className="bg-surface-container-low rounded-2xl p-3 shadow-card max-w-lg mx-auto">
          {/* Day-of-week headers */}
          <div className="grid grid-cols-7 gap-1 mb-2">
            {WEEKDAYS.map(d => (
              <div key={d} className="text-center font-label text-[10px] font-bold text-on-surface-variant/60 uppercase tracking-wide py-1">
                {d}
              </div>
            ))}
          </div>

          {/* Day cells — keyed to month so cells re-animate on navigation */}
          <div key={format(viewDate, 'yyyy-MM')} className="grid grid-cols-7 gap-1">
            {/* Leading empty cells */}
            {Array.from({ length: leadingEmpties }).map((_, i) => (
              <div key={`e${i}`} />
            ))}

            {days.map((day, index) => {
              const dateStr = format(day, 'yyyy-MM-dd')
              const status = getDayStatus(dateStr, state.entries)
              const today = isToday(day)
              const selected = selectedDate === dateStr

              return (
                <button
                  key={dateStr}
                  onClick={() => setSelectedDate(selected ? null : dateStr)}
                  className={`anim-cell relative aspect-square flex flex-col items-center justify-center rounded-full transition-all active:scale-90
                    ${selected ? 'ring-2 ring-primary ring-offset-1' : ''}
                    ${today ? 'ring-2 ring-offset-1 ring-primary/50' : ''}`}
                  style={{
                    backgroundColor: status ? statusBg(status) : '#fbf9f5',
                    animationDelay: `${(leadingEmpties + index) * 18}ms`,
                  }}
                >
                  <span
                    className="font-label text-sm font-semibold"
                    style={{ color: status ? statusColor(status) : '#737971' }}
                  >
                    {format(day, 'd')}
                  </span>
                  {today && (
                    <span
                      className="absolute bottom-1 w-1 h-1 rounded-full"
                      style={{ backgroundColor: status ? statusColor(status) : '#4d644b' }}
                    />
                  )}
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {/* ── Bottom sheet: day summary ── */}
      {selectedDate && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40 bg-inverse-surface/20"
            onClick={() => setSelectedDate(null)}
          />

          <div className="fixed bottom-0 left-0 w-full z-50 sheet-enter"
            style={{ paddingBottom: 'max(1.5rem, env(safe-area-inset-bottom))' }}>
            <div className="bg-surface-container-lowest rounded-t-3xl shadow-float px-5 pt-4 pb-6 max-w-lg mx-auto">
              {/* Drag handle */}
              <div className="w-10 h-1.5 bg-outline-variant/40 rounded-full mx-auto mb-4" />

              {/* Date + status badge */}
              <div className="flex items-start justify-between mb-4">
                <div>
                  <p className="font-label text-xs text-secondary font-semibold mb-0.5">Запись</p>
                  <h2 className="font-headline text-xl font-bold text-on-surface capitalize">
                    {format(parseISO(selectedDate), 'd MMMM yyyy', { locale: ru })}
                  </h2>
                </div>
                {selectedStatus && (
                  <div
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full"
                    style={{ backgroundColor: statusBg(selectedStatus) }}
                  >
                    <span className="text-sm select-none">{statusEmoji(selectedStatus)}</span>
                    <span className="font-label text-sm font-bold" style={{ color: statusColor(selectedStatus) }}>
                      {statusLabel(selectedStatus)}
                    </span>
                  </div>
                )}
              </div>

              {selectedEntry ? (
                <div className="flex flex-col gap-3">
                  {/* Quick stats row */}
                  {(() => {
                    const walks = [
                      { key: 'morning',   label: '🌅', w: selectedEntry.stool.morning },
                      { key: 'afternoon', label: '☀️', w: selectedEntry.stool.afternoon },
                      { key: 'evening',   label: '🌙', w: selectedEntry.stool.evening },
                    ].filter(x => x.w.hadStool)

                    const prevDate = new Date(selectedDate!)
                    prevDate.setDate(prevDate.getDate() - 1)
                    const prevEntry = getEntryForDate(prevDate.toISOString().split('T')[0])
                    let fastLabel = '—'
                    if (selectedEntry.food.morningFed && prevEntry?.food.eveningFed) {
                      const [pH, pM] = prevEntry.food.eveningTime.split(':').map(Number)
                      const [cH, cM] = selectedEntry.food.morningTime.split(':').map(Number)
                      const diff = (cH * 60 + cM + 24 * 60) - (pH * 60 + pM)
                      const h = Math.floor(diff / 60)
                      const m = diff % 60
                      fastLabel = m > 0 ? `${h}ч ${m}м` : `${h}ч`
                    }

                    return (
                      <div className="grid grid-cols-3 gap-2">
                        <div className="bg-surface-container-low rounded-xl p-3 text-center">
                          <p className="font-label text-[10px] text-on-surface-variant mb-1">Ночная пауза</p>
                          <p className="font-headline font-bold text-xl text-on-surface">{fastLabel}</p>
                        </div>
                        <div className="bg-surface-container-low rounded-xl p-3 text-center">
                          <p className="font-label text-[10px] text-on-surface-variant mb-1">Бристоль</p>
                          <p className="font-headline font-bold text-xl text-on-surface">
                            {walks.length > 0 ? (walks[0].w.bristolScale ?? '—') : '—'}
                          </p>
                        </div>
                        <div className="bg-surface-container-low rounded-xl p-3 text-center">
                          <p className="font-label text-[10px] text-on-surface-variant mb-1">Настроение</p>
                          <p className="text-xl select-none">
                            {selectedEntry.behavior.mood === 'happy' ? '😊' : selectedEntry.behavior.mood === 'lethargic' ? '😔' : '😐'}
                          </p>
                        </div>
                      </div>
                    )
                  })()}

                  {/* Flags */}
                  <div className="flex flex-wrap gap-2">
                    {[selectedEntry.stool.morning, selectedEntry.stool.afternoon, selectedEntry.stool.evening]
                      .filter(w => w.hadStool && w.color)
                      .slice(0, 1)
                      .map((w, i) => w.color && (
                        <span key={i} className="flex items-center gap-1.5 bg-surface-container-low px-3 py-1 rounded-full font-label text-xs">
                          <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: STOOL_COLORS[w.color]?.hex }} />
                          {STOOL_COLORS[w.color]?.label}
                        </span>
                      ))}
                    {[selectedEntry.stool.morning, selectedEntry.stool.afternoon, selectedEntry.stool.evening].some(w => w.hadStool && w.mucus) &&
                      <span className="bg-tertiary-fixed text-on-tertiary-fixed px-3 py-1 rounded-full font-label text-xs">Слизь</span>}
                    {[selectedEntry.stool.morning, selectedEntry.stool.afternoon, selectedEntry.stool.evening].some(w => w.hadStool && w.visibleBlood) &&
                      <span className="bg-error-container text-on-error-container px-3 py-1 rounded-full font-label text-xs">Кровь</span>}
                    {selectedEntry.stomach.rumbling &&
                      <span className="bg-secondary-fixed text-on-secondary-fixed px-3 py-1 rounded-full font-label text-xs">Урчание</span>}
                  </div>

                  {selectedEntry.notes && (
                    <p className="font-body text-sm text-on-surface-variant leading-relaxed bg-surface-container-low rounded-xl p-3">
                      {selectedEntry.notes}
                    </p>
                  )}

                  <button
                    onClick={() => { setSelectedDate(null); openEdit(selectedDate) }}
                    className="w-full py-3 rounded-full bg-gradient-to-r from-primary to-primary-container text-on-primary font-headline font-bold shadow-float hover:opacity-90 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                  >
                    <span className="material-symbols-outlined text-[18px] icon-fill">edit</span>
                    Редактировать
                  </button>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-4 py-4">
                  <span className="text-5xl select-none opacity-40">📓</span>
                  <p className="font-label text-on-surface-variant text-sm text-center">Записи на этот день нет</p>
                  <button
                    onClick={() => { setSelectedDate(null); openEdit(selectedDate) }}
                    className="w-full py-3 rounded-full bg-gradient-to-r from-primary to-primary-container text-on-primary font-headline font-bold shadow-float hover:opacity-90 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                  >
                    <span className="material-symbols-outlined text-[18px] icon-fill">add_circle</span>
                    Добавить запись
                  </button>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
