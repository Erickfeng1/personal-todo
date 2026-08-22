import { afterEach, describe, expect, it, vi } from 'vitest'
import { createTask } from '../domain/task/task.rules'
import { CloudStore } from './cloud-store'

const emptyState = {
  data: { tasks: [], projects: [], tags: [], settings: null },
  revisions: { tasks: {}, projects: {}, tags: {}, settings: null }
}

afterEach(() => vi.restoreAllMocks())

describe('CloudStore', () => {
  it('updates memory only after the server confirms a write', async () => {
    const task = createTask(
      { title: '写入云端' },
      { source: 'inbox' },
      {
        id: 'c4f3e31b-c20a-45c2-8b26-7db0f6f3859c',
        now: '2026-08-21T08:00:00.000Z',
        sortOrder: 1
      }
    )
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(
        new Response(JSON.stringify(emptyState), { status: 200 })
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({ error: { code: 'CLOUD_WRITE_FAILED' } }),
          {
            status: 503
          }
        )
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            entityType: 'task',
            entityId: task.id,
            revision: 1
          }),
          { status: 200 }
        )
      )
    const store = new CloudStore()
    await store.load()

    await expect(store.saveTask(task)).rejects.toThrow('云端保存失败')
    expect(store.getSnapshot().data.tasks).toEqual([])

    await store.saveTask(task)
    expect(store.getSnapshot().data.tasks).toEqual([task])
    expect(store.getSnapshot().revisions.tasks[task.id]).toBe(1)
    expect(fetchMock).toHaveBeenCalledTimes(3)
  })
})
