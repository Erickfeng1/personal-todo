import { useRegisterSW } from 'virtual:pwa-register/react'

export function PwaUpdatePrompt() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker
  } = useRegisterSW()

  if (!needRefresh) return null

  return (
    <div className="update-toast" role="status">
      <span>新版本已准备好</span>
      <button type="button" onClick={() => void updateServiceWorker(true)}>
        刷新更新
      </button>
      <button type="button" onClick={() => setNeedRefresh(false)}>
        稍后
      </button>
    </div>
  )
}
