import { useState, useRef, useEffect } from 'react'
import { useApp, buildBlankEntry } from '../context/AppContext'
import Toggle from '../components/Toggle'
import { DiaryEntry, StoolWalk, BRISTOL_DESCRIPTIONS, STOOL_COLORS, WALK_LABELS } from '../types'
import { format, parseISO } from 'date-fns'
import { ru } from 'date-fns/locale'

function compressImage(dataUrl: string, maxWidth = 1024, quality = 0.72): Promise<string> {
  return new Promise(resolve => {
    const img = new Image()
    img.onload = () => {
      const ratio = Math.min(1, maxWidth / img.width)
      const canvas = document.createElement('canvas')
      canvas.width = Math.round(img.width * ratio)
      canvas.height = Math.round(img.height * ratio)
      canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height)
      resolve(canvas.toDataURL('image/jpeg', quality))
    }
    img.src = dataUrl
  })
}

function nowTime() {
  const n = new Date()
  return `${String(n.getHours()).padStart(2, '0')}:${String(n.getMinutes()).padStart(2, '0')}`
}

function NowBtn({ onSet }: { onSet: (t: string) => void }) {
  return (
    <button
      type="button"
      onClick={() => onSet(nowTime())}
      className="text-[10px] font-label font-semibold text-primary bg-primary-fixed px-2 py-0.5 rounded-full hover:bg-primary-fixed-dim transition-colors active:scale-95 whitespace-nowrap"
    >
      Сейчас
    </button>
  )
}

// ── Walk sub-form ──────────────────────────────────────────────────────────

