import type { DataStatistics } from '../../data/backup/backup.types'
import { useCloudAuth } from '../../auth/cloud-auth-context'
import { useCloudSyncInspection } from '../../hooks/useCloudSyncInspection'
import type { CloudSyncClient } from '../../sync/cloud-sync-client'

interface AccountSyncSectionProps {
  statistics: DataStatistics | undefined
  client?: CloudSyncClient
}

function localTaskCount(statistics: DataStatistics | undefined): number | null {
  if (!statistics) return null
  return (
    statistics.activeTaskCount +
    statistics.completedTaskCount +
    statistics.deletedTaskCount
  )
}

export function AccountSyncSection({
  statistics,
  client
}: AccountSyncSectionProps) {
  const auth = useCloudAuth()
  const cloud = useCloudSyncInspection(client)
  const taskCount = localTaskCount(statistics)

  return (
    <section className="settings-section" aria-labelledby="account-title">
      <div className="settings-section-header">
        <div>
          <span>ACCOUNT</span>
          <h2 id="account-title">账号与同步</h2>
        </div>
        <p>登录只会读取云端概况，不会自动上传或覆盖本地数据。</p>
      </div>

      {auth.status === 'loading' ? (
        <p className="account-status" role="status">
          正在恢复账号会话…
        </p>
      ) : null}

      {auth.status === 'unavailable' ? (
        <div className="account-panel">
          <div>
            <h3>当前保持本地模式</h3>
            <p>认证尚未配置，本地任务、筛选和备份功能不受影响。</p>
          </div>
        </div>
      ) : null}

      {auth.status === 'signed-out' ? (
        <div className="account-panel">
          <div>
            <h3>未登录</h3>
            <p>登录后可以检查云端是否已有数据。启用首次同步仍需要单独确认。</p>
          </div>
          <button
            type="button"
            className="primary-button account-action"
            onClick={auth.openSignIn}
          >
            登录账号
          </button>
        </div>
      ) : null}

      {auth.status === 'signed-in' ? (
        <>
          <div className="account-panel">
            <div>
              <h3>{auth.userLabel ?? '当前账号'}</h3>
              <p>已登录；同步尚未启用，本地数据不会被自动上传。</p>
            </div>
            <button
              type="button"
              className="secondary-button account-action"
              onClick={() => void auth.signOut()}
            >
              退出登录
            </button>
          </div>

          <div className="sync-summary" aria-label="本地与云端数据概况">
            <div>
              <span>LOCAL</span>
              <strong>{taskCount ?? '—'}</strong>
              <p>本地任务记录</p>
            </div>
            <div>
              <span>CLOUD</span>
              <strong>
                {cloud.status === 'ready'
                  ? (cloud.inspection?.state.counts.tasks ?? '—')
                  : '—'}
              </strong>
              <p>
                {cloud.status === 'loading' ? '正在检查云端…' : null}
                {cloud.status === 'ready' && cloud.inspection?.state.cloudEmpty
                  ? '云端为空'
                  : null}
                {cloud.status === 'ready' &&
                cloud.inspection?.state.cloudEmpty === false
                  ? '云端已有数据'
                  : null}
                {cloud.status === 'unauthorized' ? '会话已失效' : null}
                {cloud.status === 'error' ? '暂时无法读取' : null}
              </p>
            </div>
          </div>

          {cloud.status === 'unauthorized' || cloud.status === 'error' ? (
            <div className="sync-read-error" role="status">
              <p>
                {cloud.status === 'unauthorized'
                  ? '账号会话已失效，请重新登录。本地任务仍安全保存在当前设备。'
                  : '暂时无法读取云端概况。本地功能不受影响。'}
              </p>
              <button
                type="button"
                className="secondary-button account-action"
                onClick={cloud.retry}
              >
                重试
              </button>
            </div>
          ) : null}

          <p className="sync-disabled-note">
            当前阶段仅验证账号与云端隔离。首次上传会在下一阶段提供独立说明与确认，不会在这里自动开始。
          </p>
        </>
      ) : null}
    </section>
  )
}
