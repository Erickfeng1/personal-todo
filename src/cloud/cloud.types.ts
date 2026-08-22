import type { Project } from '../domain/project/project.types.js'
import type { AppSettings } from '../domain/settings/settings.types.js'
import type { Tag } from '../domain/tag/tag.types.js'
import type { Task } from '../domain/task/task.types.js'

export type CloudEntityType = 'task' | 'project' | 'tag' | 'settings'

export interface CloudDataSnapshot {
  data: {
    tasks: Task[]
    projects: Project[]
    tags: Tag[]
    settings: AppSettings | null
  }
  revisions: {
    tasks: Record<string, number>
    projects: Record<string, number>
    tags: Record<string, number>
    settings: number | null
  }
}

export interface CloudSaveResult {
  entityType: CloudEntityType
  entityId: string
  revision: number
}
