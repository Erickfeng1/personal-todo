import { useRef, useState, type ChangeEvent } from 'react'
import { backupService, settingsService } from '../app/services'
import {
  APP_VERSION,
  MAX_BACKUP_FILE_BYTES,
  type BackupEnvelopeV1
} from '../data/backup/backup.types'
import { parseBackupText } from '../data/backup/backup.schema'
import { DATABASE_SCHEMA_VERSION } from '../data/db'
import { AppError } from '../domain/shared/app-error'
import type {
  ThemePreference,
  WeekStartsOn
} from '../domain/settings/settings.types'
import { useDataStatistics, useSettings } from '../hooks/useSettings'
import { AccountSyncSection } from '../features/account-sync/AccountSyncSection'

function backupFileName(exportedAt: string): string {
  const date = new Date(exportedAt)
  const two = (value: number) => String(value).padStart(2, '0')
  return `personal-todo-backup-${String(date.getFullYear())}-${two(date.getMonth() + 1)}-${two(date.getDate())}-${two(date.getHours())}${two(date.getMinutes())}.json`
}

function downloadBackup(backup: BackupEnvelopeV1): void {
  const blob = new Blob([JSON.stringify(backup, null, 2)], {
    type: 'application/json'
  })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = backupFileName(backup.exportedAt)
  anchor.click()
  URL.revokeObjectURL(url)
}

function backupErrorMessage(cause: unknown): string {
  if (!(cause instanceof AppError))
    return '操作失败，请重试。现有数据没有被修改。'
  if (cause.code === 'BACKUP_UNSUPPORTED_VERSION')
    return '这个备份来自不受支持的数据版本，无法恢复。现有数据没有被修改。'
  if (cause.code === 'BACKUP_INVALID')
    return `${cause.message}。现有数据没有被修改。`
  return cause.message
}

