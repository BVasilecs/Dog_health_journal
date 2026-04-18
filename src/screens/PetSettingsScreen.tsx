import { useState, useRef } from 'react'
import { useApp } from '../context/AppContext'
import { PetProfile, POPULAR_BREEDS } from '../types'

const CROP_UI = 260   // display diameter of the crop circle (px)
const CROP_OUT = 200  // output canvas resolution (px)

function CropModal({ src, onApply, onCancel }: {
  src: string
  onApply: (cropped: string) => void
  onCancel: () => void
}) {
  const [offset, setOffset] = useState({ x: 0, y: 0 })
  const [scale, setScale] = useState(1)
  const [naturalSize, setNaturalSize] = useState({ w: 0, h: 0 })
  const isDragging = useRef(false)
  const dragStart = useRef({ x: 0, y: 0, ox: 0, oy: 0 })
  const imgRef = useRef<HTMLImageElement>(null)

  const fitScale = naturalSize.w > 0
    ? Math.max(CROP_UI / naturalSize.w, CROP_UI / naturalSize.h)
    : 1
  const displayW = naturalSize.w * fitScale * scale
  const displayH = naturalSize.h * fitScale * scale

  function handleLoad(e: React.SyntheticEvent<HTMLImageElement>) {
    const img = e.currentTarget
    setNaturalSize({ w: img.naturalWidth, h: img.naturalHeight })
    setOffset({ x: 0, y: 0 })
    setScale(1)
  }

  function onPointerDown(e: React.PointerEvent<HTMLDivElement>) {
    e.currentTarget.setPointerCapture(e.pointerId)
    isDragging.current = true
    dragStart.current = { x: e.clientX, y: e.clientY, ox: offset.x, oy: offset.y }
  }

  function onPointerMove(e: React.PointerEvent) {
    if (!isDragging.current) return
    setOffset({
      x: dragStart.current.ox + e.clientX - dragStart.current.x,
      y: dragStart.current.oy + e.clientY - dragStart.current.y,
    })
  }

  function onPointerUp() { isDragging.current = false }

  function apply() {
    const canvas = document.createElement('canvas')
    canvas.width = CROP_OUT
    canvas.height = CROP_OUT
    const ctx = canvas.getContext('2d')!

    ctx.beginPath()
    ctx.arc(CROP_OUT / 2, CROP_OUT / 2, CROP_OUT / 2, 0, Math.PI * 2)
    ctx.clip()

    const ratio = CROP_OUT / CROP_UI
    const drawW = displayW * ratio
    const drawH = displayH * ratio
    const drawX = (CROP_UI / 2 - displayW / 2 + offset.x) * ratio
    const drawY = (CROP_UI / 2 - displayH / 2 + offset.y) * ratio

    ctx.drawImage(imgRef.current!, drawX, drawY, drawW, drawH)
    onApply(canvas.toDataURL('image/jpeg', 0.88))
  }

  return (
    <div className="fixed inset-0 z-[70] bg-inverse-surface/60 backdrop-blur-sm flex items-center justify-center px-6">
      <div className="bg-surface-container-lowest rounded-3xl p-6 flex flex-col items-center gap-5 shadow-float w-full max-w-sm">
        <p className="font-headline font-bold text-on-surface text-base">Обрезать фото</p>

        {/* Circular crop frame */}
        <div
          className="relative overflow-hidden select-none"
          style={{
            width: CROP_UI, height: CROP_UI,
            borderRadius: '50%',
            border: '3px solid #4d644b',
            cursor: isDragging.current ? 'grabbing' : 'grab',
            touchAction: 'none',
          }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerLeave={onPointerUp}
        >
          <img
            ref={imgRef}
            src={src}
            onLoad={handleLoad}
            draggable={false}
            style={{
              position: 'absolute',
              width: displayW || CROP_UI,
              height: displayH || CROP_UI,
              left: CROP_UI / 2 - (displayW || CROP_UI) / 2 + offset.x,
              top: CROP_UI / 2 - (displayH || CROP_UI) / 2 + offset.y,
              pointerEvents: 'none',
              userSelect: 'none',
            }}
          />
        </div>

        {/* Zoom slider */}
        <div className="w-full flex items-center gap-3">
          <span className="material-symbols-outlined text-[18px] text-on-surface-variant">zoom_out</span>
          <input
            type="range" min="1" max="3" step="0.05"
            value={scale}
            onChange={e => setScale(Number(e.target.value))}
            className="flex-1 accent-primary"
          />
          <span className="material-symbols-outlined text-[18px] text-on-surface-variant">zoom_in</span>
        </div>
        <p className="font-label text-[11px] text-on-surface-variant -mt-3">
          Перетащите фото чтобы изменить положение
        </p>

        {/* Buttons */}
        <div className="flex gap-3 w-full">
          <button
            onClick={onCancel}
            className="flex-1 py-3 rounded-full bg-surface-container font-headline font-bold text-sm text-on-surface active:scale-95 transition-all"
          >
            Отменить
          </button>
          <button
            onClick={apply}
            className="flex-1 py-3 rounded-full bg-primary font-headline font-bold text-sm text-on-primary shadow-float active:scale-95 transition-all"
          >
            Применить
          </button>
        </div>
      </div>
    </div>
  )
}

export default function PetSettingsScreen() {
  const { state, dispatch } = useApp()
  const [form, setForm] = useState<PetProfile>({ ...state.pet })
  const [cropSrc, setCropSrc] = useState<string | null>(null)
  const avatarInputRef = useRef<HTMLInputElement>(null)

  function patch<K extends keyof PetProfile>(k: K, v: PetProfile[K]) {
    setForm(f => ({ ...f, [k]: v }))
  }

  function handleAvatarSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = ev => setCropSrc(ev.target?.result as string)
    reader.readAsDataURL(file)
    e.target.value = ''
  }

  function handleSave() {
    dispatch({ type: 'SET_PET', payload: form })
    dispatch({ type: 'CLOSE_PET_SETTINGS' })
  }

  return (
    <div className="h-full flex flex-col bg-surface-container-low">
      {/* ── Header ── */}
      <header className="sticky top-0 z-40 bg-surface/90 backdrop-blur-xl px-5 py-3 flex items-center justify-between shadow-card">
        <button
          onClick={() => dispatch({ type: 'CLOSE_PET_SETTINGS' })}
          className="w-10 h-10 rounded-full flex items-center justify-center text-primary hover:bg-surface-container transition-colors active:scale-90"
        >
          <span className="material-symbols-outlined text-[24px]">arrow_back</span>
        </button>
        <p className="font-headline font-bold text-base text-on-surface">Профиль питомца</p>
        <div className="w-10" />
      </header>

      {/* ── Form ── */}
      <div className="flex-1 overflow-y-auto" style={{ paddingBottom: '6rem' }}>
        <div className="px-4 pt-4 pb-6 flex flex-col gap-5 max-w-lg mx-auto">

          {/* Avatar picker */}
          <div className="flex justify-center pt-2">
            <button
              type="button"
              onClick={() => avatarInputRef.current?.click()}
              className="relative group"
            >
              <div className="w-24 h-24 rounded-full overflow-hidden bg-primary-fixed flex items-center justify-center shadow-card border-4 border-surface-container-lowest">
                {form.avatarBase64
                  ? <img src={form.avatarBase64} className="w-full h-full object-cover" />
                  : <span className="text-5xl select-none">🐶</span>
                }
              </div>
              {/* Hover overlay */}
              <div className="absolute inset-0 rounded-full flex items-center justify-center bg-inverse-surface/40 opacity-0 group-hover:opacity-100 group-active:opacity-100 transition-opacity">
                <span className="material-symbols-outlined text-white text-[26px] icon-fill">photo_camera</span>
              </div>
              {/* Edit badge */}
              <div className="absolute bottom-0 right-0 w-7 h-7 bg-primary rounded-full flex items-center justify-center shadow-card border-2 border-surface-container-lowest">
                <span className="material-symbols-outlined text-on-primary text-[14px] icon-fill">edit</span>
              </div>
            </button>
            <input
              ref={avatarInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleAvatarSelect}
            />
          </div>

          {/* Name */}
          <section className="bg-surface-container-lowest rounded-2xl p-5 shadow-card flex flex-col gap-3">
            <h2 className="font-headline text-lg font-bold text-primary">🏷️ Имя</h2>
            <input
              type="text"
              value={form.name}
              onChange={e => patch('name', e.target.value)}
              placeholder="Имя питомца"
              className="w-full bg-surface-container-highest rounded-xl px-4 py-3 font-body text-sm text-on-surface placeholder-on-surface-variant/50 focus:outline-none focus:ring-2 focus:ring-primary-fixed"
            />
          </section>

          {/* Breed */}
          <section className="bg-surface-container-lowest rounded-2xl p-5 shadow-card flex flex-col gap-3">
            <h2 className="font-headline text-lg font-bold text-primary">🐕 Порода</h2>
            <select
              value={POPULAR_BREEDS.includes(form.breed) ? form.breed : 'Другая порода'}
              onChange={e => {
                if (e.target.value !== 'Другая порода') patch('breed', e.target.value)
                else patch('breed', '')
              }}
              className="w-full bg-surface-container-highest rounded-xl px-4 py-3 font-body text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary-fixed appearance-none"
            >
              {POPULAR_BREEDS.map(b => <option key={b} value={b}>{b}</option>)}
            </select>
            {(!POPULAR_BREEDS.includes(form.breed) || form.breed === '') && (
              <input
                type="text"
                value={form.breed}
                onChange={e => patch('breed', e.target.value)}
                placeholder="Введите породу"
                className="w-full bg-surface-container-highest rounded-xl px-4 py-3 font-body text-sm text-on-surface placeholder-on-surface-variant/50 focus:outline-none focus:ring-2 focus:ring-primary-fixed"
              />
            )}
          </section>

          {/* Birthday */}
          <section className="bg-surface-container-lowest rounded-2xl p-5 shadow-card flex flex-col gap-3">
            <h2 className="font-headline text-lg font-bold text-primary">🎂 День рождения</h2>
            <input
              type="date"
              value={form.birthday}
              onChange={e => patch('birthday', e.target.value)}
              className="w-full bg-surface-container-highest rounded-xl px-4 py-3 font-body text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary-fixed"
            />
          </section>

          {/* Food */}
          <section className="bg-surface-container-lowest rounded-2xl p-5 shadow-card flex flex-col gap-3">
            <h2 className="font-headline text-lg font-bold text-primary">🍽️ Текущий корм</h2>
            <input
              type="text"
              value={form.food}
              onChange={e => patch('food', e.target.value)}
              placeholder="Название корма"
              className="w-full bg-surface-container-highest rounded-xl px-4 py-3 font-body text-sm text-on-surface placeholder-on-surface-variant/50 focus:outline-none focus:ring-2 focus:ring-primary-fixed"
            />
          </section>

          {/* Vet notes */}
          <section className="bg-surface-container-lowest rounded-2xl p-5 shadow-card flex flex-col gap-3">
            <h2 className="font-headline text-lg font-bold text-primary">🩺 Заметки для врача</h2>
            <textarea
              rows={4}
              placeholder="Аллергии, хронические заболевания, особые указания..."
              value={form.vetNotes}
              onChange={e => patch('vetNotes', e.target.value)}
              className="w-full bg-surface-container-highest rounded-2xl px-4 py-3 font-body text-sm text-on-surface placeholder-on-surface-variant/50 focus:outline-none focus:ring-2 focus:ring-primary-fixed resize-none"
            />
          </section>

        </div>
      </div>

      {/* ── Save Button ── */}
      <div
        className="fixed bottom-0 left-0 w-full px-4 py-3 bg-surface/80 backdrop-blur-xl z-30 flex justify-center"
        style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}
      >
        <button
          onClick={handleSave}
          className="w-full max-w-lg bg-gradient-to-r from-primary to-primary-container text-on-primary font-headline font-bold text-lg py-4 rounded-full shadow-float hover:opacity-90 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
        >
          <span className="material-symbols-outlined icon-fill text-[22px]">check_circle</span>
          Сохранить
        </button>
      </div>

      {/* ── Crop modal ── */}
      {cropSrc && (
        <CropModal
          src={cropSrc}
          onApply={cropped => { patch('avatarBase64', cropped); setCropSrc(null) }}
          onCancel={() => setCropSrc(null)}
        />
      )}
    </div>
  )
}
