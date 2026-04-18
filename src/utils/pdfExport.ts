import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { DiaryEntry } from '../types'
import { getEntryStatus } from './status'
import { format } from 'date-fns'
import { ru } from 'date-fns/locale'

const DOG_INFO = {
  name: 'Endzi (Blackberry White Endzy)',
  breed: 'Cavalier King Charles Spaniel',
  dob: '29.09.2022',
  notes: 'Chiari malformation confirmed (MRI 19.01.2023). Chronic occult blood in stool since 2023. Diet: Royal Canin Hypoallergenic.',
}

function bristolLabel(n: number | null): string {
  if (n === null) return '—'
  const map: Record<number, string> = {
    1: '1 - Твёрдые комки',
    2: '2 - Колбаска с комками',
    3: '3 - С трещинами',
    4: '4 - Норма',
    5: '5 - Мягкие кусочки',
    6: '6 - Кашица',
    7: '7 - Водянистый',
  }
  return map[n] ?? String(n)
}

function colorLabel(c: string | null): string {
  if (!c) return '—'
  const map: Record<string, string> = {
    brown: 'Коричневый',
    'yellow-green': 'Жёлто-зелёный',
    green: 'Зелёный',
    black: 'Чёрный',
    red: 'Красный',
  }
  return map[c] ?? c
}

function moodLabel(m: string): string {
  return m === 'happy' ? 'Весёлая' : m === 'neutral' ? 'Нейтральная' : 'Вялая'
}

function appetiteLabel(a: string): string {
  return a === 'normal' ? 'Норма' : a === 'reduced' ? 'Снижен' : 'Отказ'
}

function bool(v: boolean): string {
  return v ? 'Да' : 'Нет'
}

function statusLabel(entry: DiaryEntry): string {
  const s = getEntryStatus(entry)
  return s === 'green' ? 'Норма' : s === 'yellow' ? 'Симптомы' : 'Эпизод'
}

export interface ExportOptions {
  entries: DiaryEntry[]
  fromDate: string
  toDate: string
  includePhotos: boolean
  includeNotes: boolean
  includeStats: boolean
}

