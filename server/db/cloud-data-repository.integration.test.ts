import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import { createTask } from '../../src/domain/task/task.rules'
import { getSql } from './client'
import {
  CloudNotEmptyError,
  NeonCloudDataRepository,
  RevisionConflictError
} from './cloud-data-repository'
import { createDefaultSettings } from '../../src/domain/settings/settings.rules'
import {
  APP_VERSION,
  BACKUP_SCHEMA_VERSION,
  type BackupEnvelopeV1
} from '../../src/data/backup/backup.types'
import {
  createSessionToken,
  createSingleUserAuthVerifier,
  SESSION_COOKIE_NAME
} from '../auth/single-user-session'
import { createCloudStateHandler } from '../http/cloud-data-handlers'
import { NeonLoginRateLimiter } from './login-rate-limit'

const runIntegration = process.env.RUN_DATABASE_INTEGRATION === 'true'
const userId = `integration-cloud-${crypto.randomUUID()}`
const taskId = crypto.randomUUID()

describe.skipIf(!runIntegration)('NeonCloudDataRepository integration', () => {
  let sql: ReturnType<typeof getSql>
  let repository: NeonCloudDataRepository

  beforeAll(async () => {
    sql = getSql()
    repository = new NeonCloudDataRepository(sql)
    await clearUser()
  })

  afterAll(async () => {
    await clearUser()
    vi.unstubAllEnvs()
  })

  async function clearUser() {
    await sql.transaction((transaction) => [
      transaction.query('DELETE FROM cloud_tasks WHERE user_id = $1', [userId]),
      transaction.query('DELETE FROM cloud_projects WHERE user_id = $1', [
        userId
      ]),
      transaction.query('DELETE FROM cloud_tags WHERE user_id = $1', [userId]),
      transaction.query('DELETE FROM cloud_settings WHERE user_id = $1', [
        userId
      ])
    ])
  }

  it('persists, reloads, and rejects a stale revision', async () => {
    const task = createTask(
      { title: 'Neon integration task' },
      { source: 'inbox' },
      {
        id: taskId,
        now: '2026-08-21T08:00:00.000Z',
        sortOrder: 1
      }
    )
    await expect(
      repository.save(userId, 'task', task.id, task, null)
    ).resolves.toBe(1)
    await expect(
      repository.save(
        userId,
        'task',
        task.id,
        { ...task, title: 'Updated in Neon' },
        1
      )
    ).resolves.toBe(2)
    await expect(
      repository.save(userId, 'task', task.id, task, 1)
    ).rejects.toBeInstanceOf(RevisionConflictError)

    const snapshot = await repository.getSnapshot(userId)
    expect(snapshot.data.tasks).toHaveLength(1)
    expect(snapshot.data.tasks[0]?.title).toBe('Updated in Neon')
    expect(snapshot.revisions.tasks[task.id]).toBe(2)
  })

  it('restores a complete backup atomically and blocks migration over cloud data', async () => {
    await clearUser()
    const task = createTask(
      { title: 'Restored task' },
      { source: 'inbox' },
      {
        id: crypto.randomUUID(),
        now: '2026-08-21T09:00:00.000Z',
        sortOrder: 2
      }
    )
    const backup: BackupEnvelopeV1 = {
      schemaVersion: BACKUP_SCHEMA_VERSION,
      appVersion: APP_VERSION,
      exportedAt: '2026-08-21T09:01:00.000Z',
      data: {
        tasks: [task],
        projects: [],
        tags: [],
        settings: createDefaultSettings('zh-CN', '2026-08-21T09:00:00.000Z')
      },
      summary: { taskCount: 1, projectCount: 0, tagCount: 0 }
    }

    await repository.replaceFromBackup(userId, backup, true)
    const snapshot = await repository.getSnapshot(userId)
    expect(snapshot.data.tasks[0]).toEqual(task)
    expect(snapshot.data.settings?.locale).toBe('zh-CN')
    await expect(
      repository.replaceFromBackup(userId, backup, true)
    ).rejects.toBeInstanceOf(CloudNotEmptyError)
  })

  it('verifies a signed cookie before returning the real Neon snapshot', async () => {
    vi.stubEnv('SINGLE_USER_PASSWORD_HASH', 'scrypt$salt$hash')
    vi.stubEnv(
      'SINGLE_USER_SESSION_SECRET',
      'a-session-secret-that-is-long-enough'
    )
    vi.stubEnv('SINGLE_USER_ID', userId)
    const token = createSessionToken(
      userId,
      'a-session-secret-that-is-long-enough'
    )
    const handler = createCloudStateHandler({
      auth: createSingleUserAuthVerifier(),
      repository
    })
    const response = await handler(
      new Request('https://todo.example/api/data/state', {
        headers: { cookie: `${SESSION_COOKIE_NAME}=${token}` }
      })
    )
    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toMatchObject({
      data: { tasks: [{ title: 'Restored task' }] }
    })
  })

  it('locks a hashed request fingerprint after five failures', async () => {
    const limiter = new NeonLoginRateLimiter(sql)
    const fingerprint = crypto.randomUUID().replaceAll('-', '')
    await limiter.reset(fingerprint)
    for (let attempt = 0; attempt < 5; attempt += 1) {
      await limiter.recordFailure(fingerprint)
    }
    await expect(limiter.isLocked(fingerprint)).resolves.toBe(true)
    await limiter.reset(fingerprint)
  })
})
