import { db } from '../data/db'
import { DexieTaskRepository } from '../data/repositories/dexie-task.repository'
import { TaskService } from '../domain/task/task.service'

export const taskRepository = new DexieTaskRepository(db)
export const taskService = new TaskService({ repository: taskRepository })
