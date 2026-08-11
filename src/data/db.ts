import Dexie, { type EntityTable } from 'dexie'
import type { Task } from '../domain/task/task.types'

class TodoDatabase extends Dexie {
  tasks!: EntityTable<Task, 'id'>

  constructor(name = 'personal-todo') {
    super(name)
    this.version(1).stores({
      tasks:
        'id,status,inbox,importance,urgency,plannedDate,deadline,projectId,*tagIds,completedAt,deletedAt,createdAt,updatedAt'
    })
  }
}

export const db = new TodoDatabase()
export { TodoDatabase }
