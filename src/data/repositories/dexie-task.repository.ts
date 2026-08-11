import type { TodoDatabase } from '../db'
import type { LocalDate } from '../../domain/date/local-date'
import type { TaskRepository } from '../../domain/task/task.repository'
import type { Task } from '../../domain/task/task.types'

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
      .sort(newestFirst)
  }

  async queryToday(today: LocalDate): Promise<Task[]> {
    const tasks = await this.database.tasks
      .where('status')
      .equals('todo')
      .toArray()
    return tasks
      .filter(
        (task) =>
          task.deletedAt === null &&
          (task.plannedDate === today ||
            task.deadline === today ||
            (task.deadline !== null && task.deadline < today) ||
            (task.plannedDate !== null && task.plannedDate < today))
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
