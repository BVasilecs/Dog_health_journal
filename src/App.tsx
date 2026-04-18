import { AppProvider, useApp } from './context/AppContext'
import BottomNav from './components/BottomNav'
import HomeScreen from './screens/HomeScreen'
import CalendarScreen from './screens/CalendarScreen'
import StatsScreen from './screens/StatsScreen'
import ExportScreen from './screens/ExportScreen'
import EntryScreen from './screens/EntryScreen'
import PetSettingsScreen from './screens/PetSettingsScreen'

function AppShell() {
  const { state } = useApp()
  const overlayOpen = state.entryScreenOpen || state.petSettingsOpen

  return (
    <div className="relative h-full bg-surface overflow-hidden">
      {/* ── Main Screens ── */}
      <div className="h-full overflow-hidden">
        {state.activeScreen === 'home'     && <HomeScreen />}
        {state.activeScreen === 'calendar' && <CalendarScreen />}
        {state.activeScreen === 'stats'    && <StatsScreen />}
        {state.activeScreen === 'export'   && <ExportScreen />}
      </div>

      {/* ── Entry screen: full-screen overlay ── */}
      {state.entryScreenOpen && (
        <div className="fixed inset-0 z-50 screen-enter">
          <EntryScreen />
        </div>
      )}

      {/* ── Pet settings: full-screen overlay ── */}
      {state.petSettingsOpen && (
        <div className="fixed inset-0 z-50 screen-enter">
          <PetSettingsScreen />
        </div>
      )}

      {/* ── Bottom navigation (hidden when any overlay is open) ── */}
      {!overlayOpen && <BottomNav />}
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
