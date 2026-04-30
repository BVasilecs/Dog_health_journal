import { useApp, buildBlankEntry } from '../context/AppContext'
import { getEntryStatus, statusBgClass, statusColorClass, statusEmoji, statusLabel } from '../utils/status'
import { DiaryEntry, StoolWalk, BRISTOL_DESCRIPTIONS, STOOL_COLORS } from '../types'
import { format, subDays, parseISO } from 'date-fns'
import { ru } from 'date-fns/locale'

function worstWalk(entry: DiaryEntry) {
  const walks = [entry.stool.morning, entry.stool.afternoon, entry.stool.evening].filter(w => w.hadStool)
  if (walks.length === 0) return null
  return walks.reduce((a, b) => ((b.bristolScale ?? 0) > (a.bristolScale ?? 0) ? b : a))
}

function anyFlag(entry: DiaryEntry, flag: 'mucus' | 'visibleBlood') {
  return [entry.stool.morning, entry.stool.afternoon, entry.stool.evening].some(w => w.hadStool && w[flag])
}

function moodEmoji(mood: string) {
  return mood === 'happy' ? '😊' : mood === 'lethargic' ? '😔' : '😐'
}

export default function HomeScreen() {
  const { state, dispatch, getEntryForDate, todayStr } = useApp()
  const todayEntry = getEntryForDate(todayStr)
  const todayStatus = todayEntry ? getEntryStatus(todayEntry) : null

  // Last 7 days (excluding today shown separately)
  const recentDays = Array.from({ length: 7 }, (_, i) => {
    const d = subDays(new Date(), i + 1)
    const dateStr = d.toISOString().split('T')[0]
    return { dateStr, entry: getEntryForDate(dateStr) }
  })

  function openEntry(date: string) {
    dispatch({ type: 'OPEN_ENTRY', payload: date })
  }

  function nowTime() {
    const n = new Date()
    return `${String(n.getHours()).padStart(2, '0')}:${String(n.getMinutes()).padStart(2, '0')}`
  }

  function quickLogStool(period: 'morning' | 'afternoon' | 'evening') {
    const walk: StoolWalk = {
      time: nowTime(), hadStool: true,
      bristolScale: 2, color: 'brown',
      mucus: false, strongSmell: false, visibleBlood: false,
    }
    if (todayEntry) {
      dispatch({ type: 'UPDATE_ENTRY', payload: { ...todayEntry, stool: { ...todayEntry.stool, [period]: walk } } })
    } else {
      const entry = buildBlankEntry(todayStr)
      dispatch({ type: 'ADD_ENTRY', payload: { ...entry, stool: { ...entry.stool, [period]: walk } } })
    }
  }

  function quickLogMeal(period: 'morning' | 'afternoon' | 'evening') {
    const t = nowTime()
    const fedKey  = period === 'morning' ? 'morningFed'   : period === 'afternoon' ? 'afternoonFed'   : 'eveningFed'
    const timeKey = period === 'morning' ? 'morningTime'  : period === 'afternoon' ? 'afternoonTime'  : 'eveningTime'
    if (todayEntry) {
      dispatch({ type: 'UPDATE_ENTRY', payload: { ...todayEntry, food: { ...todayEntry.food, [fedKey]: true, [timeKey]: t } } })
    } else {
      const entry = buildBlankEntry(todayStr)
      dispatch({ type: 'ADD_ENTRY', payload: { ...entry, food: { ...entry.food, [fedKey]: true, [timeKey]: t } } })
    }
  }

  const todayLabel = format(new Date(), "d MMMM yyyy", { locale: ru })

  return (
    <div className="h-full overflow-y-auto bg-surface" style={{ paddingBottom: '6.5rem' }}>
      {/* ── Top App Bar ── */}
      <header className="sticky top-0 z-30 bg-surface/80 backdrop-blur-xl px-6 py-4 flex items-center justify-between">
        <button
          onClick={() => dispatch({ type: 'OPEN_PET_SETTINGS' })}
          aria-label={`Профиль ${state.pet.name} — открыть настройки`}
          className="flex items-center gap-3 hover:opacity-80 active:scale-95 transition-all"
        >
          <div className="w-10 h-10 rounded-full overflow-hidden bg-primary-fixed flex items-center justify-center">
            {state.pet.avatarBase64
              ? <img src={state.pet.avatarBase64} alt={state.pet.name} className="w-full h-full object-cover" />
              : <span className="text-xl select-none" aria-hidden="true">🐾</span>
            }
          </div>
          <div className="flex items-center gap-1">
            <h1 className="font-headline font-bold text-lg text-primary">{state.pet.name}</h1>
            <span className="material-symbols-outlined text-[16px] text-on-surface-variant">chevron_right</span>
          </div>
        </button>
        <span className="font-label text-sm text-on-surface-variant">{todayLabel}</span>
      </header>

      <main className="px-5 pt-2 flex flex-col gap-6 max-w-lg mx-auto">
        {/* ── Dog Profile Card ── */}
        <section className="anim-fade-up delay-0 bg-surface-container-lowest rounded-2xl p-5 shadow-ambient relative overflow-hidden">
          <div className="absolute -right-6 -top-6 opacity-5 pointer-events-none select-none text-primary">
            <span className="material-symbols-outlined text-[120px] icon-fill">pets</span>
          </div>
          <div className="flex items-center gap-4 relative">
            <div className="w-20 h-20 rounded-full overflow-hidden bg-primary-fixed flex items-center justify-center shadow-card border-4 border-surface-container-lowest shrink-0">
              {state.pet.avatarBase64
                ? <img src={state.pet.avatarBase64} alt={state.pet.name} className="w-full h-full object-cover" />
                : <span className="text-5xl select-none" aria-hidden="true">🐶</span>
              }
            </div>
            <div>
              <h2 className="font-headline text-3xl font-extrabold tracking-tight text-on-surface">{state.pet.name}</h2>
              <p className="text-sm font-label font-medium text-secondary mt-0.5">{state.pet.breed}</p>
              <p className="text-xs text-on-surface-variant mt-1">
                {state.pet.birthday.split('-').reverse().join('.')}
                {state.pet.food ? ` · ${state.pet.food}` : ''}
              </p>
            </div>
          </div>
        </section>

        {/* ── Today's Status Card ── */}
        <section
          className={`anim-fade-up delay-1 rounded-2xl p-5 shadow-card relative overflow-hidden ${statusBgClass(todayStatus)}`}
        >
          <div className="absolute -right-4 -top-4 opacity-10 pointer-events-none select-none">
            <span className="text-[80px]">{todayStatus ? statusEmoji(todayStatus) : '📋'}</span>
          </div>
          <p className={`font-label text-xs font-semibold uppercase tracking-wider mb-2 ${statusColorClass(todayStatus, 'text-outline')}`}>
            Сегодня
          </p>
          <div className="flex items-center gap-3">
            <span className="text-4xl select-none">{todayStatus ? statusEmoji(todayStatus) : '📋'}</span>
            <div>
              <p className="font-headline font-bold text-xl text-on-surface">
                {todayStatus ? statusLabel(todayStatus) : 'Нет записи'}
              </p>
              {todayEntry && (() => {
                const w = worstWalk(todayEntry)
                return w ? (
                  <p className="text-sm text-on-surface-variant mt-0.5">
                    Бристоль {w.bristolScale ?? '—'} · {BRISTOL_DESCRIPTIONS[w.bristolScale ?? 0] ?? ''}
                  </p>
                ) : null
              })()}
            </div>
          </div>
        </section>

        {/* ── Quick Log ── */}
        <section className="anim-fade-up delay-2 flex flex-col gap-2">
          <p className="font-label text-[10px] font-semibold text-on-surface-variant/60 uppercase tracking-widest px-1">Быстрый ввод</p>

          {/* ── Stool sub-block ── */}
          <div className="bg-surface-container-lowest rounded-2xl p-3 shadow-card flex flex-col gap-2">
            <div className="flex items-center gap-1.5 px-0.5">
              <span className="text-sm select-none">💩</span>
              <span className="font-label text-xs font-semibold text-on-surface-variant">Стул</span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {(['morning', 'afternoon', 'evening'] as const).map((period, i) => {
                const icons = ['🌅', '☀️', '🌙']
                const labels = ['Утро', 'День', 'Вечер']
                const done = !!todayEntry?.stool[period].hadStool
                return (
                  <button
                    key={period}
                    type="button"
                    onClick={() => quickLogStool(period)}
                    className={`py-3 rounded-xl flex flex-col items-center justify-center gap-1 transition-all active:scale-95
                      ${done ? 'bg-primary-fixed' : 'bg-surface-container hover:bg-surface-container-high'}`}
                  >
                    <span className="text-base select-none">{icons[i]}</span>
                    <span className={`font-label text-[10px] font-semibold ${done ? 'text-primary' : 'text-on-surface-variant'}`}>{labels[i]}</span>
                    {done && <span className="material-symbols-outlined icon-fill text-primary" style={{ fontSize: 11 }}>check</span>}
                  </button>
                )
              })}
            </div>
          </div>

          {/* ── Meal sub-block ── */}
          <div className="bg-surface-container-lowest rounded-2xl p-3 shadow-card flex flex-col gap-2">
            <div className="flex items-center gap-1.5 px-0.5">
              <span className="text-sm select-none">🍽️</span>
              <span className="font-label text-xs font-semibold text-on-surface-variant">Питание</span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {(['morning', 'afternoon', 'evening'] as const).map((period, i) => {
                const icons = ['🌅', '☀️', '🌙']
                const labels = ['Завтрак', 'Обед', 'Ужин']
                const fedKeys = ['morningFed', 'afternoonFed', 'eveningFed'] as const
                const done = !!todayEntry?.food[fedKeys[i]]
                return (
                  <button
                    key={period}
                    type="button"
                    onClick={() => quickLogMeal(period)}
                    className={`py-3 rounded-xl flex flex-col items-center justify-center gap-1 transition-all active:scale-95
                      ${done ? 'bg-secondary-fixed' : 'bg-surface-container hover:bg-surface-container-high'}`}
                  >
                    <span className="text-base select-none">{icons[i]}</span>
                    <span className={`font-label text-[10px] font-semibold ${done ? 'text-secondary' : 'text-on-surface-variant'}`}>{labels[i]}</span>
                    {done && <span className="material-symbols-outlined icon-fill text-secondary" style={{ fontSize: 11 }}>check</span>}
                  </button>
                )
              })}
            </div>
          </div>
        </section>

        {/* ── Add / Edit Button ── */}
        <button
          onClick={() => openEntry(todayStr)}
          className="anim-fade-up delay-3 w-full py-4 rounded-full font-headline font-bold text-lg text-on-primary shadow-float
            bg-gradient-to-r from-primary to-primary-container
            hover:opacity-90 active:scale-[0.97] transition-all duration-200 flex items-center justify-center gap-2"
        >
          <span className="material-symbols-outlined icon-fill text-[22px]">
            {todayEntry ? 'edit' : 'add_circle'}
          </span>
          {todayEntry ? 'Редактировать запись' : 'Добавить запись'}
        </button>

        {/* ── Recent Entries ── */}
        <section className="anim-fade-up delay-4 flex flex-col gap-3">
          <h3 className="font-headline font-bold text-xl text-on-surface px-1">Последние 7 дней</h3>

          {recentDays.every(d => !d.entry) ? (
            <div className="flex flex-col items-center gap-3 py-10 text-center">
              <span className="anim-float text-6xl select-none opacity-40">📓</span>
              <p className="font-label text-on-surface-variant text-sm">Записей пока нет.<br/>Начните вести дневник сегодня!</p>
            </div>
          ) : (
            recentDays.map(({ dateStr, entry }, index) => {
              const status = entry ? getEntryStatus(entry) : null
              const dayLabel = format(parseISO(dateStr), 'd MMM', { locale: ru })
              const weekday = format(parseISO(dateStr), 'EEE', { locale: ru })

              return (
                <button
                  key={dateStr}
                  onClick={() => openEntry(dateStr)}
                  className="anim-fade-up w-full bg-surface-container-lowest rounded-2xl p-4 flex items-center gap-4 shadow-card hover:bg-surface-container-low transition-colors active:scale-[0.98] text-left"
                  style={{ animationDelay: `${220 + index * 45}ms` }}
                >
                  {/* Date blob */}
                  <div className={`shrink-0 w-14 h-14 rounded-xl flex flex-col items-center justify-center ${statusBgClass(status)}`}>
                    <span className={`font-headline font-bold text-lg leading-none ${statusColorClass(status, 'text-outline')}`}>
                      {dayLabel.split(' ')[0]}
                    </span>
                    <span className="font-label text-[10px] text-on-surface-variant capitalize">{weekday}</span>
                  </div>

                  {/* Entry info */}
                  <div className="flex-1 min-w-0">
                    {entry ? (
                      <>
                        <div className="flex items-center gap-2 flex-wrap">
                          {(() => {
                            const w = worstWalk(entry)
                            const walksCount = [entry.stool.morning, entry.stool.afternoon, entry.stool.evening].filter(x => x.hadStool).length
                            return (
                              <>
                                <span className="font-headline font-bold text-on-surface text-sm">
                                  {walksCount > 0 ? `${walksCount} стул.` : 'Нет стула'}
                                  {w?.bristolScale ? ` · Б${w.bristolScale}` : ''}
                                </span>
                                {w?.color && (
                                  <span className="w-3 h-3 rounded-full shrink-0"
                                    style={{ backgroundColor: STOOL_COLORS[w.color]?.hex }} />
                                )}
                              </>
                            )
                          })()}
                          {anyFlag(entry, 'mucus') && <span className="text-xs bg-tertiary-fixed text-on-tertiary-fixed px-2 py-0.5 rounded-full">слизь</span>}
                          {anyFlag(entry, 'visibleBlood') && <span className="text-xs bg-error-container text-on-error-container px-2 py-0.5 rounded-full">кровь</span>}
                        </div>
                        <p className="font-label text-xs text-on-surface-variant mt-0.5">
                          {moodEmoji(entry.behavior.mood)}{' '}
                          {entry.behavior.appetite === 'refused' ? '🚫 Отказ от еды' :
                           entry.behavior.appetite === 'reduced' ? '⬇️ Снижен аппетит' : 'Аппетит в норме'}
                        </p>
                      </>
                    ) : (
                      <p className="font-label text-sm text-on-surface-variant italic">Нет записи</p>
                    )}
                  </div>

                  {/* Status dot */}
                  <div className={`shrink-0 w-3 h-3 rounded-full ${statusColorClass(status).replace('text-', 'bg-')}`} />
                </button>
              )
            })
          )}
        </section>
      </main>
    </div>
  )
}
