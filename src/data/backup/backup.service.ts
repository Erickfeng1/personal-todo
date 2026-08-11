import { AppError } from '../../domain/shared/app-error'
import type { SettingsService } from '../../domain/settings/settings.service'
import { normalizeTagNameForIndex } from '../../domain/tag/tag.rules'
import {
  DATABASE_SCHEMA_VERSION,
  type DatabaseMeta,
  type TodoDatabase
} from '../db'
import {
  APP_VERSION,
  BACKUP_SCHEMA_VERSION,
  type BackupEnvelopeV1,
  type BackupSummary,
  type DataStatistics
} from './backup.types'

interface BackupServiceDependencies {
  database: TodoDatabase
  settingsService: SettingsService
  now?: () => string
}

export class BackupService {
  private readonly database: TodoDatabase
  private readonly settingsService: SettingsService
  private readonly now: () => string

  constructor({
    database,
    settingsService,
    now = () => new Date().toISOString()
  }: BackupServiceDependencies) {
    this.database = database
    this.settingsService = settingsService
    this.now = now
  }

  async export(): Promise<BackupEnvelopeV1> {
    await this.settingsService.get()
    const [tasks, projects, storedTags, settings] =
      await this.database.transaction(
        'r',
        this.database.tasks,
        this.database.projects,
        this.database.tags,
        this.database.settings,
        () =>
          Promise.all([
            this.database.tasks.toArray(),
            this.database.projects.toArray(),
            this.database.tags.toArray(),
            this.database.settings.get('singleton')
          ])
      )

    if (!settings) {
      throw new AppError('STORAGE_READ_FAILED', '无法读取应用设置')
    }
    const tags = storedTags.map(
      ({ id, name, color, createdAt, updatedAt }) => ({
        id,
        name,
        color,
        createdAt,
        updatedAt
      })
    )
    const summary: BackupSummary = {
      taskCount: tasks.length,
      projectCount: projects.length,
      tagCount: tags.length
    }
    return {
      schemaVersion: BACKUP_SCHEMA_VERSION,
      appVersion: APP_VERSION,
      exportedAt: this.now(),
      data: { tasks, projects, tags, settings },
      summary
    }
  }

  async getStatistics(): Promise<DataStatistics> {
    const [tasks, projectCount, tagCount] = await Promise.all([
      this.database.tasks.toArray(),
      this.database.projects.count(),
      this.database.tags.count()
    ])
    let activeTaskCount = 0
    let completedTaskCount = 0
    let deletedTaskCount = 0
    for (const task of tasks) {
      if (task.deletedAt !== null) deletedTaskCount += 1
      else if (task.status === 'completed') completedTaskCount += 1
      else activeTaskCount += 1
    }
    return {
      activeTaskCount,
      completedTaskCount,
      deletedTaskCount,
      projectCount,
      tagCount
    }
  }

  async restore(input: unknown): Promise<BackupSummary> {
    const { validateBackup } = await import('./backup.schema')
    const backup = validateBackup(input)
    const now = this.now()
    const meta: DatabaseMeta[] = [
      { key: 'schemaVersion', value: DATABASE_SCHEMA_VERSION },
      { key: 'lastSuccessfulMigrationAt', value: now }
    ]

    try {
      await this.database.transaction(
        'rw',
        this.database.tasks,
        this.database.projects,
        this.database.tags,
        this.database.settings,
        this.database.meta,
        async () => {
          await Promise.all([
            this.database.tasks.clear(),
            this.database.projects.clear(),
            this.database.tags.clear(),
            this.database.settings.clear(),
            this.database.meta.clear()
          ])
          await this.database.projects.bulkPut(backup.data.projects)
          await this.database.tags.bulkPut(
            backup.data.tags.map((tag) => ({
              ...tag,
              nameNormalized: normalizeTagNameForIndex(tag.name)
            }))
          )
          await this.database.tasks.bulkPut(backup.data.tasks)
          await this.database.settings.put(backup.data.settings)
          await this.database.meta.bulkPut(meta)
        }
      )
    } catch (cause) {
      throw new AppError(
        'BACKUP_RESTORE_FAILED',
        '恢复失败，原有数据保持不变',
        { cause }
      )
    }

    return backup.summary
  }
}
