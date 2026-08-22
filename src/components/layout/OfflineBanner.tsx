import { useOnlineStatus } from '../../hooks/useOnlineStatus'

export function OfflineBanner() {
  const isOnline = useOnlineStatus()
  return isOnline ? null : (
    <div className="offline-banner" role="status">
      当前离线，云端数据暂时只读；请联网后再修改
    </div>
  )
}
