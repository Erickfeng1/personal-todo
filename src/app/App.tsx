import { Outlet } from 'react-router-dom'
import { AppNavigation } from '../components/layout/AppNavigation'
import { OfflineBanner } from '../components/layout/OfflineBanner'
import { PwaUpdatePrompt } from '../components/layout/PwaUpdatePrompt'
import { AppAppearance } from '../components/layout/AppAppearance'

export function App() {
  return (
    <div className="app-shell">
      <AppAppearance />
      <OfflineBanner />
      <AppNavigation />
      <main className="app-main">
        <Outlet />
      </main>
      <PwaUpdatePrompt />
    </div>
  )
}
