import type { AuthVerifier } from '../auth/auth-verifier.js'
import type { SyncStateRepository } from '../db/sync-state-repository.js'
import { toSyncState } from '../db/sync-state-repository.js'
import { errorResponse, jsonResponse } from './responses.js'
import { SYNC_PROTOCOL_VERSION } from '../../src/sync/protocol.js'

export interface SyncStateDependencies {
  auth: AuthVerifier
  repository: SyncStateRepository
}

export function createSyncStateHandler(dependencies: SyncStateDependencies) {
  return async function handleSyncState(request: Request): Promise<Response> {
    if (request.method !== 'GET') {
      return errorResponse(405, 'method_not_allowed')
    }

    try {
      const authenticatedUser = await dependencies.auth.authenticate(request)
      if (!authenticatedUser) return errorResponse(401, 'unauthorized')

      const protocolVersion = Number(
        new URL(request.url).searchParams.get('protocolVersion')
      )
      if (protocolVersion !== SYNC_PROTOCOL_VERSION) {
        return errorResponse(400, 'unsupported_protocol')
      }

      const counts = await dependencies.repository.getCounts(
        authenticatedUser.userId
      )
      return jsonResponse(toSyncState(counts))
    } catch {
      return errorResponse(503, 'sync_state_unavailable')
    }
  }
}
