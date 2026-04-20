import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { DiaryEntry, PetProfile } from '../types'
import { getEntryStatus } from './status'
import { format } from 'date-fns'

const GREEN       = '#4d644b'
const GREEN_MID   = '#6a8c68'
const GREEN_LIGHT = '#daeeda'
const GREEN_PALE  = '#f0f7f0'
const GREEN_TEXT  = '#c8e6c0'
const GRAY_BG     = '#f4f3ef'
const GRAY_LINE   = '#dcdad6'
const GRAY_ROW    = '#f7f6f2'
const TEXT        = '#1b1c1a'
const TEXT_MUTED  = '#5c5f5a'
const WHITE       = '#ffffff'
const AMBER       = '#b06000'
const AMBER_PALE  = '#fef8ee'
const RED         = '#ba1a1a'
const RED_PALE    = '#fff0f0'

function bristolShort(n: number | null): string {
  if (n === null) return '-'
  return `B${n}`
}

function colorLabel(c: string | null): string {
  if (!c) return '-'
  const map: Record<string, string> = {
    brown: 'Brown', 'yellow-green': 'Yel-Grn', green: 'Green', black: 'Black', red: 'Red',
  }
  return map[c] ?? c
}

function moodLabel(m: string): string {
  return m === 'happy' ? 'Happy' : m === 'neutral' ? 'Neutral' : 'Lethargic'
}

function appetiteLabel(a: string): string {
  return a === 'normal' ? 'Normal' : a === 'reduced' ? 'Reduced' : 'Refused'
}

function entryStatusLabel(entry: DiaryEntry): string {
  const s = getEntryStatus(entry)
  return s === 'green' ? 'Normal' : s === 'yellow' ? 'Mild' : 'Episode'
}

export interface ExportOptions {
  entries: DiaryEntry[]
  pet: PetProfile
  fromDate: string
  toDate: string
  includePhotos: boolean
  includeNotes: boolean
  includeStats: boolean
}

// Load Roboto (with Cyrillic) into jsPDF from pdfmake's bundled VFS
async function loadRoboto(doc: jsPDF): Promise<void> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mod = (await import('pdfmake/build/vfs_fonts')) as any
  const pdfFonts = mod.default ?? mod
  const vfs = pdfFonts.pdfMake?.vfs ?? pdfFonts.vfs ?? pdfFonts

  doc.addFileToVFS('Roboto-Regular.ttf', vfs['Roboto-Regular.ttf'])
  doc.addFont('Roboto-Regular.ttf', 'Roboto', 'normal')
  doc.addFileToVFS('Roboto-Medium.ttf', vfs['Roboto-Medium.ttf'])
  doc.addFont('Roboto-Medium.ttf', 'Roboto', 'bold')
  doc.setFont('Roboto', 'normal')
}

