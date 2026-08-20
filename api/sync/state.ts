import { createClerkAuthVerifier } from '../../server/auth/clerk-auth-verifier.js'
import { getSql } from '../../server/db/client.js'
import { NeonSyncStateRepository } from '../../server/db/sync-state-repository.js'
import { createSyncStateHandler } from '../../server/http/sync-state-handler.js'

let handler: ReturnType<typeof createSyncStateHandler> | undefined

export function GET(request: Request): Promise<Response> {
  handler ??= createSyncStateHandler({
    auth: createClerkAuthVerifier(),
    repository: new NeonSyncStateRepository(getSql())
  })

  return handler(request)
}
