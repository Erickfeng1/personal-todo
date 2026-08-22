import type { Project } from '../../domain/project/project.types.js'
import type { AppSettings } from '../../domain/settings/settings.types.js'
import type { Tag } from '../../domain/tag/tag.types.js'
import type { Task, UTCDateTime } from '../../domain/task/task.types.js'

export const BACKUP_SCHEMA_VERSION = 1 as const
export const APP_VERSION = '0.1.0'
export const MAX_BACKUP_FILE_BYTES = 20 * 1024 * 1024

export interface BackupEnvelopeV1 {
  schemaVersion: typeof BACKUP_SCHEMA_VERSION
  appVersion: string
  exportedAt: UTCDateTime
  data: {
    tasks: Task[]
    projects: Project[]
    tags: Tag[]
    settings: AppSettings
  }
  summary: BackupSummary
}

export interface BackupSummary {
  taskCount: number
  projectCount: number
  tagCount: number
}

export interface DataStatistics {
  activeTaskCount: number
  completedTaskCount: number
  deletedTaskCount: number
  projectCount: number
  tagCount: number
}
