import { useOnlineStatus } from '../../hooks/useOnlineStatus'

export function OfflineBanner() {
  const isOnline = useOnlineStatus()
  return isOnline ? null : (
    <div className="offline-banner" role="status">
      当前离线，修改仍会安全保存在本设备
    </div>
  )
}
