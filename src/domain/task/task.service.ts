import { AppError } from '../shared/app-error'
import {
  completeTask,
  createTask,
  reopenTask,
  updateTaskClassification
} from './task.rules'
import type { TaskRepository } from './task.repository'
import type {
  CreateTaskContext,
  CreateTaskInput,
  Task,
  TaskClassificationPatch
} from './task.types'

interface TaskServiceDependencies {
  repository: TaskRepository
  createId?: () => string
  now?: () => Date
}

export class TaskService {
  private readonly repository: TaskRepository
  private readonly createId: () => string
  private readonly now: () => Date

  constructor({ repository, createId, now }: TaskServiceDependencies) {
    this.repository = repository
    this.createId = createId ?? (() => crypto.randomUUID())
    this.now = now ?? (() => new Date())
  }

  async create(
    input: CreateTaskInput,
    context: CreateTaskContext
  ): Promise<Task> {
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
