import { db } from '../db'
import {
  createDefaultSettings,
  DEFAULT_LOCALE
} from '../../domain/settings/settings.rules'
import {
  APP_VERSION,
  BACKUP_SCHEMA_VERSION,
  type BackupEnvelopeV1,
  type BackupSummary
} from '../backup/backup.types'

export class LegacyLocalDataReader {
  async export(): Promise<BackupEnvelopeV1> {
    const [tasks, projects, storedTags, storedSettings] = await db.transaction(
      'r',
      db.tasks,
      db.projects,
      db.tags,
      db.settings,
      () =>
        Promise.all([
          db.tasks.toArray(),
          db.projects.toArray(),
          db.tags.toArray(),
          db.settings.get('singleton')
        ])
    )
    const tags = storedTags.map(
      ({ id, name, color, createdAt, updatedAt }) => ({
        id,
        name,
        color,
        createdAt,
        updatedAt
      })
    )
    const settings =
      storedSettings ??
      createDefaultSettings(
        navigator.language || DEFAULT_LOCALE,
        new Date().toISOString()
      )
    return {
      schemaVersion: BACKUP_SCHEMA_VERSION,
      appVersion: APP_VERSION,
      exportedAt: new Date().toISOString(),
      data: { tasks, projects, tags, settings },
      summary: {
        taskCount: tasks.length,
        projectCount: projects.length,
        tagCount: tags.length
      }
    }
  }

  async getSummary(): Promise<BackupSummary> {
    const backup = await this.export()
    return backup.summary
  }
}

export const legacyLocalDataReader = new LegacyLocalDataReader()
