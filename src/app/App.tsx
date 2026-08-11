import { Outlet } from 'react-router-dom'
import { AppNavigation } from '../components/layout/AppNavigation'
import { OfflineBanner } from '../components/layout/OfflineBanner'
import { PwaUpdatePrompt } from '../components/layout/PwaUpdatePrompt'

export function App() {
  return (
    <div className="app-shell">
      <OfflineBanner />
      <AppNavigation />
      <main className="app-main">
        <Outlet />
      </main>
      <PwaUpdatePrompt />
    </div>
  )
}
