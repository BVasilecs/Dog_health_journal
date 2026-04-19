// eslint-disable-next-line @typescript-eslint/no-explicit-any
type TDocumentDefinitions = any
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Content = any
import { DiaryEntry, PetProfile } from '../types'
import { getEntryStatus } from './status'
import { format } from 'date-fns'

function bristolLabel(n: number | null): string {
  if (n === null) return '-'
  const map: Record<number, string> = {
    1: '1 - Hard lumps', 2: '2 - Lumpy', 3: '3 - Cracked',
    4: '4 - Normal',     5: '5 - Soft pieces', 6: '6 - Mushy', 7: '7 - Liquid',
  }
  return map[n] ?? String(n)
}

function colorLabel(c: string | null): string {
  if (!c) return '-'
  const map: Record<string, string> = {
    brown: 'Brown', 'yellow-green': 'Yellow-green',
    green: 'Green', black: 'Black', red: 'Red',
  }
  return map[c] ?? c
}

function moodLabel(m: string): string {
  return m === 'happy' ? 'Happy' : m === 'neutral' ? 'Neutral' : 'Lethargic'
}

function appetiteLabel(a: string): string {
  return a === 'normal' ? 'Normal' : a === 'reduced' ? 'Reduced' : 'Refused'
}

function bool(v: boolean): string { return v ? 'Yes' : 'No' }

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

const GREEN = '#4d644b'
const GREEN_LIGHT = '#cfead2'
const GRAY_BG = '#efeeea'
const TEXT = '#1b1c1a'

