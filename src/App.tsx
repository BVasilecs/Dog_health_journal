import { AppProvider, useApp } from './context/AppContext'
import BottomNav from './components/BottomNav'
import HomeScreen from './screens/HomeScreen'
import CalendarScreen from './screens/CalendarScreen'
import StatsScreen from './screens/StatsScreen'
import ExportScreen from './screens/ExportScreen'
import EntryScreen from './screens/EntryScreen'

function AppShell() {
  const { state } = useApp()

  return (
    <div className="relative h-full bg-surface overflow-hidden">
      {/* ── Main Screens ── */}
      <div className="h-full overflow-hidden">
        {state.activeScreen === 'home'     && <HomeScreen />}
        {state.activeScreen === 'calendar' && <CalendarScreen />}
        {state.activeScreen === 'stats'    && <StatsScreen />}
        {state.activeScreen === 'export'   && <ExportScreen />}
      </div>

      {/* ── Entry screen: full-screen overlay that slides up ── */}
      {state.entryScreenOpen && (
        <div className="fixed inset-0 z-50 screen-enter">
          <EntryScreen />
        </div>
      )}

      {/* ── Bottom navigation (hidden when entry screen is open) ── */}
      {!state.entryScreenOpen && <BottomNav />}
    </div>
  )
}

export default function App() {
  return (
    <AppProvider>
      <AppShell />
    </AppProvider>
  )
}
