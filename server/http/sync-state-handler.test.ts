import { describe, expect, it, vi } from 'vitest'
import type { AuthVerifier } from '../auth/auth-verifier'
import { createSyncStateHandler } from './sync-state-handler'

function request(path = '/api/sync/state?protocolVersion=1'): Request {
  return new Request(`https://todo.example${path}`)
}

describe('sync state handler', () => {
  it('returns 401 without a verified identity', async () => {
    const getCounts = vi.fn()
    const handler = createSyncStateHandler({
      auth: { authenticate: vi.fn().mockResolvedValue(null) },
      repository: { getCounts }
    })

    expect((await handler(request())).status).toBe(401)
    expect(getCounts).not.toHaveBeenCalled()
  })

  it('scopes the query to the server-verified user', async () => {
    const getCounts = vi.fn().mockResolvedValue({
      tasks: 1,
      projects: 0,
      tags: 0,
      settings: 1
    })
    const auth: AuthVerifier = {
      authenticate: vi.fn().mockResolvedValue({ userId: 'user_from_token' })
    }
    const handler = createSyncStateHandler({ auth, repository: { getCounts } })

    const response = await handler(
      request('?protocolVersion=1&userId=untrusted_client_supplied_user')
    )

    expect(response.status).toBe(200)
    expect(getCounts).toHaveBeenCalledWith('user_from_token')
    await expect(response.json()).resolves.toMatchObject({
      protocolVersion: 1,
      cloudEmpty: false
    })
  })

  it('does not leak internal errors', async () => {
    const handler = createSyncStateHandler({
      auth: {
        authenticate: vi.fn().mockRejectedValue(new Error('secret detail'))
      },
      repository: { getCounts: vi.fn() }
    })

    const response = await handler(request())
    expect(response.status).toBe(503)
    expect(await response.text()).not.toContain('secret detail')
  })

  it('rejects an unsupported protocol after authentication', async () => {
    const getCounts = vi.fn()
    const handler = createSyncStateHandler({
      auth: {
        authenticate: vi.fn().mockResolvedValue({ userId: 'user_a' })
      },
      repository: { getCounts }
    })

    const response = await handler(request('?protocolVersion=2'))
    expect(response.status).toBe(400)
    expect(getCounts).not.toHaveBeenCalled()
  })
})
