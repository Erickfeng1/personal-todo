import { createSingleUserAuthVerifier } from '../../server/auth/single-user-session.js'
import { NeonCloudDataRepository } from '../../server/db/cloud-data-repository.js'
import { getSql } from '../../server/db/client.js'
import { createCloudStateHandler } from '../../server/http/cloud-data-handlers.js'

let handler: ReturnType<typeof createCloudStateHandler> | undefined

export function GET(request: Request): Promise<Response> {
  handler ??= createCloudStateHandler({
    auth: createSingleUserAuthVerifier(),
    repository: new NeonCloudDataRepository(getSql())
  })
  return handler(request)
}
