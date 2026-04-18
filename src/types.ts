export interface StoolWalk {
  time: string
  occurred: boolean
  bristolScale: 1 | 2 | 3 | 4 | 5 | 6 | 7 | null
  color: 'brown' | 'yellow-green' | 'green' | 'black' | 'red' | null
  mucus: boolean
  strongSmell: boolean
  visibleBlood: boolean
}

export interface DiaryEntry {
  id: string
  date: string // ISO date YYYY-MM-DD
  time: string // HH:mm
  stomach: {
    rumbling: boolean
  }
  stool: {
    morning: StoolWalk
    afternoon: StoolWalk
    evening: StoolWalk
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

export interface PetProfile {
  name: string
  breed: string
  birthday: string
  food: string
  vetNotes: string
  avatarBase64: string | null
}

export const POPULAR_BREEDS = [
  'Cavalier King Charles Spaniel',
  'Labrador Retriever',
  'French Bulldog',
  'Golden Retriever',
  'German Shepherd',
  'Poodle',
  'Bulldog',
  'Beagle',
  'Rottweiler',
  'Dachshund',
  'Pembroke Welsh Corgi',
  'Australian Shepherd',
  'Yorkshire Terrier',
  'Doberman Pinscher',
  'Boxer',
  'Miniature Schnauzer',
  'Siberian Husky',
  'Great Dane',
  'Shih Tzu',
  'Border Collie',
  'Bernese Mountain Dog',
  'Pomeranian',
  'Shetland Sheepdog',
  'Cocker Spaniel',
  'Maltese',
  'Chihuahua',
  'Bichon Frise',
  'Boston Terrier',
  'Jack Russell Terrier',
  'Staffordshire Bull Terrier',
  'Weimaraner',
  'Whippet',
  'Basset Hound',
  'Havanese',
  'Другая порода',
]

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

export const WALK_LABELS: Record<keyof DiaryEntry['stool'], { label: string; icon: string; defaultTime: string }> = {
  morning:   { label: 'Утренняя прогулка',  icon: '🌅', defaultTime: '08:00' },
  afternoon: { label: 'Дневная прогулка',   icon: '☀️', defaultTime: '14:00' },
  evening:   { label: 'Вечерняя прогулка',  icon: '🌙', defaultTime: '20:00' },
}
