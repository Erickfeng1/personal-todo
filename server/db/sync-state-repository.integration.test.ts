import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { assertNonProductionDatabase } from './database-safety'
import { getSql } from './client'
import { NeonSyncPullRepository } from './sync-pull-repository'
import { NeonSyncStateRepository } from './sync-state-repository'

const shouldRun = process.env.RUN_DATABASE_INTEGRATION === 'true'
const users = [`test_${crypto.randomUUID()}`, `test_${crypto.randomUUID()}`]
const taskIds = [crypto.randomUUID(), crypto.randomUUID()]
let fixturesCreated = false

describe.skipIf(!shouldRun)('Neon user isolation', () => {
  beforeAll(async () => {
    assertNonProductionDatabase()
    const sql = getSql()

    await sql.query(
      `INSERT INTO cloud_tasks (user_id, id, payload, revision)
       VALUES ($1, $2, $3::jsonb, 1), ($4, $5, $6::jsonb, 1)`,
      [
        users[0],
        taskIds[0],
        JSON.stringify({ title: 'user A private task' }),
        users[1],
        taskIds[1],
        JSON.stringify({ title: 'user B private task' })
      ]
    )
    await sql.query(
      `INSERT INTO sync_changes (user_id, entity_type, entity_id, revision)
       VALUES ($1, 'task', $2, 1), ($3, 'task', $4, 1)`,
      [users[0], taskIds[0], users[1], taskIds[1]]
    )
    fixturesCreated = true
  })

  afterAll(async () => {
    if (!fixturesCreated) return
    const sql = getSql()
    await sql.query(
      'DELETE FROM sync_changes WHERE user_id = ANY($1::text[])',
      [users]
    )
    await sql.query('DELETE FROM cloud_tasks WHERE user_id = ANY($1::text[])', [
      users
    ])
  })

  it('counts only rows owned by the authenticated user', async () => {
    const repository = new NeonSyncStateRepository(getSql())

    await expect(repository.getCounts(users[0] ?? '')).resolves.toEqual({
      tasks: 1,
      projects: 0,
      tags: 0,
      settings: 0
    })
    await expect(repository.getCounts(users[1] ?? '')).resolves.toEqual({
      tasks: 1,
      projects: 0,
      tags: 0,
      settings: 0
    })
  })

  it('pulls only changes owned by the authenticated user', async () => {
    const repository = new NeonSyncPullRepository(getSql())

    const page = await repository.pull(users[0] ?? '', 0, 100)

    expect(page.hasMore).toBe(false)
    expect(page.changes).toHaveLength(1)
    expect(page.changes[0]).toMatchObject({
      entityType: 'task',
      entityId: taskIds[0],
      revision: 1,
      payload: { title: 'user A private task' }
    })
    expect(page.changes[0]?.entityId).not.toBe(taskIds[1])
  })
})
