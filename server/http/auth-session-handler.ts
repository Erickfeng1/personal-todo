import { z } from 'zod'
import type { LoginRateLimiter } from '../db/login-rate-limit.js'
import { parseAuthEnv } from '../env.js'
import { errorResponse, jsonResponse } from './responses.js'
import { hasAuthorizedOrigin, requestFingerprint } from './request-security.js'
import { verifyPassword } from '../auth/password-hash.js'
import {
  clearSessionCookie,
  createSessionCookie,
  createSessionToken,
  createSingleUserAuthVerifier
} from '../auth/single-user-session.js'

const loginSchema = z.object({ password: z.string().min(1).max(1024) }).strict()

export function createAuthSessionHandler(rateLimiter: LoginRateLimiter) {
  return async function handle(request: Request): Promise<Response> {
    const environment = parseAuthEnv()
    const secureCookie =
      environment.VERCEL_ENV !== undefined &&
      environment.VERCEL_ENV !== 'development'
    const auth = createSingleUserAuthVerifier()

    if (request.method === 'GET') {
      return jsonResponse({
        authenticated: (await auth.authenticate(request)) !== null
      })
    }

    if (!hasAuthorizedOrigin(request, environment)) {
      return errorResponse(403, 'ORIGIN_NOT_ALLOWED')
    }

    if (request.method === 'DELETE') {
      return jsonResponse(
        { authenticated: false },
        { headers: { 'set-cookie': clearSessionCookie(secureCookie) } }
      )
    }

    if (request.method !== 'POST')
      return errorResponse(405, 'METHOD_NOT_ALLOWED')

    const fingerprint = requestFingerprint(
      request,
      environment.SINGLE_USER_SESSION_SECRET
    )
    if (await rateLimiter.isLocked(fingerprint)) {
      return errorResponse(429, 'LOGIN_RATE_LIMITED')
    }

    let input: z.infer<typeof loginSchema>
    try {
      input = loginSchema.parse(await request.json())
    } catch {
      return errorResponse(400, 'INVALID_REQUEST')
    }

    const valid = await verifyPassword(
      input.password,
      environment.SINGLE_USER_PASSWORD_HASH
    )
    if (!valid) {
      await rateLimiter.recordFailure(fingerprint)
      return errorResponse(401, 'INVALID_PASSWORD')
    }

    await rateLimiter.reset(fingerprint)
    const token = createSessionToken(
      environment.SINGLE_USER_ID,
      environment.SINGLE_USER_SESSION_SECRET
    )
    return jsonResponse(
      { authenticated: true },
      { headers: { 'set-cookie': createSessionCookie(token, secureCookie) } }
    )
  }
}
