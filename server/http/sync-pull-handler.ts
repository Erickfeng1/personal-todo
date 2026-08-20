import {
  syncChangeSchema,
  syncPullRequestSchema
} from '../../src/sync/protocol.js'
import type { AuthVerifier } from '../auth/auth-verifier.js'
import type { SyncPullRepository } from '../db/sync-pull-repository.js'
import { InvalidSyncCursorError } from '../sync/cursor.js'
import { errorResponse, jsonResponse } from './responses.js'
import { SYNC_PROTOCOL_VERSION } from '../../src/sync/protocol.js'

export interface SyncCursorCodec {
  decode(cursor: string, userId: string): Promise<number>
  encode(sequence: number, userId: string): Promise<string>
}

export interface SyncPullDependencies {
  auth: AuthVerifier
  repository: SyncPullRepository
  cursor: SyncCursorCodec
}

export function createSyncPullHandler(dependencies: SyncPullDependencies) {
  return async function handleSyncPull(request: Request): Promise<Response> {
    if (request.method !== 'GET') {
      return errorResponse(405, 'method_not_allowed')
    }

    try {
      const authenticatedUser = await dependencies.auth.authenticate(request)
      if (!authenticatedUser) return errorResponse(401, 'unauthorized')

      const url = new URL(request.url)
      const protocolVersion = Number(url.searchParams.get('protocolVersion'))
      if (protocolVersion !== SYNC_PROTOCOL_VERSION) {
        return errorResponse(400, 'unsupported_protocol')
      }

      const parsed = syncPullRequestSchema.safeParse({
        protocolVersion,
        cursor: url.searchParams.get('cursor'),
        limit: url.searchParams.has('limit')
          ? Number(url.searchParams.get('limit'))
          : undefined
      })
      if (!parsed.success) return errorResponse(400, 'invalid_sync_request')

      const afterSequence = parsed.data.cursor
        ? await dependencies.cursor.decode(
            parsed.data.cursor,
            authenticatedUser.userId
          )
        : 0
      const page = await dependencies.repository.pull(
        authenticatedUser.userId,
        afterSequence,
        parsed.data.limit
      )
      const lastChange = page.changes[page.changes.length - 1]
      const nextCursor = lastChange
        ? await dependencies.cursor.encode(
            lastChange.sequence,
            authenticatedUser.userId
          )
        : parsed.data.cursor

      return jsonResponse({
        protocolVersion: SYNC_PROTOCOL_VERSION,
        requestId: crypto.randomUUID(),
        changes: page.changes.map((change) => syncChangeSchema.parse(change)),
        nextCursor,
        hasMore: page.hasMore
      })
    } catch (cause) {
      if (cause instanceof InvalidSyncCursorError) {
        return errorResponse(400, 'invalid_cursor')
      }
      return errorResponse(503, 'sync_pull_unavailable')
    }
  }
}
