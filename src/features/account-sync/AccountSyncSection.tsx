import { useEffect, useState } from 'react'
import type {
  BackupSummary,
  DataStatistics
} from '../../data/backup/backup.types'
import { useCloudAuth } from '../../auth/cloud-auth-context'
import { legacyLocalDataReader } from '../../data/migration/legacy-local-data'
import { cloudStore } from '../../cloud/cloud-store'

interface AccountSyncSectionProps {
  statistics: DataStatistics | undefined
}

function hasLegacyData(summary: BackupSummary | null): boolean {
  return Boolean(
    summary &&
    (summary.taskCount > 0 || summary.projectCount > 0 || summary.tagCount > 0)
  )
}

export function AccountSyncSection({ statistics }: AccountSyncSectionProps) {
  const auth = useCloudAuth()
  const [legacySummary, setLegacySummary] = useState<BackupSummary | null>(null)
  const [migrationState, setMigrationState] = useState<
    'idle' | 'running' | 'done' | 'error'
  >('idle')

  useEffect(() => {
    void legacyLocalDataReader
      .getSummary()
      .then(setLegacySummary)
      .catch(() => setLegacySummary(null))
  }, [])

  const cloudEmpty = Boolean(
    statistics &&
    statistics.activeTaskCount === 0 &&
    statistics.completedTaskCount === 0 &&
    statistics.deletedTaskCount === 0 &&
    statistics.projectCount === 0 &&
    statistics.tagCount === 0
  )

  const migrate = async () => {
    const summary = legacySummary
    if (!summary || !hasLegacyData(summary) || !cloudEmpty) return
    const confirmed = window.confirm(
      `将导入 ${String(summary.taskCount)} 项任务、${String(summary.projectCount)} 个项目和 ${String(summary.tagCount)} 个标签到云端。旧浏览器数据会继续保留。确认继续吗？`
    )
    if (!confirmed) return
    setMigrationState('running')
    try {
      await cloudStore.restore(await legacyLocalDataReader.export(), 'migrate')
      setMigrationState('done')
    } catch {
      setMigrationState('error')
    }
  }

  return (
    <section className="settings-section" aria-labelledby="account-title">
      <div className="settings-section-header">
        <div>
          <span>PRIVATE CLOUD</span>
          <h2 id="account-title">访问与云端数据</h2>
        </div>
        <p>Neon 是任务、项目、标签和设置的唯一持久数据源。</p>
      </div>

      <div className="account-panel">
        <div>
          <h3>{auth.userLabel ?? '私人云端'}</h3>
          <p>访问会话有效；所有写入均等待云数据库确认。</p>
        </div>
        <button
          type="button"
          className="secondary-button account-action"
          onClick={() => void auth.signOut()}
        >
          锁定并退出
        </button>
      </div>

      <div className="sync-summary" aria-label="云端数据概况">
        <div>
          <span>CLOUD TASKS</span>
          <strong>
            {statistics
              ? statistics.activeTaskCount +
                statistics.completedTaskCount +
                statistics.deletedTaskCount
              : '—'}
          </strong>
          <p>Neon 任务记录</p>
        </div>
        <div>
          <span>LEGACY LOCAL</span>
          <strong>{legacySummary?.taskCount ?? '—'}</strong>
          <p>旧浏览器任务，仅用于迁移</p>
        </div>
      </div>

      {hasLegacyData(legacySummary) && cloudEmpty ? (
        <div className="sync-read-error">
          <p>
            检测到旧浏览器数据且云端为空。导入前会再次确认，成功后也不会删除旧数据。
          </p>
          <button
            type="button"
            className="primary-button account-action"
            disabled={migrationState === 'running'}
            onClick={() => void migrate()}
          >
            {migrationState === 'running' ? '正在迁移…' : '导入旧数据到云端'}
          </button>
        </div>
      ) : null}

      {hasLegacyData(legacySummary) && !cloudEmpty ? (
        <p className="sync-disabled-note">
          云端已有数据，因此不会自动覆盖。请先导出云端备份；旧浏览器数据仍保持原样。
        </p>
      ) : null}
      {migrationState === 'done' ? (
        <p className="settings-message" role="status">
          旧数据已导入云端并重新加载。
        </p>
      ) : null}
      {migrationState === 'error' ? (
        <p className="inline-error" role="alert">
          迁移失败，旧浏览器数据没有被修改。
        </p>
      ) : null}
    </section>
  )
}
