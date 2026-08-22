import { getSql } from '../../server/db/client.js'
import { NeonLoginRateLimiter } from '../../server/db/login-rate-limit.js'
import { createAuthSessionHandler } from '../../server/http/auth-session-handler.js'

let handler: ReturnType<typeof createAuthSessionHandler> | undefined

function getHandler() {
  handler ??= createAuthSessionHandler(new NeonLoginRateLimiter(getSql()))
  return handler
}

export function GET(request: Request): Promise<Response> {
  return getHandler()(request)
}

export function POST(request: Request): Promise<Response> {
  return getHandler()(request)
}

export function DELETE(request: Request): Promise<Response> {
  return getHandler()(request)
}