function WalkSection({
  walkKey,
  walk,
  onChange,
}: {
  walkKey: keyof DiaryEntry['stool']
  walk: StoolWalk
  onChange: (w: StoolWalk) => void
}) {
  const meta = WALK_LABELS[walkKey]

  function patch<K extends keyof StoolWalk>(k: K, v: StoolWalk[K]) {
    onChange({ ...walk, [k]: v })
  }

  return (
    <div className={`rounded-2xl overflow-hidden transition-all duration-300 ${walk.hadStool ? 'bg-surface-container ring-1 ring-outline-variant/30 shadow-card' : 'bg-surface-container-low'}`}>
      {/* Walk header */}
      <div className="flex items-center gap-3 p-4">
        <span className="text-2xl select-none">{meta.icon}</span>
        <div className="flex-1">
          <p className="font-label font-semibold text-sm text-on-surface">{meta.label}</p>
          <div className="flex items-center gap-2 mt-0.5">
            <input
              type="time"
              value={walk.time}
              onChange={e => patch('time', e.target.value)}
              className="bg-transparent font-label text-xs text-on-surface-variant focus:outline-none"
            />
            <NowBtn onSet={t => patch('time', t)} />
          </div>
        </div>
        {/* Occurred toggle */}
        <div className="flex items-center gap-2">
          <span className="font-label text-xs text-on-surface-variant">Был стул</span>
          <Toggle checked={walk.hadStool} onChange={v => patch('hadStool', v)} />
        </div>
      </div>

      {/* Details — smooth expand/collapse via grid-template-rows */}
      <div className="walk-expand" data-open={walk.hadStool ? 'true' : 'false'}>
        <div className="overflow-hidden">
          <div className="px-4 pb-4 flex flex-col gap-4 border-t border-outline-variant/20 pt-4">

            {/* Bristol Scale */}
            <div className="flex flex-col gap-2">
              <p className="font-label text-[10px] font-semibold text-secondary uppercase tracking-wide">Шкала Бристоль</p>
              <div className="flex gap-2 overflow-x-auto hide-scrollbar pb-1 snap-x">
                {([1,2,3,4,5,6,7] as const).map(n => {
                  const selected = walk.bristolScale === n
                  return (
                    <button
                      key={n}
                      type="button"
                      onClick={() => patch('bristolScale', selected ? null : n)}
                      className={`snap-start shrink-0 w-[4.2rem] flex flex-col items-center gap-1.5 py-2.5 px-1 rounded-xl transition-colors
                        ${selected ? 'anim-bristol-selected bg-primary-fixed shadow-card scale-[1.04]' : 'bg-surface-container hover:bg-surface-container-high'}`}
                    >
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center
                        ${selected ? 'bg-surface-container-lowest' : 'bg-surface-container-highest'}`}>
                        <span className={`font-headline font-bold text-sm ${selected ? 'text-primary' : 'text-on-surface-variant'}`}>{n}</span>
                      </div>
                      <span className={`text-[8px] text-center leading-tight px-0.5
                        ${selected ? 'text-on-primary-fixed-variant font-medium' : 'text-on-surface-variant'}`}>
                        {BRISTOL_DESCRIPTIONS[n]}
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Color selector */}
            <div className="flex flex-col gap-2">
              <p className="font-label text-[10px] font-semibold text-secondary uppercase tracking-wide">Цвет</p>
              <div className="flex items-start w-full">
                {(Object.entries(STOOL_COLORS) as [keyof typeof STOOL_COLORS, { hex: string; label: string }][]).map(([key, { hex, label }]) => {
                  const selected = walk.color === key
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => patch('color', selected ? null : key as StoolWalk['color'])}
                      className="flex-1 flex flex-col items-center gap-3"
                      title={label}
                    >
                      <div
                        className="w-10 h-10 rounded-full shadow-card transition-transform hover:scale-110 active:scale-95 flex items-center justify-center"
                        style={{
                          backgroundColor: hex,
                          outline: selected ? `3px solid ${hex}` : 'none',
                          outlineOffset: 3,
                        }}
                      >
                        {selected && <span className="material-symbols-outlined anim-check-in text-white text-[18px] icon-fill">check</span>}
                      </div>
                      <span className="font-label text-[9px] text-on-surface-variant">{label}</span>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Condition toggles */}
            <div className="flex flex-col gap-2.5 pt-2 border-t border-outline-variant/15">
              {([
                { key: 'mucus',        label: 'Слизь',          color: '#e68570' },
                { key: 'strongSmell',  label: 'Сильный запах',  color: '#85530d' },
                { key: 'visibleBlood', label: 'Видимая кровь',  color: '#ba1a1a' },
              ] as { key: keyof StoolWalk; label: string; color: string }[]).map(({ key, label, color }) => (
                <div key={key} className="flex items-center justify-between">
                  <span className={`font-label text-sm font-medium ${key === 'visibleBlood' ? 'text-error' : 'text-on-surface'}`}>
                    {label}
                  </span>
                  <Toggle
                    checked={walk[key] as boolean}
                    onChange={v => patch(key, v)}
                    colorOn={color}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Delete confirmation popup ──────────────────────────────────────────────

function DeleteConfirmPopup({ onConfirm, onCancel }: { onConfirm: () => void; onCancel: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-6 bg-inverse-surface/40 backdrop-blur-sm">
      <div className="bg-surface-container-lowest rounded-2xl p-6 shadow-float w-full max-w-sm flex flex-col gap-5">
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="w-14 h-14 rounded-full bg-error-container flex items-center justify-center">
            <span className="material-symbols-outlined text-error text-[28px] icon-fill">delete</span>
          </div>
          <h2 className="font-headline font-bold text-xl text-on-surface">Удалить запись?</h2>
          <p className="font-body text-sm text-on-surface-variant leading-relaxed">
            Это действие нельзя отменить. Все данные за этот день будут удалены навсегда.
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 py-3 rounded-full bg-surface-container font-headline font-bold text-sm text-on-surface hover:bg-surface-container-high transition-colors active:scale-95"
          >
            Отменить
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 py-3 rounded-full bg-error font-headline font-bold text-sm text-on-error shadow-float hover:opacity-90 transition-opacity active:scale-95"
          >
            Удалить
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Main EntryScreen ───────────────────────────────────────────────────────

export default function EntryScreen() {
  const { state, dispatch, getEntryForDate } = useApp()
  const date = state.editingDate ?? new Date().toISOString().split('T')[0]
  const existing = getEntryForDate(date)

  const [form, setForm] = useState<DiaryEntry>(() => existing ?? buildBlankEntry(date))
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [savePulse, setSavePulse] = useState(false)
  const cameraRef = useRef<HTMLInputElement>(null)
  const galleryRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const e = getEntryForDate(date)
    setForm(e ?? buildBlankEntry(date))
  }, [date])

  function patch<T extends keyof DiaryEntry>(key: T, val: DiaryEntry[T]) {
    setForm(f => ({ ...f, [key]: val }))
  }
  function patchFood<K extends keyof DiaryEntry['food']>(k: K, v: DiaryEntry['food'][K]) {
    setForm(f => ({ ...f, food: { ...f.food, [k]: v } }))
  }
  function patchBehavior<K extends keyof DiaryEntry['behavior']>(k: K, v: DiaryEntry['behavior'][K]) {
    setForm(f => ({ ...f, behavior: { ...f.behavior, [k]: v } }))
  }
  function patchStomach<K extends keyof DiaryEntry['stomach']>(k: K, v: DiaryEntry['stomach'][K]) {
    setForm(f => ({ ...f, stomach: { ...f.stomach, [k]: v } }))
  }
  function patchWalk(walkKey: keyof DiaryEntry['stool'], walk: StoolWalk) {
    setForm(f => ({ ...f, stool: { ...f.stool, [walkKey]: walk } }))
  }

  function handlePhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = async ev => {
      const compressed = await compressImage(ev.target?.result as string)
      patch('photoBase64', compressed)
    }
    reader.readAsDataURL(file)
  }

  function handleSave() {
    setSavePulse(true)
    setTimeout(() => {
      if (existing) dispatch({ type: 'UPDATE_ENTRY', payload: form })
      else dispatch({ type: 'ADD_ENTRY', payload: form })
      dispatch({ type: 'CLOSE_ENTRY' })
    }, 320)
  }

  function handleDelete() {
    dispatch({ type: 'DELETE_ENTRY', payload: form.id })
    dispatch({ type: 'CLOSE_ENTRY' })
  }

  const dateLabel = format(parseISO(date), "d MMMM yyyy", { locale: ru })

  return (
    <div className="h-full flex flex-col bg-surface-container-low">
      {/* ── Header ── */}
      <header className="sticky top-0 z-40 bg-surface/90 backdrop-blur-xl px-5 py-3 flex items-center justify-between shadow-card">
        <button
          onClick={() => dispatch({ type: 'CLOSE_ENTRY' })}
          className="w-10 h-10 rounded-full flex items-center justify-center text-primary hover:bg-surface-container transition-colors active:scale-90"
        >
          <span className="material-symbols-outlined text-[24px]">close</span>
        </button>
        <div className="text-center">
          <p className="font-headline font-bold text-base text-on-surface">{dateLabel}</p>
          <p className="font-label text-xs text-on-surface-variant">{existing ? 'Редактирование' : 'Новая запись'}</p>
        </div>
        <div className="w-10" />
      </header>

      {/* ── Scrollable Form ── */}
      <div className="flex-1 overflow-y-auto" style={{ paddingBottom: '6rem' }}>
        <div className="px-4 pt-4 pb-6 flex flex-col gap-5 max-w-lg mx-auto">

          {/* ════ STOMACH ════ */}
          <section className="bg-surface-container-lowest rounded-2xl p-5 shadow-card relative overflow-hidden">
            <div className="absolute -right-3 -top-3 opacity-5 pointer-events-none select-none">
              <span className="material-symbols-outlined text-[80px] icon-fill">pets</span>
            </div>
            <h2 className="font-headline text-lg font-bold text-primary flex items-center gap-2 mb-4"><span>🫃</span>Желудок</h2>
            <div className="flex items-center justify-between bg-surface-container-low p-4 rounded-xl">
              <div>
                <p className="font-label font-medium text-on-surface">Урчал живот утром?</p>
                <p className="font-label text-xs text-on-surface-variant mt-0.5">Громкие звуки из живота</p>
              </div>
              <Toggle checked={form.stomach.rumbling} onChange={v => patchStomach('rumbling', v)} colorOn="#f59e0b" />
            </div>
          </section>

          {/* ════ STOOL — 3 WALKS ════ */}
          <section className="bg-surface-container-lowest rounded-2xl p-5 shadow-card flex flex-col gap-3">
            <h2 className="font-headline text-lg font-bold text-primary flex items-center gap-2"><span>💩</span>Стул</h2>
            {((['morning', 'afternoon', 'evening'] as const)).map(walkKey => (
              <WalkSection
                key={walkKey}
                walkKey={walkKey}
                walk={form.stool[walkKey]}
                onChange={w => patchWalk(walkKey, w)}
              />
            ))}
          </section>

          {/* ════ FOOD ════ */}
          <section className="bg-surface-container-lowest rounded-2xl p-5 shadow-card flex flex-col gap-4">
            <h2 className="font-headline text-lg font-bold text-primary flex items-center gap-2"><span>🍽️</span>Питание</h2>
            {([
              { fedKey: 'morningFed',   timeKey: 'morningTime',   label: 'Утром' },
              { fedKey: 'afternoonFed', timeKey: 'afternoonTime', label: 'Днём' },
              { fedKey: 'eveningFed',   timeKey: 'eveningTime',   label: 'Вечером' },
            ] as { fedKey: keyof DiaryEntry['food']; timeKey: keyof DiaryEntry['food']; label: string }[]).map(({ fedKey, timeKey, label }) => (
              <div key={fedKey} className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => patchFood(fedKey, !(form.food[fedKey] as boolean))}
                  className={`w-10 h-10 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors
                    ${form.food[fedKey] ? 'bg-primary border-primary' : 'border-outline-variant bg-transparent'}`}
                >
                  {form.food[fedKey] && <span className="material-symbols-outlined anim-check-in text-[18px] text-on-primary icon-fill">check</span>}
                </button>
                <span className="font-label font-medium text-on-surface flex-1">{label}</span>
                <div className="flex items-center gap-1.5">
                  <input
                    type="time"
                    value={form.food[timeKey] as string}
                    onChange={e => patchFood(timeKey, e.target.value)}
                    className="bg-surface-container-low px-3 py-1.5 rounded-full font-label text-base text-on-surface-variant focus:outline-none focus:ring-2 focus:ring-primary-fixed"
                  />
                  <NowBtn onSet={t => patchFood(timeKey, t)} />
                </div>
              </div>
            ))}
            <div className="flex items-center justify-between bg-secondary-fixed/30 p-4 rounded-xl mt-1">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-secondary icon-fill">cookie</span>
                <span className="font-label font-medium text-secondary">Давали угощение?</span>
              </div>
              <Toggle checked={form.food.treatsGiven} onChange={v => patchFood('treatsGiven', v)} colorOn="#85530d" />
            </div>
            <div className="treat-reveal" data-open={form.food.treatsGiven ? 'true' : 'false'}>
              <div className="overflow-hidden">
                <input
                  type="text"
                  placeholder="Что именно?"
                  value={form.food.treatDetails}
                  onChange={e => patchFood('treatDetails', e.target.value)}
                  className="w-full mt-1 bg-surface-container-highest rounded-xl px-4 py-3 font-body text-base text-on-surface placeholder-on-surface-variant/50 focus:outline-none focus:ring-2 focus:ring-primary-fixed"
                />
              </div>
            </div>
          </section>

          {/* ════ НОЧНАЯ ПАУЗА ════ */}
          {(() => {
            const prevDate = new Date(date)
            prevDate.setDate(prevDate.getDate() - 1)
            const prevEntry = getEntryForDate(prevDate.toISOString().split('T')[0])

            type FastResult =
              | { kind: 'ok'; hours: number; minutes: number; fromTime: string; toTime: string }
              | { kind: 'no_morning' }
              | { kind: 'no_prev_evening' }

            const result: FastResult = (() => {
              if (!form.food.morningFed) return { kind: 'no_morning' }
              if (!prevEntry?.food.eveningFed) return { kind: 'no_prev_evening' }
              const [pH, pM] = prevEntry.food.eveningTime.split(':').map(Number)
              const [cH, cM] = form.food.morningTime.split(':').map(Number)
              const diff = (cH * 60 + cM + 24 * 60) - (pH * 60 + pM)
              return { kind: 'ok', hours: Math.floor(diff / 60), minutes: diff % 60, fromTime: prevEntry.food.eveningTime, toTime: form.food.morningTime }
            })()

            const accentColor = result.kind === 'ok'
              ? result.hours < 8 ? 'text-amber-600' : result.hours > 14 ? 'text-orange-600' : 'text-primary'
              : 'text-on-surface-variant'

            return (
              <section className="bg-surface-container-lowest rounded-2xl p-5 shadow-card">
                <h2 className="font-headline text-lg font-bold text-primary flex items-center gap-2 mb-4"><span>🌙</span>Ночная пауза</h2>
                {result.kind === 'ok' ? (
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex flex-col items-center gap-1">
                      <span className="font-label text-[10px] text-on-surface-variant uppercase tracking-wide">Вечер (вчера)</span>
                      <span className="font-headline font-bold text-base text-on-surface">{result.fromTime}</span>
                    </div>
                    <div className="flex-1 flex flex-col items-center gap-0.5">
                      <span className={`font-headline font-bold text-2xl ${accentColor}`}>
                        {result.hours} ч{result.minutes > 0 ? ` ${result.minutes} мин` : ''}
                      </span>
                      <div className="w-full flex items-center gap-1">
                        <div className="flex-1 h-px bg-outline-variant/40" />
                        <span className="material-symbols-outlined text-outline-variant text-[14px]">arrow_forward</span>
                        <div className="flex-1 h-px bg-outline-variant/40" />
                      </div>
                    </div>
                    <div className="flex flex-col items-center gap-1">
                      <span className="font-label text-[10px] text-on-surface-variant uppercase tracking-wide">Утро (сегодня)</span>
                      <span className="font-headline font-bold text-base text-on-surface">{result.toTime}</span>
                    </div>
                  </div>
                ) : (
                  <div className="bg-surface-container-low rounded-xl p-4 flex items-center gap-3">
                    <span className="material-symbols-outlined text-on-surface-variant text-[22px]">info</span>
                    <p className="font-label text-sm text-on-surface-variant">
                      {result.kind === 'no_morning'
                        ? 'Утреннее кормление ещё не отмечено'
                        : 'Нет данных о вечернем кормлении вчера'}
                    </p>
                  </div>
                )}
              </section>
            )
          })()}

          {/* ════ BEHAVIOR ════ */}
          <section className="bg-surface-container-lowest rounded-2xl p-5 shadow-card flex flex-col gap-5">
            <h2 className="font-headline text-lg font-bold text-primary flex items-center gap-2"><span>🐾</span>Поведение</h2>
            <div className="flex flex-col gap-2">
              <p className="font-label text-xs font-semibold text-secondary uppercase tracking-wide">Настроение</p>
              <div className="flex gap-3">
                {([
                  { val: 'happy',    emoji: '😊', label: 'Весёлая' },
                  { val: 'neutral',  emoji: '😐', label: 'Нейтральная' },
                  { val: 'lethargic',emoji: '😔', label: 'Вялая' },
                ] as { val: DiaryEntry['behavior']['mood']; emoji: string; label: string }[]).map(({ val, emoji, label }) => {
                  const active = form.behavior.mood === val
                  return (
                    <button
                      key={val}
                      type="button"
                      onClick={() => patchBehavior('mood', val)}
                      className={`flex-1 flex flex-col items-center gap-1.5 py-3 rounded-xl transition-all
                        ${active ? 'bg-primary-fixed shadow-card' : 'bg-surface-container-low hover:bg-surface-container'}`}
                    >
                      <span className="text-3xl select-none">{emoji}</span>
                      <span className={`font-label text-xs ${active ? 'text-on-primary-fixed-variant font-semibold' : 'text-on-surface-variant'}`}>{label}</span>
                    </button>
                  )
                })}
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <p className="font-label text-xs font-semibold text-secondary uppercase tracking-wide">Аппетит</p>
              <div className="flex bg-surface-container p-1 rounded-xl">
                {([
                  { val: 'normal',  label: 'Норма' },
                  { val: 'reduced', label: 'Снижен' },
                  { val: 'refused', label: 'Отказ' },
                ] as { val: DiaryEntry['behavior']['appetite']; label: string }[]).map(({ val, label }) => {
                  const active = form.behavior.appetite === val
                  return (
                    <button
                      key={val}
                      type="button"
                      onClick={() => patchBehavior('appetite', val)}
                      className={`flex-1 py-2.5 text-sm rounded-lg font-label font-medium transition-all
                        ${active ? 'bg-surface-container-lowest shadow-card text-primary' : 'text-on-surface-variant hover:bg-surface-container-lowest/50'}`}
                    >
                      {label}
                    </button>
                  )
                })}
              </div>
            </div>
          </section>

          {/* ════ PHOTO ════ */}
          <section className="bg-surface-container-lowest rounded-2xl p-5 shadow-card flex flex-col gap-3">
            <h2 className="font-headline text-lg font-bold text-primary flex items-center gap-2"><span>📸</span>Фото</h2>
            {/* Camera input */}
            <input ref={cameraRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handlePhoto} />
            {/* Gallery input — no capture attribute so iOS shows the full picker */}
            <input ref={galleryRef} type="file" accept="image/*" className="hidden" onChange={handlePhoto} />
            {form.photoBase64 ? (
              <div className="relative">
                <img src={form.photoBase64} alt="Фото" className="w-full rounded-2xl object-cover max-h-64" />
                <button
                  type="button"
                  onClick={() => patch('photoBase64', null)}
                  aria-label="Удалить фото"
                  className="absolute top-2 right-2 w-10 h-10 bg-inverse-surface/70 rounded-full flex items-center justify-center text-inverse-on-surface hover:bg-inverse-surface transition-colors"
                >
                  <span className="material-symbols-outlined text-[18px]" aria-hidden="true">close</span>
                </button>
              </div>
            ) : (
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => cameraRef.current?.click()}
                  className="flex-1 flex flex-col items-center gap-2 py-6 border-2 border-dashed border-outline-variant/40 rounded-2xl text-primary hover:bg-surface-container-low transition-colors active:scale-95"
                >
                  <span className="material-symbols-outlined text-[30px] text-primary-container">photo_camera</span>
                  <span className="font-label font-medium text-xs">Камера</span>
                </button>
                <button
                  type="button"
                  onClick={() => galleryRef.current?.click()}
                  className="flex-1 flex flex-col items-center gap-2 py-6 border-2 border-dashed border-outline-variant/40 rounded-2xl text-primary hover:bg-surface-container-low transition-colors active:scale-95"
                >
                  <span className="material-symbols-outlined text-[30px] text-primary-container">photo_library</span>
                  <span className="font-label font-medium text-xs">Галерея</span>
                </button>
              </div>
            )}
          </section>

          {/* ════ NOTES ════ */}
          <section className="bg-surface-container-lowest rounded-2xl p-5 shadow-card flex flex-col gap-3">
            <h2 className="font-headline text-lg font-bold text-primary flex items-center gap-2"><span>📝</span>Заметки</h2>
            <textarea
              rows={4}
              placeholder="Любые наблюдения..."
              value={form.notes}
              onChange={e => patch('notes', e.target.value)}
              className="w-full bg-surface-container-highest rounded-2xl px-4 py-3 font-body text-base text-on-surface placeholder-on-surface-variant/50 focus:outline-none focus:ring-2 focus:ring-primary-fixed resize-none"
            />
          </section>

          {/* ════ DELETE BUTTON (only for existing entries) ════ */}
          {existing && (
            <button
              type="button"
              onClick={() => setShowDeleteConfirm(true)}
              className="w-full py-4 rounded-full border-2 border-error/40 text-error font-headline font-bold text-base hover:bg-error-container/40 active:scale-[0.98] transition-all flex items-center justify-center gap-2 mt-2"
            >
              <span className="material-symbols-outlined text-[20px] icon-fill">delete</span>
              Удалить запись
            </button>
          )}

        </div>
      </div>

      {/* ── Fixed Save Button ── */}
      <div
        className="fixed bottom-0 left-0 w-full px-4 py-3 bg-surface/80 backdrop-blur-xl z-30 flex justify-center"
        style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}
      >
        <button
          onClick={handleSave}
          className={`w-full max-w-lg bg-gradient-to-r from-primary to-primary-container text-on-primary font-headline font-bold text-lg py-4 rounded-full shadow-float hover:opacity-90 active:scale-[0.98] transition-all flex items-center justify-center gap-2${savePulse ? ' anim-save-success' : ''}`}
        >
          <span className="material-symbols-outlined icon-fill text-[22px]">check_circle</span>
          Сохранить запись
        </button>
      </div>

      {/* ── Delete confirmation popup ── */}
      {showDeleteConfirm && (
        <DeleteConfirmPopup
          onConfirm={handleDelete}
          onCancel={() => setShowDeleteConfirm(false)}
        />
      )}
    </div>
  )
}
