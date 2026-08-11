import { AppError } from '../shared/app-error'
import {
  completeTask,
  createTask,
  reopenTask,
  restoreDeletedTask,
  softDeleteTask,
  updateTaskDetails,
  updateTaskClassification
} from './task.rules'
import type { ProjectRepository } from '../project/project.repository'
import type { TagRepository } from '../tag/tag.repository'
import type { TaskRepository } from './task.repository'
import type {
  CreateTaskContext,
  CreateTaskInput,
  Task,
  TaskClassificationPatch,
  UpdateTaskDetailsInput
} from './task.types'

interface TaskServiceDependencies {
  repository: TaskRepository
  projectRepository?: ProjectRepository
  tagRepository?: TagRepository
  createId?: () => string
  now?: () => Date
}

export class TaskService {
  private readonly repository: TaskRepository
  private readonly createId: () => string
  private readonly now: () => Date
  private readonly projectRepository: ProjectRepository | undefined
  private readonly tagRepository: TagRepository | undefined

  constructor({
    repository,
    projectRepository,
    tagRepository,
    createId,
    now
  }: TaskServiceDependencies) {
    this.repository = repository
    this.projectRepository = projectRepository
    this.tagRepository = tagRepository
    this.createId = createId ?? (() => crypto.randomUUID())
    this.now = now ?? (() => new Date())
  }

  async create(
    input: CreateTaskInput,
    context: CreateTaskContext
  ): Promise<Task> {
    if (context.source === 'project') {
      await this.validateReferences(context.projectId, [])
    }
    if (context.source === 'tag') {
      await this.validateReferences(null, [context.tagId])
    }
    const now = this.now()
    const task = createTask(input, context, {
      id: this.createId(),
      now: now.toISOString(),
      sortOrder: now.getTime()
    })
    await this.persist(task)
    return task
  }

  async complete(id: string): Promise<Task> {
    const task = await this.requireTask(id)
    const completed = completeTask(task, this.now().toISOString())
    await this.persist(completed)
    return completed
  }

  async reopen(id: string): Promise<Task> {
    const task = await this.requireTask(id)
    const reopened = reopenTask(task, this.now().toISOString())
    await this.persist(reopened)
    return reopened
  }

  async updateClassification(
    id: string,
    patch: TaskClassificationPatch
  ): Promise<Task> {
    const task = await this.requireTask(id)
    const updated = updateTaskClassification(
      task,
      patch,
      this.now().toISOString()
    )
    await this.persist(updated)
    return updated
  }

  async updateDetails(
    id: string,
    input: UpdateTaskDetailsInput
  ): Promise<Task> {
    const task = await this.requireTask(id)
    await this.validateReferences(input.projectId, input.tagIds)
    const updated = updateTaskDetails(task, input, this.now().toISOString())
    await this.persist(updated)
    return updated
  }

  async softDelete(id: string): Promise<Task> {
    const task = await this.requireTask(id)
    const deleted = softDeleteTask(task, this.now().toISOString())
    await this.persist(deleted)
    return deleted
  }

  async restoreDeleted(id: string): Promise<Task> {
    const task = await this.requireTask(id)
    const restored = restoreDeletedTask(task, this.now().toISOString())
    await this.persist(restored)
    return restored
  }

  private async validateReferences(projectId: string | null, tagIds: string[]) {
    const projectPromise =
      projectId === null || !this.projectRepository
        ? Promise.resolve(undefined)
        : this.projectRepository.getById(projectId)
    const tagsPromise = this.tagRepository
      ? Promise.all(tagIds.map((tagId) => this.tagRepository!.getById(tagId)))
      : Promise.resolve([])
    const [project, tags] = await Promise.all([projectPromise, tagsPromise])

    if (projectId !== null && this.projectRepository && !project) {
      throw new AppError('VALIDATION_ERROR', '所选项目不存在')
    }
    if (this.tagRepository && tags.some((tag) => !tag)) {
      throw new AppError('VALIDATION_ERROR', '所选标签不存在')
    }
  }

  private async requireTask(id: string): Promise<Task> {
    try {
      const task = await this.repository.getById(id)
      if (!task) throw new AppError('NOT_FOUND', '任务不存在或已被移除')
      return task
    } catch (error) {
      if (error instanceof AppError) throw error
      throw new AppError('STORAGE_READ_FAILED', '读取任务失败', {
        cause: error
      })
    }
  }

  private async persist(task: Task): Promise<void> {
    try {
      await this.repository.save(task)
    } catch (error) {
      throw new AppError('STORAGE_WRITE_FAILED', '任务未能保存，请重试', {
        cause: error
      })
    }
  }
}
