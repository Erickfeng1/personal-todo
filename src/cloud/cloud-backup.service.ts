import type { CloudStore } from './cloud-store'
import { validateBackup } from '../data/backup/backup.schema'
import {
  APP_VERSION,
  BACKUP_SCHEMA_VERSION,
  type BackupEnvelopeV1,
  type BackupSummary,
  type DataStatistics
} from '../data/backup/backup.types'

export class CloudBackupService {
  constructor(
    private readonly store: CloudStore,
    private readonly now = () => new Date().toISOString()
  ) {}

  export(): Promise<BackupEnvelopeV1> {
    const snapshot = this.store.getSnapshot().data
    if (!snapshot.settings) throw new Error('云端设置尚未初始化')
    const summary = this.summary()
    return Promise.resolve({
      schemaVersion: BACKUP_SCHEMA_VERSION,
      appVersion: APP_VERSION,
      exportedAt: this.now(),
      data: {
        tasks: [...snapshot.tasks],
        projects: [...snapshot.projects],
        tags: [...snapshot.tags],
        settings: snapshot.settings
      },
      summary
    })
  }

  getStatistics(): Promise<DataStatistics> {
    const { tasks, projects, tags } = this.store.getSnapshot().data
    return Promise.resolve({
      activeTaskCount: tasks.filter(
        (task) => task.deletedAt === null && task.status === 'todo'
      ).length,
      completedTaskCount: tasks.filter(
        (task) => task.deletedAt === null && task.status === 'completed'
      ).length,
      deletedTaskCount: tasks.filter((task) => task.deletedAt !== null).length,
      projectCount: projects.length,
      tagCount: tags.length
    })
  }

  restore(input: unknown): Promise<BackupSummary> {
    return this.store.restore(validateBackup(input))
  }

  private summary(): BackupSummary {
    const { tasks, projects, tags } = this.store.getSnapshot().data
    return {
      taskCount: tasks.length,
      projectCount: projects.length,
      tagCount: tags.length
    }
  }
}
