export interface DiaryEntry {
  id: string
  date: string // ISO date YYYY-MM-DD
  time: string // HH:mm
  stomach: {
    rumbling: boolean
  }
  stool: {
    bristolScale: 1 | 2 | 3 | 4 | 5 | 6 | 7 | null
    color: 'brown' | 'yellow-green' | 'green' | 'black' | 'red' | null
    mucus: boolean
    strongSmell: boolean
    visibleBlood: boolean
    timesPerDay: number
  }
  food: {
    morningFed: boolean
    morningTime: string
    afternoonFed: boolean
    afternoonTime: string
    eveningFed: boolean
    eveningTime: string
    treatsGiven: boolean
    treatDetails: string
  }
  behavior: {
    mood: 'happy' | 'neutral' | 'lethargic'
    appetite: 'normal' | 'reduced' | 'refused'
  }
  photoBase64: string | null
  notes: string
}

export type EntryStatus = 'green' | 'yellow' | 'red'

export type Screen = 'home' | 'calendar' | 'stats' | 'export'

export const BRISTOL_DESCRIPTIONS: Record<number, string> = {
  1: 'Твёрдые комки',
  2: 'Колбаска с комками',
  3: 'Колбаска с трещинами',
  4: 'Гладкая колбаска',
  5: 'Мягкие кусочки',
  6: 'Кашицеобразный',
  7: 'Водянистый',
}

export const STOOL_COLORS: Record<string, { hex: string; label: string }> = {
  brown: { hex: '#8B6914', label: 'Коричневый' },
  'yellow-green': { hex: '#C8B400', label: 'Жёлто-зелёный' },
  green: { hex: '#4A7C59', label: 'Зелёный' },
  black: { hex: '#1a1a1a', label: 'Чёрный' },
  red: { hex: '#C0392B', label: 'Красный' },
}