export function SettingsPage() {
  const settings = useSettings()
  const statistics = useDataStatistics()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [backupPreview, setBackupPreview] = useState<BackupEnvelopeV1 | null>(
    null
  )
  const [isExporting, setIsExporting] = useState(false)
  const [isRestoring, setIsRestoring] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const updateTheme = async (theme: ThemePreference) => {
    setError(null)
    try {
      await settingsService.update({ theme })
      setMessage('主题设置已保存到云端')
    } catch {
      setError('主题保存失败，请重试。')
    }
  }

  const updateWeekStart = async (weekStartsOn: WeekStartsOn) => {
    setError(null)
    try {
      await settingsService.update({ weekStartsOn })
      setMessage('周起始日已保存')
    } catch {
      setError('周起始日保存失败，请重试。')
    }
  }

  const handleExport = async () => {
    setIsExporting(true)
    setError(null)
    setMessage(null)
    try {
      const backup = await backupService.export()
      downloadBackup(backup)
      setMessage(
        `备份已导出：${String(backup.summary.taskCount)} 项任务、${String(backup.summary.projectCount)} 个项目、${String(backup.summary.tagCount)} 个标签。`
      )
    } catch (cause) {
      setError(backupErrorMessage(cause))
    } finally {
      setIsExporting(false)
    }
  }

  const handleFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    setBackupPreview(null)
    setMessage(null)
    setError(null)
    if (!file) return
    if (file.size > MAX_BACKUP_FILE_BYTES) {
      setError('备份文件超过 20 MB，未读取文件，现有数据没有被修改。')
      event.target.value = ''
      return
    }
    try {
      const backup = parseBackupText(await file.text())
      setBackupPreview(backup)
    } catch (cause) {
      setError(backupErrorMessage(cause))
      event.target.value = ''
    }
  }

  const handleRestore = async () => {
    if (!backupPreview) return
    const confirmed = window.confirm(
      '替换恢复会清除当前任务、项目、标签和设置，再写入所选备份。建议先导出当前数据。确认继续吗？'
    )
    if (!confirmed) return

    setIsRestoring(true)
    setError(null)
    setMessage(null)
    try {
      const summary = await backupService.restore(backupPreview)
      setBackupPreview(null)
      if (fileInputRef.current) fileInputRef.current.value = ''
      setMessage(
        `恢复完成：${String(summary.taskCount)} 项任务、${String(summary.projectCount)} 个项目、${String(summary.tagCount)} 个标签。`
      )
    } catch (cause) {
      setError(backupErrorMessage(cause))
    } finally {
      setIsRestoring(false)
    }
  }

  return (
    <section className="management-page settings-page">
      <header className="page-header">
        <div>
          <span className="eyebrow">PREFERENCES</span>
          <h1>设置</h1>
          <p>管理显示偏好，并随时导出你的云端数据副本。</p>
        </div>
      </header>

      {error ? (
        <div className="inline-error" role="alert">
          {error}
        </div>
      ) : null}
      {message ? (
        <div className="settings-message" role="status">
          {message}
        </div>
      ) : null}

      <AccountSyncSection statistics={statistics} />

      <section className="settings-section" aria-labelledby="appearance-title">
        <div className="settings-section-header">
          <div>
            <span>APPEARANCE</span>
            <h2 id="appearance-title">显示与日期</h2>
          </div>
          <p>偏好保存到云端，并在设备之间保持一致。</p>
        </div>

        <fieldset className="settings-choice">
          <legend>主题</legend>
          <div className="choice-grid">
            {(
              [
                ['system', '跟随系统'],
                ['light', '浅色'],
                ['dark', '深色']
              ] as const
            ).map(([value, label]) => (
              <label key={value}>
                <input
                  type="radio"
                  name="theme"
                  value={value}
                  checked={(settings?.theme ?? 'system') === value}
                  onChange={() => void updateTheme(value)}
                />
                <span>{label}</span>
              </label>
            ))}
          </div>
        </fieldset>

        <fieldset className="settings-choice">
          <legend>一周从哪天开始</legend>
          <div className="choice-grid choice-grid-two">
            {(
              [
                [1, '周一'],
                [0, '周日']
              ] as const
            ).map(([value, label]) => (
              <label key={value}>
                <input
                  type="radio"
                  name="week-start"
                  value={value}
                  checked={(settings?.weekStartsOn ?? 1) === value}
                  onChange={() => void updateWeekStart(value)}
                />
                <span>{label}</span>
              </label>
            ))}
          </div>
        </fieldset>
      </section>

      <section className="settings-section" aria-labelledby="data-title">
        <div className="settings-section-header">
          <div>
            <span>CLOUD DATA</span>
            <h2 id="data-title">数据与备份</h2>
          </div>
          <p>导出读取当前云端快照；恢复会事务性替换 Neon 数据。</p>
        </div>

        <div className="statistics-grid" aria-label="数据统计">
          <div>
            <strong>{statistics?.activeTaskCount ?? '—'}</strong>
            <span>活动任务</span>
          </div>
          <div>
            <strong>{statistics?.completedTaskCount ?? '—'}</strong>
            <span>已完成</span>
          </div>
          <div>
            <strong>{statistics?.projectCount ?? '—'}</strong>
            <span>项目</span>
          </div>
          <div>
            <strong>{statistics?.tagCount ?? '—'}</strong>
            <span>标签</span>
          </div>
        </div>

        <div className="backup-actions">
          <article>
            <div>
              <h3>导出完整备份</h3>
              <p>包含活动、已完成及软删除任务、项目、标签和设置。</p>
            </div>
            <button
              type="button"
              className="primary-button"
              disabled={isExporting}
              onClick={() => void handleExport()}
            >
              {isExporting ? '正在导出…' : '导出 JSON'}
            </button>
          </article>

          <article>
            <div>
              <h3>从备份恢复</h3>
              <p>先校验并展示摘要，确认后以单一事务替换当前数据。</p>
            </div>
            <label className="file-button">
              选择 JSON
              <input
                ref={fileInputRef}
                type="file"
                accept="application/json,.json"
                onChange={(event) => void handleFile(event)}
              />
            </label>
          </article>
        </div>

        {backupPreview ? (
          <div className="backup-preview" role="region" aria-label="备份摘要">
            <div>
              <span>VALID BACKUP</span>
              <h3>备份已通过校验</h3>
              <p>
                导出于 {new Date(backupPreview.exportedAt).toLocaleString()}
                {' · '}应用版本 {backupPreview.appVersion}
              </p>
            </div>
            <dl>
              <div>
                <dt>任务</dt>
                <dd>{backupPreview.summary.taskCount}</dd>
              </div>
              <div>
                <dt>项目</dt>
                <dd>{backupPreview.summary.projectCount}</dd>
              </div>
              <div>
                <dt>标签</dt>
                <dd>{backupPreview.summary.tagCount}</dd>
              </div>
            </dl>
            <p className="restore-warning">
              恢复会替换当前全部数据。建议先导出一份当前备份。
            </p>
            <button
              type="button"
              className="restore-button"
              disabled={isRestoring}
              onClick={() => void handleRestore()}
            >
              {isRestoring ? '正在恢复…' : '确认替换恢复'}
            </button>
          </div>
        ) : null}
      </section>

      <section
        className="settings-section privacy-note"
        aria-labelledby="about-title"
      >
        <div>
          <span>ABOUT</span>
          <h2 id="about-title">云端存储说明</h2>
        </div>
        <p>
          Neon
          是唯一业务数据源；清除浏览器站点数据不会删除云端任务。仍建议定期导出
          JSON 作为独立备份。
        </p>
        <dl>
          <div>
            <dt>应用版本</dt>
            <dd>{APP_VERSION}</dd>
          </div>
          <div>
            <dt>数据 schema</dt>
            <dd>v{DATABASE_SCHEMA_VERSION}</dd>
          </div>
          <div>
            <dt>软删除记录</dt>
            <dd>{statistics?.deletedTaskCount ?? '—'}</dd>
          </div>
        </dl>
      </section>
    </section>
  )
}
