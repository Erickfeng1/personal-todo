import { TaskService } from '../domain/task/task.service'
import { ProjectService } from '../domain/project/project.service'
import { TagService } from '../domain/tag/tag.service'
import { SettingsService } from '../domain/settings/settings.service'
import { cloudStore } from '../cloud/cloud-store'
import {
  CloudProjectRepository,
  CloudSettingsRepository,
  CloudTagRepository,
  CloudTaskRepository
} from '../cloud/cloud-repositories'
import { CloudBackupService } from '../cloud/cloud-backup.service'

export const taskRepository = new CloudTaskRepository(cloudStore)
export const projectRepository = new CloudProjectRepository(cloudStore)
export const tagRepository = new CloudTagRepository(cloudStore)
export const settingsRepository = new CloudSettingsRepository(cloudStore)
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
export const backupService = new CloudBackupService(cloudStore)
