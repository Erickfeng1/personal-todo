import { createHmac, timingSafeEqual } from 'node:crypto'
import type { AuthVerifier } from './auth-verifier.js'
import { parseAuthEnv } from '../env.js'

export const SESSION_COOKIE_NAME = 'personal_todo_session'
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 12

interface SessionPayload {
  version: 1
  userId: string
  expiresAt: number
}

function sign(value: string, secret: string): string {
  return createHmac('sha256', secret).update(value).digest('base64url')
}

export function createSessionToken(
  userId: string,
  secret: string,
  now = Date.now()
): string {
  const payload: SessionPayload = {
    version: 1,
    userId,
    expiresAt: now + SESSION_MAX_AGE_SECONDS * 1000
  }
  const encoded = Buffer.from(JSON.stringify(payload)).toString('base64url')
  return `${encoded}.${sign(encoded, secret)}`
}

export function verifySessionToken(
  token: string,
  secret: string,
  expectedUserId: string,
  now = Date.now()
): boolean {
  const [encoded, signature, extra] = token.split('.')
  if (!encoded || !signature || extra) return false

  const expectedSignature = sign(encoded, secret)
  const actualBuffer = Buffer.from(signature)
  const expectedBuffer = Buffer.from(expectedSignature)
  if (
    actualBuffer.length !== expectedBuffer.length ||
    !timingSafeEqual(actualBuffer, expectedBuffer)
  ) {
    return false
  }

  try {
    const payload = JSON.parse(
      Buffer.from(encoded, 'base64url').toString('utf8')
    ) as Partial<SessionPayload>
    return (
      payload.version === 1 &&
      payload.userId === expectedUserId &&
      typeof payload.expiresAt === 'number' &&
      payload.expiresAt > now
    )
  } catch {
    return false
  }
}

function readCookie(request: Request, name: string): string | null {
  const cookies = request.headers.get('cookie') ?? ''
  for (const item of cookies.split(';')) {
    const [key, ...valueParts] = item.trim().split('=')
    if (key === name) return valueParts.join('=') || null
  }
  return null
}

export function createSessionCookie(
  token: string,
  production: boolean
): string {
  return [
    `${SESSION_COOKIE_NAME}=${token}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Strict',
    production ? 'Secure' : '',
    `Max-Age=${String(SESSION_MAX_AGE_SECONDS)}`
  ]
    .filter(Boolean)
    .join('; ')
}

export function clearSessionCookie(production: boolean): string {
  return [
    `${SESSION_COOKIE_NAME}=`,
    'Path=/',
    'HttpOnly',
    'SameSite=Strict',
    production ? 'Secure' : '',
    'Max-Age=0'
  ]
    .filter(Boolean)
    .join('; ')
}

export function createSingleUserAuthVerifier(): AuthVerifier {
  const environment = parseAuthEnv()
  return {
    authenticate(request) {
      const token = readCookie(request, SESSION_COOKIE_NAME)
      const valid =
        token !== null &&
        verifySessionToken(
          token,
          environment.SINGLE_USER_SESSION_SECRET,
          environment.SINGLE_USER_ID
        )
      return Promise.resolve(
        valid ? { userId: environment.SINGLE_USER_ID } : null
      )
    }
  }
}
