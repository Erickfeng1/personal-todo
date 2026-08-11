import type { LocalDate } from '../date/local-date'
import type { Task } from './task.types'

export interface TaskRepository {
  getById(id: string): Promise<Task | undefined>
  save(task: Task): Promise<void>
  queryInbox(): Promise<Task[]>
  queryToday(today: LocalDate): Promise<Task[]>
  queryUpcoming(today: LocalDate, days: number): Promise<Task[]>
  queryCompleted(): Promise<Task[]>
}
