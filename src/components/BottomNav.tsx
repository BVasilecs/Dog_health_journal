import { useApp } from '../context/AppContext'
import { Screen } from '../types'

const TABS: { id: Screen; icon: string; label: string }[] = [
  { id: 'home',     icon: 'home',          label: 'Главная' },
  { id: 'calendar', icon: 'calendar_today', label: 'Календарь' },
  { id: 'stats',    icon: 'bar_chart',      label: 'Статистика' },
  { id: 'export',   icon: 'ios_share',      label: 'Экспорт' },
]

export default function BottomNav() {
  const { state, dispatch } = useApp()

  return (
    <nav
      className="fixed bottom-0 left-0 w-full z-40 flex justify-around items-center px-4 pt-3 pb-safe bg-surface/80 backdrop-blur-xl rounded-t-xl shadow-nav"
      style={{ paddingBottom: 'max(1.25rem, env(safe-area-inset-bottom))' }}
    >
      {TABS.map(tab => {
        const active = state.activeScreen === tab.id
        return (
          <button
            key={tab.id}
            onClick={() => dispatch({ type: 'SET_SCREEN', payload: tab.id })}
            className={`flex flex-col items-center justify-center gap-0.5 px-4 py-1.5 rounded-full transition-all duration-200 active:scale-90
              ${active
                ? 'bg-surface-container text-primary'
                : 'text-on-surface-variant hover:bg-surface-container-low'}`}
          >
            <span
              className={`material-symbols-outlined text-[24px] ${active ? 'icon-fill' : ''}`}
            >
              {tab.icon}
            </span>
            <span
              className={`font-label text-[11px] leading-none ${active ? 'font-bold' : 'font-medium'}`}
            >
              {tab.label}
            </span>
          </button>
        )
      })}
    </nav>
  )
}
