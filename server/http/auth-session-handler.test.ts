import { afterEach, describe, expect, it, vi } from 'vitest'
import { hashPassword } from '../auth/password-hash'
import { createAuthSessionHandler } from './auth-session-handler'

afterEach(() => vi.unstubAllEnvs())

async function configure() {
  vi.stubEnv(
    'SINGLE_USER_PASSWORD_HASH',
    await hashPassword('correct horse battery staple')
  )
  vi.stubEnv(
    'SINGLE_USER_SESSION_SECRET',
    'a-session-secret-that-is-long-enough'
  )
  vi.stubEnv('SINGLE_USER_ID', 'single-user')
  vi.stubEnv('APP_ORIGINS', 'https://todo.example')
}

describe('auth session handler', () => {
  it('rejects wrong origins before password verification', async () => {
    await configure()
    const rateLimiter = {
      isLocked: vi.fn(),
      recordFailure: vi.fn(),
      reset: vi.fn()
    }
    const handler = createAuthSessionHandler(rateLimiter)
    const response = await handler(
      new Request('https://todo.example/api/auth/session', {
        method: 'POST',
        headers: {
          origin: 'https://evil.example',
          'content-type': 'application/json'
        },
        body: JSON.stringify({ password: 'correct horse battery staple' })
      })
    )
    expect(response.status).toBe(403)
    expect(rateLimiter.isLocked).not.toHaveBeenCalled()
  })

  it('sets a session only for the correct password', async () => {
    await configure()
    const rateLimiter = {
      isLocked: vi.fn().mockResolvedValue(false),
      recordFailure: vi.fn().mockResolvedValue(undefined),
      reset: vi.fn().mockResolvedValue(undefined)
    }
    const handler = createAuthSessionHandler(rateLimiter)
    const response = await handler(
      new Request('https://todo.example/api/auth/session', {
        method: 'POST',
        headers: {
          origin: 'https://todo.example',
          'content-type': 'application/json'
        },
        body: JSON.stringify({ password: 'correct horse battery staple' })
      })
    )
    expect(response.status).toBe(200)
    expect(response.headers.get('set-cookie')).toContain('HttpOnly')
    expect(rateLimiter.reset).toHaveBeenCalledOnce()
  })

  it('returns 429 while the fingerprint is locked', async () => {
    await configure()
    const handler = createAuthSessionHandler({
      isLocked: vi.fn().mockResolvedValue(true),
      recordFailure: vi.fn(),
      reset: vi.fn()
    })
    const response = await handler(
      new Request('https://todo.example/api/auth/session', {
        method: 'POST',
        headers: {
          origin: 'https://todo.example',
          'content-type': 'application/json'
        },
        body: JSON.stringify({ password: 'anything' })
      })
    )
    expect(response.status).toBe(429)
  })
})
