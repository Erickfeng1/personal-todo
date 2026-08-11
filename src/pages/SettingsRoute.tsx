import { lazy, Suspense } from 'react'

const SettingsPage = lazy(() =>
  import('./SettingsPage').then((module) => ({
    default: module.SettingsPage
  }))
)

export function SettingsRoute() {
  return (
    <Suspense fallback={<div className="route-loading">正在读取本地设置…</div>}>
      <SettingsPage />
    </Suspense>
  )
}
