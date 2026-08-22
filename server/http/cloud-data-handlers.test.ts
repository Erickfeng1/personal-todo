import { afterEach, describe, expect, it, vi } from 'vitest'
import type { AuthVerifier } from '../auth/auth-verifier'
import type { CloudDataRepository } from '../db/cloud-data-repository'
import {
  createCloudEntityHandler,
  createCloudStateHandler
} from './cloud-data-handlers'
import { createTask } from '../../src/domain/task/task.rules'

const emptyState = {
  data: { tasks: [], projects: [], tags: [], settings: null },
  revisions: { tasks: {}, projects: {}, tags: {}, settings: null }
}

function repository(
  overrides: Partial<CloudDataRepository> = {}
): CloudDataRepository {
  return {
    getSnapshot: vi.fn().mockResolvedValue(emptyState),
    save: vi.fn().mockResolvedValue(1),
    deleteTag: vi.fn().mockResolvedValue(0),
    replaceFromBackup: vi.fn().mockResolvedValue(undefined),
    ...overrides
  }
}

afterEach(() => vi.unstubAllEnvs())

describe('cloud data handlers', () => {
  it('returns no business state without a valid session', async () => {
    const getSnapshot = vi.fn().mockResolvedValue(emptyState)
    const data = repository({ getSnapshot })
    const handler = createCloudStateHandler({
      auth: { authenticate: vi.fn().mockResolvedValue(null) },
      repository: data
    })
    const response = await handler(
      new Request('https://todo.example/api/data/state')
    )
    expect(response.status).toBe(401)
    expect(getSnapshot).not.toHaveBeenCalled()
  })

  it('uses the server identity and current revision for validated writes', async () => {
    vi.stubEnv('SINGLE_USER_PASSWORD_HASH', 'scrypt$salt$hash')
    vi.stubEnv(
      'SINGLE_USER_SESSION_SECRET',
      'a-session-secret-that-is-long-enough'
    )
    vi.stubEnv('APP_ORIGINS', 'https://todo.example')
    const save = vi.fn().mockResolvedValue(1)
    const data = repository({ save })
    const auth: AuthVerifier = {
      authenticate: vi.fn().mockResolvedValue({ userId: 'single-user' })
    }
    const task = createTask(
      { title: '云端任务' },
      { source: 'inbox' },
      {
        id: 'c4f3e31b-c20a-45c2-8b26-7db0f6f3859c',
        now: '2026-08-21T08:00:00.000Z',
        sortOrder: 1
      }
    )
    const handler = createCloudEntityHandler({ auth, repository: data })
    const response = await handler(
      new Request('https://todo.example/api/data/entity', {
        method: 'PUT',
        headers: {
          origin: 'https://todo.example',
          'content-type': 'application/json'
        },
        body: JSON.stringify({
          entityType: 'task',
          entityId: task.id,
          baseRevision: null,
          payload: task,
          userId: 'forged-owner'
        })
      })
    )

    expect(response.status).toBe(400)
    expect(save).not.toHaveBeenCalled()
  })

  it('persists a strict valid entity request under the verified owner', async () => {
    vi.stubEnv('SINGLE_USER_PASSWORD_HASH', 'scrypt$salt$hash')
    vi.stubEnv(
      'SINGLE_USER_SESSION_SECRET',
      'a-session-secret-that-is-long-enough'
    )
    vi.stubEnv('APP_ORIGINS', 'https://todo.example')
    const save = vi.fn().mockResolvedValue(1)
    const data = repository({ save })
    const task = createTask(
      { title: '云端任务' },
      { source: 'inbox' },
      {
        id: 'c4f3e31b-c20a-45c2-8b26-7db0f6f3859c',
        now: '2026-08-21T08:00:00.000Z',
        sortOrder: 1
      }
    )
    const handler = createCloudEntityHandler({
      auth: {
        authenticate: vi.fn().mockResolvedValue({ userId: 'single-user' })
      },
      repository: data
    })
    const response = await handler(
      new Request('https://todo.example/api/data/entity', {
        method: 'PUT',
        headers: {
          origin: 'https://todo.example',
          'content-type': 'application/json'
        },
        body: JSON.stringify({
          entityType: 'task',
          entityId: task.id,
          baseRevision: null,
          payload: task
        })
      })
    )

    expect(response.status).toBe(200)
    expect(save).toHaveBeenCalledWith(
      'single-user',
      'task',
      task.id,
      task,
      null
    )
  })
})
