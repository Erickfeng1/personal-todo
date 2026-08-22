import { createSingleUserAuthVerifier } from '../../server/auth/single-user-session.js'
import { NeonCloudDataRepository } from '../../server/db/cloud-data-repository.js'
import { getSql } from '../../server/db/client.js'
import { createCloudEntityHandler } from '../../server/http/cloud-data-handlers.js'

let handler: ReturnType<typeof createCloudEntityHandler> | undefined

export function PUT(request: Request): Promise<Response> {
  handler ??= createCloudEntityHandler({
    auth: createSingleUserAuthVerifier(),
    repository: new NeonCloudDataRepository(getSql())
  })
  return handler(request)
}
