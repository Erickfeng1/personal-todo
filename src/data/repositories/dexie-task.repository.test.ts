import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { TodoDatabase } from '../db'
import { createTask, completeTask } from '../../domain/task/task.rules'
import { DexieTaskRepository } from './dexie-task.repository'

describe('DexieTaskRepository', () => {
  let database: TodoDatabase
  let repository: DexieTaskRepository

  beforeEach(() => {
    database = new TodoDatabase(`personal-todo-test-${crypto.randomUUID()}`)
    repository = new DexieTaskRepository(database)
  })

  afterEach(async () => {
    database.close()
    await database.delete()
  })

  it('persists and queries Inbox tasks across repository instances', async () => {
    const task = createTask(
      { title: '刷新后仍存在' },
      { source: 'inbox' },
      { id: 'task-1', now: '2026-08-11T08:00:00.000Z', sortOrder: 1 }
    )
    await repository.save(task)

    const freshRepository = new DexieTaskRepository(database)
    await expect(freshRepository.queryInbox()).resolves.toEqual([task])
  })

  it('moves completed tasks out of Inbox and into Completed', async () => {
    const task = createTask(
      { title: '完成闭环' },
      { source: 'inbox' },
      { id: 'task-2', now: '2026-08-11T08:00:00.000Z', sortOrder: 2 }
    )
    await repository.save(task)
    await repository.save(completeTask(task, '2026-08-11T08:10:00.000Z'))

    await expect(repository.queryInbox()).resolves.toHaveLength(0)
    await expect(repository.queryCompleted()).resolves.toHaveLength(1)
  })
})
