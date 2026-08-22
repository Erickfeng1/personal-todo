import { createSingleUserAuthVerifier } from '../../server/auth/single-user-session.js'
import { NeonCloudDataRepository } from '../../server/db/cloud-data-repository.js'
import { getSql } from '../../server/db/client.js'
import { createCloudRestoreHandler } from '../../server/http/cloud-data-handlers.js'

let handler: ReturnType<typeof createCloudRestoreHandler> | undefined

export function POST(request: Request): Promise<Response> {
  handler ??= createCloudRestoreHandler({
    auth: createSingleUserAuthVerifier(),
    repository: new NeonCloudDataRepository(getSql())
  })
  return handler(request)
}
