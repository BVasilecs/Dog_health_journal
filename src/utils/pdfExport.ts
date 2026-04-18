import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { DiaryEntry, PetProfile } from '../types'
import { getEntryStatus } from './status'
import { format } from 'date-fns'

function bristolLabel(n: number | null): string {
  if (n === null) return '-'
  const map: Record<number, string> = {
    1: '1 - Hard lumps',
    2: '2 - Lumpy',
    3: '3 - Cracked',
    4: '4 - Normal',
    5: '5 - Soft pieces',
    6: '6 - Mushy',
    7: '7 - Liquid',
  }
  return map[n] ?? String(n)
}

function colorLabel(c: string | null): string {
  if (!c) return '-'
  const map: Record<string, string> = {
    brown: 'Brown',
    'yellow-green': 'Yellow-green',
    green: 'Green',
    black: 'Black',
    red: 'Red',
  }
  return map[c] ?? c
}

function moodLabel(m: string): string {
  return m === 'happy' ? 'Happy' : m === 'neutral' ? 'Neutral' : 'Lethargic'
}

function appetiteLabel(a: string): string {
  return a === 'normal' ? 'Normal' : a === 'reduced' ? 'Reduced' : 'Refused'
}

function bool(v: boolean): string {
  return v ? 'Yes' : 'No'
}

function entryStatus(entry: DiaryEntry): string {
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

export function generateVetPDF(opts: ExportOptions): void {
  const { entries, pet, fromDate, toDate, includePhotos, includeNotes, includeStats } = opts

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
  doc.text(`${pet.name} Health Journal`, margin, 14)
  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.text(`Digestive Health Report  |  Generated: ${format(new Date(), 'dd.MM.yyyy')}`, margin, 22)
  doc.text(`Period: ${fromDate} — ${toDate}`, margin, 29)

  // ── Dog Info ──
  let y = 46
  doc.setTextColor(27, 28, 26)
  doc.setFillColor(207, 234, 202)

  // Calculate height based on whether there are vet notes
  const hasVetNotes = pet.vetNotes.trim().length > 0
  const infoBoxH = hasVetNotes ? 38 : 26
  doc.roundedRect(margin, y, pageW - margin * 2, infoBoxH, 3, 3, 'F')

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11)
  doc.text(pet.name, margin + 4, y + 8)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  const dobFormatted = pet.birthday
    ? pet.birthday.split('-').reverse().join('.')
    : '-'
  doc.text(`Breed: ${pet.breed}   |   DOB: ${dobFormatted}${pet.food ? `   |   Diet: ${pet.food}` : ''}`, margin + 4, y + 16)

  if (hasVetNotes) {
    doc.text(`Medical notes: ${pet.vetNotes}`, margin + 4, y + 24, { maxWidth: pageW - margin * 2 - 8 })
  }

  y += infoBoxH + 8

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
    doc.text(`Good days: ${good}`, margin + 44, y + 8)
    doc.text(`Mild symptoms: ${mild}`, margin + 90, y + 8)
    doc.text(`Episodes: ${episodes}`, margin + 145, y + 8)
    y += 28
  }

  // ── Table ──
  const columns = [
    { header: 'Date',      dataKey: 'date' },
    { header: 'Walks',     dataKey: 'times' },
    { header: 'Bristol',   dataKey: 'bristol' },
    { header: 'Color',     dataKey: 'color' },
    { header: 'Mucus',     dataKey: 'mucus' },
    { header: 'Blood',     dataKey: 'blood' },
    { header: 'Mood',      dataKey: 'mood' },
    { header: 'Appetite',  dataKey: 'appetite' },
    { header: 'Status',    dataKey: 'status' },
  ]

  const rows = filtered.map(e => {
    const walks = [e.stool.morning, e.stool.afternoon, e.stool.evening].filter(w => w.occurred)
    const bristols = walks.map(w => bristolLabel(w.bristolScale)).join('\n')
    const colors = [...new Set(walks.map(w => colorLabel(w.color)))].filter(c => c !== '-').join(', ') || '-'
    const anyMucus = walks.some(w => w.mucus)
    const anyBlood = walks.some(w => w.visibleBlood)
    return {
      date: e.date,
      times: String(walks.length),
      bristol: bristols || '-',
      color: colors,
      mucus: bool(anyMucus),
      blood: bool(anyBlood),
      mood: moodLabel(e.behavior.mood),
      appetite: appetiteLabel(e.behavior.appetite),
      status: entryStatus(e),
    }
  })

  autoTable(doc, {
    startY: y,
    head: [columns.map(c => c.header)],
    body: rows.map(r => columns.map(c => (r as Record<string, string>)[c.dataKey])),
    styles: { fontSize: 8, cellPadding: 2.5, lineColor: [220, 218, 214], lineWidth: 0.1 },
    headStyles: { fillColor: [77, 100, 75], textColor: 255, fontStyle: 'bold', fontSize: 8 },
    alternateRowStyles: { fillColor: [245, 243, 239] },
    columnStyles: {
      0: { cellWidth: 22 },  // Date
      1: { cellWidth: 12, halign: 'center' },  // Walks
      2: { cellWidth: 36 },  // Bristol
      3: { cellWidth: 26 },  // Color
      4: { cellWidth: 14, halign: 'center' },  // Mucus
      5: { cellWidth: 14, halign: 'center' },  // Blood
      6: { cellWidth: 20 },  // Mood
      7: { cellWidth: 20 },  // Appetite
      8: { cellWidth: 18 },  // Status
    },
    didParseCell: (data) => {
      if (data.section === 'body' && data.column.index === 8) {
        const val = data.cell.raw as string
        if (val === 'Episode') data.cell.styles.textColor = [186, 26, 26]
        else if (val === 'Normal') data.cell.styles.textColor = [77, 100, 75]
        data.cell.styles.fontStyle = 'bold'
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
      `${pet.name} Health Journal  |  Page ${i} of ${pageCount}  |  For veterinary use`,
      pageW / 2,
      doc.internal.pageSize.getHeight() - 6,
      { align: 'center' }
    )
  }

  const filename = `${pet.name.toLowerCase()}-health-${fromDate}-${toDate}.pdf`
  doc.save(filename)
}