export async function generateVetPDF(opts: ExportOptions): Promise<void> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const pdfMakeModule = (await import('pdfmake/build/pdfmake')) as any
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const pdfFontsModule = (await import('pdfmake/build/vfs_fonts')) as any
  const pdfMake = pdfMakeModule.default ?? pdfMakeModule
  const pdfFonts = pdfFontsModule.default ?? pdfFontsModule
  pdfMake.vfs = pdfFonts.pdfMake?.vfs ?? pdfFonts.vfs ?? pdfFonts

  const { entries, pet, fromDate, toDate, includePhotos, includeNotes, includeStats } = opts

  const filtered = entries
    .filter(e => e.date >= fromDate && e.date <= toDate)
    .sort((a, b) => a.date.localeCompare(b.date))

  const content: Content[] = []

  // ── Header ──
  content.push({
    table: {
      widths: ['*'],
      body: [[{
        stack: [
          { text: `${pet.name} Health Journal`, fontSize: 18, bold: true, color: 'white' },
          { text: `Digestive Health Report  |  Generated: ${format(new Date(), 'dd.MM.yyyy')}`, fontSize: 10, color: 'white', margin: [0, 4, 0, 0] },
          { text: `Period: ${fromDate} — ${toDate}`, fontSize: 10, color: 'white', margin: [0, 2, 0, 0] },
        ],
        fillColor: GREEN,
        border: [false, false, false, false],
        margin: [4, 10, 4, 10],
      }]],
    },
    layout: 'noBorders',
    margin: [0, 0, 0, 10],
  })

  // ── Dog Info ──
  const dobFormatted = pet.birthday ? pet.birthday.split('-').reverse().join('.') : '-'
  const infoRows: Content[] = [
    { text: pet.name, fontSize: 11, bold: true, color: TEXT },
    {
      text: `Breed: ${pet.breed}   |   DOB: ${dobFormatted}${pet.food ? `   |   Diet: ${pet.food}` : ''}`,
      fontSize: 9, color: TEXT, margin: [0, 4, 0, 0],
    },
  ]
  if (pet.vetNotes.trim()) {
    infoRows.push({ text: `Medical notes: ${pet.vetNotes}`, fontSize: 9, color: TEXT, margin: [0, 4, 0, 0] })
  }
  content.push({
    table: {
      widths: ['*'],
      body: [[{ stack: infoRows, fillColor: GREEN_LIGHT, border: [false, false, false, false], margin: [6, 8, 6, 8] }]],
    },
    layout: 'noBorders',
    margin: [0, 0, 0, 8],
  })

  // ── Stats summary ──
  if (includeStats && filtered.length > 0) {
    const total = filtered.length
    const good = filtered.filter(e => getEntryStatus(e) === 'green').length
    const episodes = filtered.filter(e => getEntryStatus(e) === 'red').length
    const mild = total - good - episodes
    content.push({
      table: {
        widths: ['*'],
        body: [[{
          text: `Total entries: ${total}     Good days: ${good}     Mild symptoms: ${mild}     Episodes: ${episodes}`,
          fontSize: 9, bold: true, color: TEXT,
          fillColor: GRAY_BG, border: [false, false, false, false],
          margin: [6, 6, 6, 6],
        }]],
      },
      layout: 'noBorders',
      margin: [0, 0, 0, 10],
    })
  }

  // ── Data table ──
  const tableHeaders = ['Date', 'Walks', 'Bristol', 'Color', 'Mucus', 'Blood', 'Mood', 'Appetite', 'Status']
  const tableRows = filtered.map(e => {
    const walks = [e.stool.morning, e.stool.afternoon, e.stool.evening].filter(w => w.occurred)
    const bristols = walks.map(w => bristolLabel(w.bristolScale)).join('\n') || '-'
    const colors = [...new Set(walks.map(w => colorLabel(w.color)))].filter(c => c !== '-').join(', ') || '-'
    const status = entryStatus(e)
    return [
      e.date,
      String(walks.length),
      bristols,
      colors,
      bool(walks.some(w => w.mucus)),
      bool(walks.some(w => w.visibleBlood)),
      moodLabel(e.behavior.mood),
      appetiteLabel(e.behavior.appetite),
      { text: status, bold: true, color: status === 'Episode' ? '#ba1a1a' : status === 'Normal' ? GREEN : TEXT },
    ]
  })

  content.push({
    table: {
      headerRows: 1,
      widths: [32, 18, 52, 38, 20, 20, 30, 30, 28],
      body: [
        tableHeaders.map(h => ({ text: h, bold: true, fontSize: 8, color: 'white', fillColor: GREEN })),
        ...tableRows.map((row, i) => row.map(cell => ({
          ...(typeof cell === 'string' ? { text: cell } : cell),
          fontSize: 8,
          fillColor: i % 2 === 1 ? '#f5f3ef' : 'white',
        }))),
      ],
    },
    layout: {
      hLineWidth: () => 0.3,
      vLineWidth: () => 0.3,
      hLineColor: () => '#dcdad6',
      vLineColor: () => '#dcdad6',
    },
    margin: [0, 0, 0, 0],
  })

  // ── Notes pages ──
  if (includeNotes) {
    const withNotes = filtered.filter(e => e.notes.trim())
    if (withNotes.length > 0) {
      content.push({ text: 'Notes', fontSize: 13, bold: true, color: 'white', background: GREEN, pageBreak: 'before', margin: [0, 0, 0, 8] })
      withNotes.forEach(e => {
        content.push({ text: e.date, fontSize: 9, bold: true, color: GREEN, margin: [0, 6, 0, 2] })
        content.push({ text: e.notes, fontSize: 9, color: TEXT, margin: [0, 0, 0, 4] })
      })
    }
  }

  // ── Photos pages ──
  if (includePhotos) {
    const withPhotos = filtered.filter(e => e.photoBase64)
    if (withPhotos.length > 0) {
      content.push({ text: 'Photos', fontSize: 13, bold: true, color: 'white', background: GREEN, pageBreak: 'before', margin: [0, 0, 0, 8] })
      withPhotos.forEach(e => {
        content.push({ text: e.date, fontSize: 9, bold: true, color: TEXT, margin: [0, 6, 0, 2] })
        try {
          content.push({ image: e.photoBase64!, width: 140, margin: [0, 0, 0, 8] })
        } catch {
          // skip broken image
        }
      })
    }
  }

  const docDef: TDocumentDefinitions = {
    pageSize: 'A4',
    pageMargins: [14, 14, 14, 20],
    defaultStyle: { font: 'Roboto', fontSize: 10, color: TEXT },
    content,
    footer: (currentPage: number, pageCount: number) => ({
      text: `${pet.name} Health Journal  |  Page ${currentPage} of ${pageCount}  |  For veterinary use`,
      alignment: 'center',
      fontSize: 7,
      color: '#737971',
      margin: [0, 4, 0, 0],
    }),
  }

  const filename = `${pet.name.toLowerCase()}-health-${fromDate}-${toDate}.pdf`
  pdfMake.createPdf(docDef).download(filename)
}
