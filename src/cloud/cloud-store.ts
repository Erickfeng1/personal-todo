import { z } from 'zod'
import { AppError } from '../domain/shared/app-error'
import {
  projectSchema,
  settingsSchema,
  tagSchema,
  taskSchema
} from '../data/backup/backup.schema'
import type {
  CloudDataSnapshot,
  CloudEntityType,
  CloudSaveResult
} from './cloud.types'
import type { Task } from '../domain/task/task.types'
import type { Project } from '../domain/project/project.types'
import type { Tag } from '../domain/tag/tag.types'
import type { AppSettings } from '../domain/settings/settings.types'
import type {
  BackupEnvelopeV1,
  BackupSummary
} from '../data/backup/backup.types'

const cloudStateSchema: z.ZodType<CloudDataSnapshot> = z.object({
  data: z.object({
    tasks: z.array(taskSchema),
    projects: z.array(projectSchema),
    tags: z.array(tagSchema),
    settings: settingsSchema.nullable()
  }),
  revisions: z.object({
    tasks: z.record(z.string(), z.number().int().positive()),
    projects: z.record(z.string(), z.number().int().positive()),
    tags: z.record(z.string(), z.number().int().positive()),
    settings: z.number().int().positive().nullable()
  })
})

const emptySnapshot = (): CloudDataSnapshot => ({
  data: { tasks: [], projects: [], tags: [], settings: null },
  revisions: { tasks: {}, projects: {}, tags: {}, settings: null }
})

async function responseError(response: Response): Promise<AppError> {
  let code = 'CLOUD_REQUEST_FAILED'
  try {
    const body = (await response.json()) as { error?: { code?: string } }
    code = body.error?.code ?? code
  } catch {
    // The server intentionally keeps error bodies minimal.
  }
  if (response.status === 401) {
    window.dispatchEvent(new Event('personal-todo-session-expired'))
    return new AppError('UNAUTHORIZED', '访问会话已失效，请重新输入密码')
  }
  if (response.status === 409) {
    return new AppError('CONFLICT', '云端记录已在别处更新，已重新加载')
  }
  return new AppError(
    'STORAGE_WRITE_FAILED',
    `${code}：云端保存失败，请检查网络后重试`
  )
}

export class CloudStore {
  private snapshot = emptySnapshot()
  private revision = 0
  private readonly listeners = new Set<() => void>()

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  getVersion = (): number => this.revision

  getSnapshot(): CloudDataSnapshot {
    return this.snapshot
  }

  async load(): Promise<void> {
    const response = await fetch('/api/data/state', {
      headers: { accept: 'application/json' }
    })
    if (!response.ok) throw await responseError(response)
    this.snapshot = cloudStateSchema.parse(await response.json())
    this.publish()
  }

  clear(): void {
    this.snapshot = emptySnapshot()
    this.publish()
  }

  async saveTask(task: Task): Promise<void> {
    await this.saveEntity('task', task.id, task)
  }

  async saveProject(project: Project): Promise<void> {
    await this.saveEntity('project', project.id, project)
  }

  async saveTag(tag: Tag): Promise<void> {
    await this.saveEntity('tag', tag.id, tag)
  }

  async saveSettings(settings: AppSettings): Promise<void> {
    await this.saveEntity('settings', settings.id, settings)
  }

  async deleteTag(tagId: string): Promise<number> {
    const baseRevision = this.snapshot.revisions.tags[tagId]
    if (!baseRevision) throw new AppError('NOT_FOUND', '标签不存在')
    const response = await fetch('/api/data/tag', {
      method: 'DELETE',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ tagId, baseRevision })
    })
    if (!response.ok) {
      const error = await responseError(response)
      if (response.status === 409) await this.load()
      throw error
    }
    const result = z
      .object({ detachedCount: z.number().int().nonnegative() })
      .parse(await response.json())
    await this.load()
    return result.detachedCount
  }

  async restore(
    backup: BackupEnvelopeV1,
    mode: 'restore' | 'migrate' = 'restore'
  ): Promise<BackupSummary> {
    const response = await fetch('/api/data/restore', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ mode, backup })
    })
    if (!response.ok) throw await responseError(response)
    const result = z
      .object({
        summary: z.object({
          taskCount: z.number().int().nonnegative(),
          projectCount: z.number().int().nonnegative(),
          tagCount: z.number().int().nonnegative()
        })
      })
      .parse(await response.json())
    await this.load()
    return result.summary
  }

  private async saveEntity(
    entityType: CloudEntityType,
    entityId: string,
    payload: Task | Project | Tag | AppSettings
  ): Promise<void> {
    const baseRevision = this.baseRevision(entityType, entityId)
    const response = await fetch('/api/data/entity', {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ entityType, entityId, baseRevision, payload })
    })
    if (!response.ok) {
      const error = await responseError(response)
      if (response.status === 409) await this.load()
      throw error
    }
    const result = (await response.json()) as CloudSaveResult
    this.applySaved(entityType, payload, result.revision)
    this.publish()
  }

  private baseRevision(type: CloudEntityType, id: string): number | null {
    if (type === 'task') return this.snapshot.revisions.tasks[id] ?? null
    if (type === 'project') return this.snapshot.revisions.projects[id] ?? null
    if (type === 'tag') return this.snapshot.revisions.tags[id] ?? null
    return this.snapshot.revisions.settings
  }

  private applySaved(
    type: CloudEntityType,
    payload: Task | Project | Tag | AppSettings,
    revision: number
  ): void {
    if (type === 'task') {
      const task = payload as Task
      this.snapshot.data.tasks = replaceById(this.snapshot.data.tasks, task)
      this.snapshot.revisions.tasks[task.id] = revision
    } else if (type === 'project') {
      const project = payload as Project
      this.snapshot.data.projects = replaceById(
        this.snapshot.data.projects,
        project
      )
      this.snapshot.revisions.projects[project.id] = revision
    } else if (type === 'tag') {
      const tag = payload as Tag
      this.snapshot.data.tags = replaceById(this.snapshot.data.tags, tag)
      this.snapshot.revisions.tags[tag.id] = revision
    } else {
      this.snapshot.data.settings = payload as AppSettings
      this.snapshot.revisions.settings = revision
    }
  }

  private publish(): void {
    this.revision += 1
    this.listeners.forEach((listener) => listener())
  }
}

function replaceById<T extends { id: string }>(items: T[], value: T): T[] {
  const index = items.findIndex((item) => item.id === value.id)
  if (index === -1) return [...items, value]
  return items.map((item) => (item.id === value.id ? value : item))
}

export const cloudStore = new CloudStore()