export function generateVetPDF(opts: ExportOptions): void {
  const { entries, fromDate, toDate, includePhotos, includeNotes, includeStats } = opts

  const filtered = entries
    .filter(e => e.date >= fromDate && e.date <= toDate)
    .sort((a, b) => a.date.localeCompare(b.date))

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const pageW = doc.internal.pageSize.getWidth()
  const margin = 14

  // ── Header ──
  doc.setFillColor(77, 100, 75)
  doc.rect(0, 0, pageW, 36, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(18)
  doc.text('Endzi Health Journal', margin, 14)
  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.text(`Digestive Health Report  |  Generated: ${format(new Date(), 'dd.MM.yyyy')}`, margin, 22)
  doc.text(`Period: ${fromDate} — ${toDate}`, margin, 29)

  // ── Dog Info ──
  let y = 46
  doc.setTextColor(27, 28, 26)
  doc.setFillColor(207, 234, 202)
  doc.roundedRect(margin, y, pageW - margin * 2, 30, 3, 3, 'F')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11)
  doc.text(DOG_INFO.name, margin + 4, y + 8)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.text(`Breed: ${DOG_INFO.breed}   |   DOB: ${DOG_INFO.dob}`, margin + 4, y + 15)
  doc.text(`Medical notes: ${DOG_INFO.notes}`, margin + 4, y + 22, { maxWidth: pageW - margin * 2 - 8 })

  y += 38

  // ── Stats summary ──
  if (includeStats && filtered.length > 0) {
    const total = filtered.length
    const good = filtered.filter(e => getEntryStatus(e) === 'green').length
    const episodes = filtered.filter(e => getEntryStatus(e) === 'red').length
    const mild = total - good - episodes

    doc.setFillColor(239, 238, 234)
    doc.roundedRect(margin, y, pageW - margin * 2, 20, 3, 3, 'F')
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(9)
    doc.setTextColor(27, 28, 26)
    doc.text(`Total entries: ${total}`, margin + 4, y + 8)
    doc.text(`Good days: ${good}`, margin + 40, y + 8)
    doc.text(`Mild symptoms: ${mild}`, margin + 80, y + 8)
    doc.text(`Episodes: ${episodes}`, margin + 130, y + 8)
    y += 28
  }

  // ── Table ──
  const columns = [
    { header: 'Date', dataKey: 'date' },
    { header: 'Bristol', dataKey: 'bristol' },
    { header: 'Color', dataKey: 'color' },
    { header: 'Mucus', dataKey: 'mucus' },
    { header: 'Blood', dataKey: 'blood' },
    { header: 'x/day', dataKey: 'times' },
    { header: 'Mood', dataKey: 'mood' },
    { header: 'Appetite', dataKey: 'appetite' },
    { header: 'Status', dataKey: 'status' },
  ]

  const rows = filtered.map(e => ({
    date: e.date,
    bristol: bristolLabel(e.stool.bristolScale),
    color: colorLabel(e.stool.color),
    mucus: bool(e.stool.mucus),
    blood: bool(e.stool.visibleBlood),
    times: String(e.stool.timesPerDay),
    mood: moodLabel(e.behavior.mood),
    appetite: appetiteLabel(e.behavior.appetite),
    status: statusLabel(e),
  }))

  autoTable(doc, {
    startY: y,
    head: [columns.map(c => c.header)],
    body: rows.map(r => columns.map(c => (r as Record<string, string>)[c.dataKey])),
    styles: { fontSize: 8, cellPadding: 2 },
    headStyles: { fillColor: [77, 100, 75], textColor: 255, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [245, 243, 239] },
    didParseCell: (data) => {
      if (data.section === 'body' && data.column.index === 8) {
        const val = data.cell.raw as string
        if (val === 'Эпизод') data.cell.styles.textColor = [186, 26, 26]
        else if (val === 'Норма') data.cell.styles.textColor = [77, 100, 75]
      }
    },
    margin: { left: margin, right: margin },
  })

  // ── Notes pages ──
  if (includeNotes) {
    const withNotes = filtered.filter(e => e.notes.trim())
    if (withNotes.length > 0) {
      doc.addPage()
      doc.setFillColor(77, 100, 75)
      doc.rect(0, 0, pageW, 18, 'F')
      doc.setTextColor(255, 255, 255)
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(13)
      doc.text('Notes', margin, 12)
      let ny = 28
      withNotes.forEach(e => {
        if (ny > 270) { doc.addPage(); ny = 20 }
        doc.setTextColor(77, 100, 75)
        doc.setFont('helvetica', 'bold')
        doc.setFontSize(9)
        doc.text(e.date, margin, ny)
        ny += 5
        doc.setFont('helvetica', 'normal')
        doc.setTextColor(27, 28, 26)
        const lines = doc.splitTextToSize(e.notes, pageW - margin * 2)
        doc.text(lines, margin, ny)
        ny += lines.length * 5 + 6
      })
    }
  }

  // ── Photos pages ──
  if (includePhotos) {
    const withPhotos = filtered.filter(e => e.photoBase64)
    if (withPhotos.length > 0) {
      doc.addPage()
      doc.setFillColor(77, 100, 75)
      doc.rect(0, 0, pageW, 18, 'F')
      doc.setTextColor(255, 255, 255)
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(13)
      doc.text('Photos', margin, 12)
      let py = 26
      withPhotos.forEach(e => {
        if (py > 220) { doc.addPage(); py = 20 }
        doc.setTextColor(27, 28, 26)
        doc.setFont('helvetica', 'bold')
        doc.setFontSize(9)
        doc.text(e.date, margin, py)
        py += 4
        try {
          doc.addImage(e.photoBase64!, 'JPEG', margin, py, 70, 55)
          py += 62
        } catch {
          py += 4
        }
      })
    }
  }

  // ── Footer ──
  const pageCount = doc.getNumberOfPages()
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i)
    doc.setTextColor(115, 121, 113)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7)
    doc.text(
      `Endzi Health Journal  |  Page ${i} of ${pageCount}  |  For veterinary use`,
      pageW / 2,
      doc.internal.pageSize.getHeight() - 6,
      { align: 'center' }
    )
  }

  const filename = `endzi-health-${fromDate}-${toDate}.pdf`
  doc.save(filename)
}
