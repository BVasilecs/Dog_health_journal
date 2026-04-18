import React, { createContext, useContext, useReducer, useEffect } from 'react'
import { DiaryEntry, StoolWalk, Screen } from '../types'

// ── State ──────────────────────────────────────────────────────────────────

interface AppState {
  entries: DiaryEntry[]
  activeScreen: Screen
  editingDate: string | null
  entryScreenOpen: boolean
}

const INITIAL_STATE: AppState = {
  entries: [],
  activeScreen: 'home',
  editingDate: null,
  entryScreenOpen: false,
}

// ── Actions ────────────────────────────────────────────────────────────────

type Action =
  | { type: 'ADD_ENTRY'; payload: DiaryEntry }
  | { type: 'UPDATE_ENTRY'; payload: DiaryEntry }
  | { type: 'DELETE_ENTRY'; payload: string }
  | { type: 'SET_SCREEN'; payload: Screen }
  | { type: 'OPEN_ENTRY'; payload: string | null }
  | { type: 'CLOSE_ENTRY' }
  | { type: 'LOAD_ENTRIES'; payload: DiaryEntry[] }

// ── Reducer ────────────────────────────────────────────────────────────────

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'LOAD_ENTRIES':
      return { ...state, entries: action.payload }
    case 'ADD_ENTRY':
      return { ...state, entries: [...state.entries, action.payload] }
    case 'UPDATE_ENTRY':
      return { ...state, entries: state.entries.map(e => e.id === action.payload.id ? action.payload : e) }
    case 'DELETE_ENTRY':
      return { ...state, entries: state.entries.filter(e => e.id !== action.payload) }
    case 'SET_SCREEN':
      return { ...state, activeScreen: action.payload }
    case 'OPEN_ENTRY':
      return { ...state, entryScreenOpen: true, editingDate: action.payload }
    case 'CLOSE_ENTRY':
      return { ...state, entryScreenOpen: false, editingDate: null }
    default:
      return state
  }
}

// ── Context ────────────────────────────────────────────────────────────────

interface AppContextValue {
  state: AppState
  dispatch: React.Dispatch<Action>
  getEntryForDate: (date: string) => DiaryEntry | undefined
  todayStr: string
}

const AppContext = createContext<AppContextValue | null>(null)

// ── Migration: handle old format entries ───────────────────────────────────

function blankWalk(time: string): StoolWalk {
  return { time, occurred: false, bristolScale: null, color: null, mucus: false, strongSmell: false, visibleBlood: false }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function migrateEntry(raw: any): DiaryEntry {
  // Old format had stool.bristolScale at the top level
  if (raw.stool && 'bristolScale' in raw.stool) {
    const old = raw.stool
    return {
      ...raw,
      stool: {
        morning: {
          time: '08:00',
          occurred: old.timesPerDay > 0,
          bristolScale: old.bristolScale,
          color: old.color,
          mucus: old.mucus,
          strongSmell: old.strongSmell,
          visibleBlood: old.visibleBlood,
        },
        afternoon: blankWalk('14:00'),
        evening: blankWalk('20:00'),
      },
    }
  }
  return raw as DiaryEntry
}

// ── Provider ───────────────────────────────────────────────────────────────

const STORAGE_KEY = 'endzi_diary_entries'

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, INITIAL_STATE)

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) {
        const parsed = JSON.parse(raw)
        const migrated: DiaryEntry[] = Array.isArray(parsed) ? parsed.map(migrateEntry) : []
        dispatch({ type: 'LOAD_ENTRIES', payload: migrated })
      }
    } catch {
      // corrupt storage — start fresh
    }
  }, [])

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state.entries))
  }, [state.entries])

  const todayStr = new Date().toISOString().split('T')[0]
  const getEntryForDate = (date: string) => state.entries.find(e => e.date === date)

  return (
    <AppContext.Provider value={{ state, dispatch, getEntryForDate, todayStr }}>
      {children}
    </AppContext.Provider>
  )
}

// ── Hook ───────────────────────────────────────────────────────────────────

export function useApp() {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp must be used inside AppProvider')
  return ctx
}

// ── Helper: blank entry ────────────────────────────────────────────────────

export function buildBlankEntry(date: string): DiaryEntry {
  const now = new Date()
  const hh = String(now.getHours()).padStart(2, '0')
  const mm = String(now.getMinutes()).padStart(2, '0')
  return {
    id: `${date}-${Date.now()}`,
    date,
    time: `${hh}:${mm}`,
    stomach: { rumbling: false },
    stool: {
      morning:   blankWalk('08:00'),
      afternoon: blankWalk('14:00'),
      evening:   blankWalk('20:00'),
    },
    food: {
      morningFed: false, morningTime: '09:00',
      afternoonFed: false, afternoonTime: '15:00',
      eveningFed: false, eveningTime: '20:00',
      treatsGiven: false, treatDetails: '',
    },
    behavior: { mood: 'neutral', appetite: 'normal' },
    photoBase64: null,
    notes: '',
  }
}
