import { createSingleUserAuthVerifier } from '../../server/auth/single-user-session.js'
import { NeonCloudDataRepository } from '../../server/db/cloud-data-repository.js'
import { getSql } from '../../server/db/client.js'
import { createCloudTagDeleteHandler } from '../../server/http/cloud-data-handlers.js'

let handler: ReturnType<typeof createCloudTagDeleteHandler> | undefined

export function DELETE(request: Request): Promise<Response> {
  handler ??= createCloudTagDeleteHandler({
    auth: createSingleUserAuthVerifier(),
    repository: new NeonCloudDataRepository(getSql())
  })
  return handler(request)
}
