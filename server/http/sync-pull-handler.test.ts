import { describe, expect, it, vi } from 'vitest'
import type { AuthVerifier } from '../auth/auth-verifier'
import { InvalidSyncCursorError } from '../sync/cursor'
import { createSyncPullHandler } from './sync-pull-handler'

function request(path = '/api/sync/pull?protocolVersion=1'): Request {
  return new Request(`https://todo.example${path}`)
}

function authenticatedUser(userId = 'user_from_token'): AuthVerifier {
  return {
    authenticate: vi.fn().mockResolvedValue({ userId })
  }
}

describe('sync pull handler', () => {
  it('returns 401 before reading cloud data when identity is missing', async () => {
    const pull = vi.fn()
    const handler = createSyncPullHandler({
      auth: { authenticate: vi.fn().mockResolvedValue(null) },
      repository: { pull },
      cursor: { decode: vi.fn(), encode: vi.fn() }
    })

    expect((await handler(request())).status).toBe(401)
    expect(pull).not.toHaveBeenCalled()
  })

  it('ignores a forged owner and scopes the pull to the verified user', async () => {
    const pull = vi.fn().mockResolvedValue({ changes: [], hasMore: false })
    const decode = vi.fn().mockResolvedValue(41)
    const handler = createSyncPullHandler({
      auth: authenticatedUser(),
      repository: { pull },
      cursor: { decode, encode: vi.fn() }
    })

    const response = await handler(
      request(
        '/api/sync/pull?protocolVersion=1&cursor=signed_cursor&limit=25&userId=forged_user'
      )
    )

    expect(response.status).toBe(200)
    expect(decode).toHaveBeenCalledWith('signed_cursor', 'user_from_token')
    expect(pull).toHaveBeenCalledWith('user_from_token', 41, 25)
    await expect(response.json()).resolves.toMatchObject({
      protocolVersion: 1,
      changes: [],
      nextCursor: 'signed_cursor',
      hasMore: false
    })
  })

  it('returns changes without exposing the internal sequence', async () => {
    const encode = vi.fn().mockResolvedValue('next_signed_cursor')
    const handler = createSyncPullHandler({
      auth: authenticatedUser('user_a'),
      repository: {
        pull: vi.fn().mockResolvedValue({
          changes: [
            {
              sequence: 7,
              entityType: 'task',
              entityId: 'task_a',
              revision: 1,
              serverUpdatedAt: '2026-08-20T00:00:00.000Z',
              syncDeletedAt: null,
              payload: { title: 'private task' }
            }
          ],
          hasMore: false
        })
      },
      cursor: { decode: vi.fn(), encode }
    })

    const response = await handler(request())
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(encode).toHaveBeenCalledWith(7, 'user_a')
    expect(body).toMatchObject({
      protocolVersion: 1,
      nextCursor: 'next_signed_cursor',
      hasMore: false
    })
    expect(body.changes[0]).not.toHaveProperty('sequence')
  })

  it('rejects invalid or cross-user cursors', async () => {
    const pull = vi.fn()
    const handler = createSyncPullHandler({
      auth: authenticatedUser(),
      repository: { pull },
      cursor: {
        decode: vi.fn().mockRejectedValue(new InvalidSyncCursorError()),
        encode: vi.fn()
      }
    })

    const response = await handler(
      request('/api/sync/pull?protocolVersion=1&cursor=invalid')
    )

    expect(response.status).toBe(400)
    await expect(response.json()).resolves.toMatchObject({
      error: { code: 'invalid_cursor' }
    })
    expect(pull).not.toHaveBeenCalled()
  })
})
