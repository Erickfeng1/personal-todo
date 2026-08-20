import { describe, expect, it, vi } from 'vitest'
import { HttpCloudSyncClient } from './cloud-sync-client'

const stateResponse = {
  protocolVersion: 1,
  requestId: '05f76645-562a-4584-956a-25c7739b5be9',
  cloudEmpty: true,
  counts: { tasks: 0, projects: 0, tags: 0, settings: 0 }
}

const pullResponse = {
  protocolVersion: 1,
  requestId: '7e80f954-0b52-447d-9f73-6cb6885d311c',
  changes: [],
  nextCursor: null,
  hasMore: false
}

describe('HTTP cloud sync client', () => {
  it('uses authenticated GET requests only for state and first pull', async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(Response.json(stateResponse))
      .mockResolvedValueOnce(Response.json(pullResponse))
    const client = new HttpCloudSyncClient({ fetcher })

    await expect(
      client.inspect(() => Promise.resolve('session_token'))
    ).resolves.toEqual({ state: stateResponse, firstPull: pullResponse })

    expect(fetcher).toHaveBeenCalledTimes(2)
    expect(fetcher).toHaveBeenNthCalledWith(
      1,
      '/api/sync/state?protocolVersion=1',
      expect.objectContaining({
        method: 'GET',
        headers: { authorization: 'Bearer session_token' }
      })
    )
    expect(fetcher).toHaveBeenNthCalledWith(
      2,
      '/api/sync/pull?protocolVersion=1&limit=1',
      expect.objectContaining({ method: 'GET' })
    )
  })

  it('does not make a request when no current session token is available', async () => {
    const fetcher = vi.fn<typeof fetch>()
    const client = new HttpCloudSyncClient({ fetcher })

    await expect(
      client.inspect(() => Promise.resolve(null))
    ).rejects.toMatchObject({
      code: 'unauthorized'
    })
    expect(fetcher).not.toHaveBeenCalled()
  })

  it('reports expired sessions without parsing or leaking the response', async () => {
    const client = new HttpCloudSyncClient({
      fetcher: vi
        .fn<typeof fetch>()
        .mockResolvedValue(new Response('expired', { status: 401 }))
    })

    await expect(
      client.inspect(() => Promise.resolve('expired_token'))
    ).rejects.toMatchObject({
      code: 'unauthorized'
    })
  })

  it('rejects a response with an incompatible protocol shape', async () => {
    const client = new HttpCloudSyncClient({
      fetcher: vi
        .fn<typeof fetch>()
        .mockResolvedValue(
          Response.json({ ...stateResponse, protocolVersion: 2 })
        )
    })

    await expect(
      client.inspect(() => Promise.resolve('session_token'))
    ).rejects.toMatchObject({
      code: 'invalid_response'
    })
  })
})
