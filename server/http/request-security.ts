import { createHmac } from 'node:crypto'
import type { AuthEnv } from '../env.js'
import { getAuthorizedParties } from '../env.js'

export function hasAuthorizedOrigin(
  request: Request,
  environment: AuthEnv
): boolean {
  const origin = request.headers.get('origin')
  return origin !== null && getAuthorizedParties(environment).includes(origin)
}

export function requestFingerprint(request: Request, secret: string): string {
  const forwarded = request.headers
    .get('x-forwarded-for')
    ?.split(',')[0]
    ?.trim()
  const address = forwarded || request.headers.get('x-real-ip') || 'unknown'
  return createHmac('sha256', secret).update(address).digest('hex')
}
