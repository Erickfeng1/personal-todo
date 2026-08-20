import { describe, expect, it } from 'vitest'
import {
  SYNC_PROTOCOL_VERSION,
  syncPushRequestSchema,
  syncStateSchema
} from './protocol'

describe('sync protocol', () => {
  it('accepts a versioned cloud state response', () => {
    expect(
      syncStateSchema.parse({
        protocolVersion: SYNC_PROTOCOL_VERSION,
        requestId: '11111111-1111-4111-8111-111111111111',
        cloudEmpty: true,
        counts: { tasks: 0, projects: 0, tags: 0, settings: 0 }
      })
    ).toEqual({
      protocolVersion: 1,
      requestId: '11111111-1111-4111-8111-111111111111',
      cloudEmpty: true,
      counts: { tasks: 0, projects: 0, tags: 0, settings: 0 }
    })
  })

  it('rejects unsupported protocol versions', () => {
    expect(() =>
      syncPushRequestSchema.parse({ protocolVersion: 2, mutations: [] })
    ).toThrow()
  })

  it('caps mutation batches', () => {
    const mutation = {
      mutationId: crypto.randomUUID(),
      entityType: 'task',
      entityId: crypto.randomUUID(),
      operation: 'delete',
      baseRevision: 1,
      payload: null
    }

    expect(() =>
      syncPushRequestSchema.parse({
        protocolVersion: 1,
        mutations: Array.from({ length: 501 }, () => mutation)
      })
    ).toThrow()
  })
})
