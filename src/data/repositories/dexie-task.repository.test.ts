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

  it('keeps scheduled tasks out of Inbox and assigns date views', async () => {
    const todayTask = createTask(
      { title: '今日计划' },
      { source: 'today', today: '2026-08-11' },
      { id: 'task-today', now: '2026-08-11T08:00:00.000Z', sortOrder: 3 }
    )
    const upcomingTask = {
      ...createTask(
        { title: '未来计划' },
        { source: 'inbox' },
        { id: 'task-upcoming', now: '2026-08-11T08:00:00.000Z', sortOrder: 4 }
      ),
      plannedDate: '2026-08-12' as const,
      deadline: '2026-08-15' as const,
      inbox: false
    }
    await repository.save(todayTask)
    await repository.save(upcomingTask)

    await expect(repository.queryInbox()).resolves.toHaveLength(0)
    await expect(repository.queryToday('2026-08-11')).resolves.toEqual([
      todayTask
    ])
    await expect(repository.queryUpcoming('2026-08-11', 7)).resolves.toEqual([
      upcomingTask
    ])
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
