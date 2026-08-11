import type { TodoDatabase } from '../db'
import type { LocalDate } from '../../domain/date/local-date'
import type { TaskRepository } from '../../domain/task/task.repository'
import type { Task } from '../../domain/task/task.types'
import { getTodayGroup, getUpcomingDate } from '../../domain/task/task.rules'

function newestFirst(a: Task, b: Task): number {
  return b.sortOrder - a.sortOrder
}

export class DexieTaskRepository implements TaskRepository {
  constructor(private readonly database: TodoDatabase) {}

  getById(id: string): Promise<Task | undefined> {
    return this.database.tasks.get(id)
  }

  async save(task: Task): Promise<void> {
    await this.database.tasks.put(task)
  }

  async queryInbox(): Promise<Task[]> {
    const tasks = await this.database.tasks
      .where('status')
      .equals('todo')
      .toArray()
    return tasks
      .filter((task) => task.status === 'todo' && task.deletedAt === null)
      .filter((task) => task.inbox)
      .sort(newestFirst)
  }

  async queryToday(today: LocalDate): Promise<Task[]> {
    const tasks = await this.database.tasks
      .where('status')
      .equals('todo')
      .toArray()
    return tasks
      .filter((task) => getTodayGroup(task, today) !== null)
      .sort(newestFirst)
  }

  async queryUpcoming(today: LocalDate, days: number): Promise<Task[]> {
    const tasks = await this.database.tasks
      .where('status')
      .equals('todo')
      .toArray()
    return tasks
      .filter((task) => getUpcomingDate(task, today, days) !== null)
      .sort(newestFirst)
  }

  async queryByProject(projectId: string): Promise<Task[]> {
    const tasks = await this.database.tasks
      .where('projectId')
      .equals(projectId)
      .toArray()
    return tasks
      .filter((task) => task.status === 'todo' && task.deletedAt === null)
      .sort(newestFirst)
  }

  async queryByTag(tagId: string): Promise<Task[]> {
    const tasks = await this.database.tasks
      .where('tagIds')
      .equals(tagId)
      .toArray()
    return tasks
      .filter((task) => task.status === 'todo' && task.deletedAt === null)
      .sort(newestFirst)
  }

  async queryAll(includeCompleted = false): Promise<Task[]> {
    const tasks = await this.database.tasks.toArray()
    return tasks
      .filter(
        (task) =>
          task.deletedAt === null &&
          (includeCompleted || task.status === 'todo')
      )
      .sort(newestFirst)
  }

  async queryCompleted(): Promise<Task[]> {
    const tasks = await this.database.tasks
      .where('status')
      .equals('completed')
      .toArray()
    return tasks
      .filter((task) => task.deletedAt === null)
      .sort((a, b) => (b.completedAt ?? '').localeCompare(a.completedAt ?? ''))
  }
}