export async function generateVetPDF(opts: ExportOptions): Promise<void> {
  const { entries, pet, fromDate, toDate, includePhotos, includeNotes, includeStats } = opts

  const doc = new jsPDF({ unit: 'pt', format: 'a4' })
  await loadRoboto(doc)

  const PAGE_W = doc.internal.pageSize.getWidth()
  const PAGE_H = doc.internal.pageSize.getHeight()
  const MARGIN = 32
  const CW = PAGE_W - MARGIN * 2

  const filtered = entries
    .filter(e => e.date >= fromDate && e.date <= toDate)
    .sort((a, b) => b.date.localeCompare(a.date))

  let y = MARGIN

  // ── Header block ──────────────────────────────────────────────────────────
  doc.setFillColor(GREEN)
  doc.roundedRect(MARGIN, y, CW, 72, 10, 10, 'F')

  doc.setFont('Roboto', 'bold')
  doc.setFontSize(17)
  doc.setTextColor(WHITE)
  doc.text(`${pet.name} — Health Journal`, MARGIN + 16, y + 28)

  doc.setFont('Roboto', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(GREEN_TEXT)
  doc.text(
    `Digestive Health Report   |   Generated: ${format(new Date(), 'dd.MM.yyyy')}`,
    MARGIN + 16, y + 48
  )
  doc.text(`Period: ${fromDate}  —  ${toDate}`, MARGIN + 16, y + 62)

  y += 72 + 10

  // ── Dog info block ────────────────────────────────────────────────────────
  const hasNotes = pet.vetNotes.trim().length > 0
  const dobFormatted = pet.birthday ? pet.birthday.split('-').reverse().join('.') : '-'
  const infoSubline = `Breed: ${pet.breed}   |   DOB: ${dobFormatted}${pet.food ? `   |   Diet: ${pet.food}` : ''}`
  const notesLines = hasNotes ? doc.splitTextToSize(`Medical notes: ${pet.vetNotes}`, CW - 28) : []
  const infoHeight = 38 + (hasNotes ? 14 + notesLines.length * 11 : 6)

  doc.setFillColor(GREEN_LIGHT)
  doc.roundedRect(MARGIN, y, CW, infoHeight, 10, 10, 'F')

  doc.setFont('Roboto', 'bold')
  doc.setFontSize(11)
  doc.setTextColor(TEXT)
  doc.text(pet.name, MARGIN + 14, y + 20)

  doc.setFont('Roboto', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(TEXT_MUTED)
  doc.text(infoSubline, MARGIN + 14, y + 36)

  if (hasNotes) {
    doc.text(notesLines, MARGIN + 14, y + 52)
  }

  y += infoHeight + 10

  // ── Stats cards ───────────────────────────────────────────────────────────
  if (includeStats && filtered.length > 0) {
    const total    = filtered.length
    const good     = filtered.filter(e => getEntryStatus(e) === 'green').length
    const episodes = filtered.filter(e => getEntryStatus(e) === 'red').length
    const mild     = total - good - episodes

    const gap = 10
    const cardW = (CW - gap * 3) / 4
    const cardH = 62

    const cards = [
      { label: 'Total entries', value: total,    bg: GRAY_BG,    fg: TEXT },
      { label: 'Good days',     value: good,     bg: GREEN_PALE, fg: GREEN },
      { label: 'Mild symptoms', value: mild,     bg: AMBER_PALE, fg: AMBER },
      { label: 'Episodes',      value: episodes, bg: RED_PALE,   fg: RED },
    ]

    cards.forEach((card, i) => {
      const x = MARGIN + (cardW + gap) * i

      doc.setFillColor(card.bg)
      doc.roundedRect(x, y, cardW, cardH, 8, 8, 'F')

      doc.setFont('Roboto', 'bold')
      doc.setFontSize(22)
      doc.setTextColor(card.fg)
      const valueStr = String(card.value)
      const valueW = doc.getTextWidth(valueStr)
      doc.text(valueStr, x + cardW / 2 - valueW / 2, y + 32)

      doc.setFont('Roboto', 'normal')
      doc.setFontSize(8)
      doc.setTextColor(TEXT_MUTED)
      const labelW = doc.getTextWidth(card.label)
      doc.text(card.label, x + cardW / 2 - labelW / 2, y + 50)
    })

    y += cardH + 14
  }

  // ── Data table ────────────────────────────────────────────────────────────
  // Build a date→entry lookup for fast previous-day access
  const entryByDate = new Map(filtered.map(e => [e.date, e]))

  function nightFastLabel(e: DiaryEntry): string {
    if (!e.food.morningFed) return '—'
    const prevDate = new Date(e.date)
    prevDate.setDate(prevDate.getDate() - 1)
    const prev = entryByDate.get(prevDate.toISOString().split('T')[0])
    if (!prev?.food.eveningFed) return '—'
    const [pH, pM] = prev.food.eveningTime.split(':').map(Number)
    const [cH, cM] = e.food.morningTime.split(':').map(Number)
    const diff = (cH * 60 + cM + 24 * 60) - (pH * 60 + pM)
    const h = Math.floor(diff / 60)
    const m = diff % 60
    return m > 0 ? `${h}h ${m}m` : `${h}h`
  }

  const head = [['Date', 'Stool', 'Bristol', 'Color', 'Mucus', 'Blood', 'Fast', 'Treats', 'Mood', 'Appetite', 'Status']]
  const body = filtered.map(e => {
    const walks   = [e.stool.morning, e.stool.afternoon, e.stool.evening].filter(w => w.hadStool)
    const bristols = walks.map(w => bristolShort(w.bristolScale)).join(', ') || '-'
    const colors   = [...new Set(walks.map(w => colorLabel(w.color)))].filter(c => c !== '-').join(', ') || '-'
    const mucus    = walks.some(w => w.mucus) ? 'Yes' : 'No'
    const blood    = walks.some(w => w.visibleBlood) ? 'Yes' : 'No'
    const treats   = e.food.treatsGiven ? (e.food.treatDetails.trim() || 'Yes') : 'No'
    return [
      e.date,
      String(walks.length),
      bristols,
      colors,
      mucus,
      blood,
      nightFastLabel(e),
      treats,
      moodLabel(e.behavior.mood),
      appetiteLabel(e.behavior.appetite),
      entryStatusLabel(e),
    ]
  })

  // 11 columns, widths summing to CW (531):
  // 72+31+44+62+36+36+40+36+48+58+68 = 531
  autoTable(doc, {
    startY: y,
    head,
    body,
    theme: 'plain',
    styles: {
      font: 'Roboto',
      fontSize: 8,
      textColor: TEXT,
      cellPadding: 5,
      lineColor: GRAY_LINE,
      lineWidth: 0,
    },
    headStyles: {
      font: 'Roboto',
      fontStyle: 'bold',
      fillColor: GREEN,
      textColor: WHITE,
      fontSize: 8,
      halign: 'left',
      cellPadding: { top: 7, bottom: 7, left: 5, right: 5 },
    },
    bodyStyles: {
      lineColor: GRAY_LINE,
      lineWidth: { top: 0.3, bottom: 0, left: 0, right: 0 },
    },
    alternateRowStyles: { fillColor: GRAY_ROW },
    columnStyles: {
      // Fixed-width columns sized to their longest content + 10pt padding
      0:  { cellWidth: 58 },              // "2026-04-19" ~48pt
      1:  { cellWidth: 32, halign: 'center' }, // "Stool" header ~22pt
      2:  { cellWidth: 36 },              // flexible: Bristol values
      3:  { cellWidth: 72 },              // flexible: Color values
      4:  { cellWidth: 34, halign: 'center' }, // "Mucus"/"Yes"/"No" ~24pt
      5:  { cellWidth: 34, halign: 'center' }, // "Blood"/"Yes"/"No" ~24pt
      6:  { cellWidth: 44, halign: 'center' }, // "12h 30m" ~34pt
      7:  { cellWidth: 73 },              // flexible: Treats / treat details
      8:  { cellWidth: 52 },              // "Lethargic" ~42pt
      9:  { cellWidth: 48 },              // "Appetite" header ~38pt
      10: { cellWidth: 48, fontStyle: 'bold' }, // "Episode" ~38pt bold
    },
    margin: { left: MARGIN, right: MARGIN, bottom: MARGIN + 20 },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    didParseCell: (data: any) => {
      if (data.section !== 'body') return
      const col = data.column.index
      const val = String(data.cell.raw ?? '')
      if (col === 4 && val === 'Yes') data.cell.styles.textColor = AMBER
      if (col === 5 && val === 'Yes') data.cell.styles.textColor = RED
      if (col === 7 && val !== 'No') data.cell.styles.textColor = AMBER
      if (col === 10) {
        if (val === 'Episode') data.cell.styles.textColor = RED
        else if (val === 'Normal') data.cell.styles.textColor = GREEN
        else if (val === 'Mild') data.cell.styles.textColor = AMBER
      }
    },
  })

  // ── Notes pages ───────────────────────────────────────────────────────────
  if (includeNotes) {
    const withNotes = filtered.filter(e => e.notes.trim())
    if (withNotes.length > 0) {
      doc.addPage()
      let ny = MARGIN + 10

      doc.setFont('Roboto', 'bold')
      doc.setFontSize(14)
      doc.setTextColor(GREEN)
      doc.text('Notes', MARGIN, ny)
      ny += 22

      withNotes.forEach(e => {
        doc.setFont('Roboto', 'bold')
        doc.setFontSize(9)
        doc.setTextColor(GREEN_MID)
        doc.text(e.date, MARGIN, ny)
        ny += 13

        doc.setFont('Roboto', 'normal')
        doc.setFontSize(9)
        doc.setTextColor(TEXT)
        const lines = doc.splitTextToSize(e.notes, CW)
        doc.text(lines, MARGIN, ny)
        ny += lines.length * 11 + 10

        if (ny > PAGE_H - MARGIN - 30) {
          doc.addPage()
          ny = MARGIN + 10
        }
      })
    }
  }

  // ── Photos pages ──────────────────────────────────────────────────────────
  if (includePhotos) {
    const withPhotos = filtered.filter(e => e.photoBase64)
    if (withPhotos.length > 0) {
      doc.addPage()
      let py = MARGIN + 10

      doc.setFont('Roboto', 'bold')
      doc.setFontSize(14)
      doc.setTextColor(GREEN)
      doc.text('Photos', MARGIN, py)
      py += 22

      for (const e of withPhotos) {
        if (py > PAGE_H - MARGIN - 200) {
          doc.addPage()
          py = MARGIN + 10
        }
        doc.setFont('Roboto', 'bold')
        doc.setFontSize(9)
        doc.setTextColor(TEXT_MUTED)
        doc.text(e.date, MARGIN, py)
        py += 14

        try {
          const img = new Image()
          await new Promise<void>(resolve => { img.onload = () => resolve(); img.src = e.photoBase64! })
          const ratio = Math.min(CW / img.naturalWidth, 300 / img.naturalHeight, 1)
          const w = Math.round(img.naturalWidth * ratio)
          const h = Math.round(img.naturalHeight * ratio)
          doc.addImage(e.photoBase64!, 'JPEG', MARGIN, py, w, h)
          py += h + 12
        } catch {
          // skip broken image
        }
      }
    }
  }

  // ── Footer on every page ──────────────────────────────────────────────────
  const pageCount = doc.getNumberOfPages()
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i)
    doc.setFont('Roboto', 'normal')
    doc.setFontSize(7)
    doc.setTextColor(TEXT_MUTED)
    const footerText = `${pet.name} Health Journal  |  Page ${i} of ${pageCount}  |  For veterinary use`
    const footerW = doc.getTextWidth(footerText)
    doc.text(footerText, PAGE_W / 2 - footerW / 2, PAGE_H - 18)
  }

  const filename = `${pet.name.toLowerCase()}-health-${fromDate}-${toDate}.pdf`
  doc.save(filename)
}
