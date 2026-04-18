import { useState } from 'react'
import { useApp } from '../context/AppContext'
import { generateVetPDF } from '../utils/pdfExport'
import { getEntryStatus } from '../utils/status'
import { format, subDays } from 'date-fns'
import { ru } from 'date-fns/locale'

export default function ExportScreen() {
  const { state } = useApp()

  const todayStr = new Date().toISOString().split('T')[0]
  const thirtyDaysAgo = subDays(new Date(), 30).toISOString().split('T')[0]

  const [fromDate, setFromDate] = useState(thirtyDaysAgo)
  const [toDate, setToDate] = useState(todayStr)
  const [includePhotos, setIncludePhotos] = useState(true)
  const [includeNotes, setIncludeNotes] = useState(true)
  const [includeStats, setIncludeStats] = useState(true)
  const [generating, setGenerating] = useState(false)

  const filtered = state.entries.filter(e => e.date >= fromDate && e.date <= toDate)
  const goodCount = filtered.filter(e => getEntryStatus(e) === 'green').length
  const episodeCount = filtered.filter(e => getEntryStatus(e) === 'red').length
  const mildCount = filtered.length - goodCount - episodeCount
  const withPhotos = filtered.filter(e => e.photoBase64).length
  const withNotes = filtered.filter(e => e.notes.trim()).length

  async function handleGenerate() {
    if (filtered.length === 0) return
    setGenerating(true)
    try {
      generateVetPDF({ entries: state.entries, pet: state.pet, fromDate, toDate, includePhotos, includeNotes, includeStats })
    } finally {
      setGenerating(false)
    }
  }

  return (
    <div className="h-full overflow-y-auto bg-surface" style={{ paddingBottom: '6.5rem' }}>
      <header className="sticky top-0 z-30 bg-surface/80 backdrop-blur-xl px-5 py-4">
        <h1 className="font-headline text-2xl font-bold text-on-surface leading-tight">
          Поделиться<br />
          <span className="text-primary">с ветеринаром</span>
        </h1>
        <p className="font-body text-sm text-on-surface-variant mt-1">
          Сформируйте PDF-отчёт для приёма у врача
        </p>
      </header>

      <main className="px-4 pb-4 flex flex-col gap-5 max-w-lg mx-auto">

        {/* ── Date range ── */}
        <section className="bg-surface-container-lowest rounded-2xl p-5 shadow-card flex flex-col gap-4">
          <h2 className="font-headline font-bold text-base text-on-surface">Период</h2>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <label className="font-label text-xs font-semibold text-secondary uppercase tracking-wide">С</label>
              <input
                type="date"
                value={fromDate}
                max={toDate}
                onChange={e => setFromDate(e.target.value)}
                className="bg-surface-container-highest rounded-xl px-3 py-3 font-label text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary-fixed"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="font-label text-xs font-semibold text-secondary uppercase tracking-wide">По</label>
              <input
                type="date"
                value={toDate}
                min={fromDate}
                max={todayStr}
                onChange={e => setToDate(e.target.value)}
                className="bg-surface-container-highest rounded-xl px-3 py-3 font-label text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary-fixed"
              />
            </div>
          </div>

          {/* Quick range buttons */}
          <div className="flex gap-2 flex-wrap">
            {[
              { label: '7 дней',   days: 7 },
              { label: '30 дней',  days: 30 },
              { label: '3 месяца', days: 90 },
              { label: 'Всё время', days: 9999 },
            ].map(({ label, days }) => (
              <button
                key={days}
                onClick={() => {
                  const from = days === 9999
                    ? (state.entries.sort((a, b) => a.date.localeCompare(b.date))[0]?.date ?? todayStr)
                    : subDays(new Date(), days).toISOString().split('T')[0]
                  setFromDate(from)
                  setToDate(todayStr)
                }}
                className="px-3 py-1.5 bg-surface-container rounded-full font-label text-xs font-medium text-on-surface-variant hover:bg-surface-container-high transition-colors active:scale-95"
              >
                {label}
              </button>
            ))}
          </div>
        </section>

        {/* ── Include options ── */}
        <section className="bg-surface-container rounded-2xl p-5 flex flex-col gap-4">
          <h2 className="font-headline font-bold text-base text-on-surface">Включить в отчёт</h2>
          {[
            { key: 'stats',   label: 'Сводная статистика', icon: 'bar_chart',    val: includeStats,  set: setIncludeStats },
            { key: 'notes',   label: 'Заметки',             icon: 'notes',        val: includeNotes,  set: setIncludeNotes },
            { key: 'photos',  label: 'Фотографии',          icon: 'photo_camera', val: includePhotos, set: setIncludePhotos },
          ].map(({ key, label, icon, val, set }) => (
            <label key={key} className="flex items-center gap-4 cursor-pointer">
              <button
                type="button"
                onClick={() => set(v => !v)}
                className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-colors
                  ${val ? 'bg-primary' : 'bg-surface-container-highest'}`}
              >
                {val && <span className="material-symbols-outlined text-on-primary text-[16px] icon-fill">check</span>}
              </button>
              <span className="material-symbols-outlined text-on-surface-variant text-[20px]">{icon}</span>
              <span className="font-body text-base text-on-surface">{label}</span>
            </label>
          ))}
        </section>

        {/* ── Preview card ── */}
        <section className="bg-surface-container-lowest rounded-2xl p-5 shadow-ambient relative overflow-hidden">
          <div className="absolute -left-8 -top-4 text-primary-fixed-dim opacity-20 pointer-events-none select-none">
            <span className="material-symbols-outlined text-[100px] icon-fill">pets</span>
          </div>

          <div className="flex items-center gap-2 mb-4">
            <span className="material-symbols-outlined text-secondary text-[20px]">visibility</span>
            <h2 className="font-headline font-bold text-base text-on-surface">Предпросмотр</h2>
          </div>

          {filtered.length === 0 ? (
            <div className="flex flex-col items-center py-6 gap-3 text-center">
              <span className="text-5xl opacity-30 select-none">📄</span>
              <p className="font-label text-sm text-on-surface-variant">Нет записей за выбранный период</p>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {/* Dog info block */}
              <div className="bg-primary-fixed rounded-xl p-3 flex items-center gap-3">
                <span className="text-3xl select-none">🐶</span>
                <div>
                  <p className="font-headline font-bold text-sm text-on-primary-fixed">{state.pet.name} · {state.pet.breed.split(' ').slice(0, 3).join(' ')}</p>
                  <p className="font-label text-xs text-on-primary-fixed-variant">Р. {state.pet.birthday.split('-').reverse().join('.')}{state.pet.food ? ` · ${state.pet.food}` : ''}</p>
                </div>
              </div>

              {/* Stats row */}
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="bg-primary-fixed/50 rounded-xl py-2">
                  <p className="font-headline font-bold text-base text-primary">{goodCount}</p>
                  <p className="font-label text-[10px] text-on-surface-variant">Норма</p>
                </div>
                <div className="bg-secondary-fixed/50 rounded-xl py-2">
                  <p className="font-headline font-bold text-base text-secondary">{mildCount}</p>
                  <p className="font-label text-[10px] text-on-surface-variant">Симптомы</p>
                </div>
                <div className="bg-error-container/50 rounded-xl py-2">
                  <p className="font-headline font-bold text-base text-error">{episodeCount}</p>
                  <p className="font-label text-[10px] text-on-surface-variant">Эпизоды</p>
                </div>
              </div>

              {/* Detail info */}
              <div className="flex flex-wrap gap-2 text-xs font-label text-on-surface-variant">
                <span className="bg-surface-container px-2.5 py-1 rounded-full">{filtered.length} записей</span>
                {includeNotes && withNotes > 0 && <span className="bg-surface-container px-2.5 py-1 rounded-full">{withNotes} заметок</span>}
                {includePhotos && withPhotos > 0 && <span className="bg-surface-container px-2.5 py-1 rounded-full">{withPhotos} фото</span>}
                <span className="bg-surface-container px-2.5 py-1 rounded-full">
                  {format(new Date(fromDate), 'd MMM', { locale: ru })} — {format(new Date(toDate), 'd MMM yyyy', { locale: ru })}
                </span>
              </div>
            </div>
          )}
        </section>

        {/* ── Generate button ── */}
        <button
          onClick={handleGenerate}
          disabled={filtered.length === 0 || generating}
          className={`w-full py-4 rounded-full font-headline font-bold text-lg text-on-primary flex items-center justify-center gap-3 shadow-float transition-all
            ${filtered.length === 0 || generating
              ? 'opacity-50 cursor-not-allowed bg-primary/60'
              : 'bg-gradient-to-r from-primary to-primary-container hover:opacity-90 active:scale-[0.98]'}`}
        >
          <span className="material-symbols-outlined text-[22px] icon-fill">picture_as_pdf</span>
          {generating ? 'Генерация...' : 'Скачать PDF для ветеринара'}
        </button>

        {filtered.length === 0 && (
          <p className="text-center font-label text-xs text-on-surface-variant">
            Добавьте записи за выбранный период, чтобы сформировать отчёт
          </p>
        )}
      </main>
    </div>
  )
}
