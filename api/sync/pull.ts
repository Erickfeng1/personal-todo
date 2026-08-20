import { createClerkAuthVerifier } from '../../server/auth/clerk-auth-verifier.js'
import { getSql } from '../../server/db/client.js'
import { NeonSyncPullRepository } from '../../server/db/sync-pull-repository.js'
import { parseSyncEnv } from '../../server/env.js'
import { createSyncPullHandler } from '../../server/http/sync-pull-handler.js'
import { decodeSyncCursor, encodeSyncCursor } from '../../server/sync/cursor.js'

let handler: ReturnType<typeof createSyncPullHandler> | undefined

export function GET(request: Request): Promise<Response> {
  if (!handler) {
    const secret = parseSyncEnv().SYNC_CURSOR_SECRET
    handler = createSyncPullHandler({
      auth: createClerkAuthVerifier(),
      repository: new NeonSyncPullRepository(getSql()),
      cursor: {
        decode: (cursor, userId) => decodeSyncCursor(cursor, userId, secret),
        encode: (sequence, userId) => encodeSyncCursor(sequence, userId, secret)
      }
    })
  }

  return handler(request)
}
