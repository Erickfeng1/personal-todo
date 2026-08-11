import { db } from '../data/db'
import { DexieTaskRepository } from '../data/repositories/dexie-task.repository'
import { TaskService } from '../domain/task/task.service'
import { DexieProjectRepository } from '../data/repositories/dexie-project.repository'
import { DexieTagRepository } from '../data/repositories/dexie-tag.repository'
import { ProjectService } from '../domain/project/project.service'
import { TagService } from '../domain/tag/tag.service'
import { DexieSettingsRepository } from '../data/repositories/dexie-settings.repository'
import { SettingsService } from '../domain/settings/settings.service'
import { BackupService } from '../data/backup/backup.service'

export const taskRepository = new DexieTaskRepository(db)
export const projectRepository = new DexieProjectRepository(db)
export const tagRepository = new DexieTagRepository(db)
export const settingsRepository = new DexieSettingsRepository(db)
export const taskService = new TaskService({
  repository: taskRepository,
  projectRepository,
  tagRepository
})
export const projectService = new ProjectService({
  repository: projectRepository
})
export const tagService = new TagService({ repository: tagRepository })
export const settingsService = new SettingsService({
  repository: settingsRepository
})
export const backupService = new BackupService({
  database: db,
  settingsService
})
