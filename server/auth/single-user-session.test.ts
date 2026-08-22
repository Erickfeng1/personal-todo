import { describe, expect, it } from 'vitest'
import { hashPassword, verifyPassword } from './password-hash'
import {
  createSessionCookie,
  createSessionToken,
  verifySessionToken
} from './single-user-session'

describe('single-user authentication', () => {
  it('uses a salted scrypt hash and verifies only the matching password', async () => {
    const encoded = await hashPassword('correct horse battery staple')
    expect(encoded).toMatch(/^scrypt\$/)
    await expect(
      verifyPassword('correct horse battery staple', encoded)
    ).resolves.toBe(true)
    await expect(verifyPassword('incorrect password', encoded)).resolves.toBe(
      false
    )
  })

  it('rejects expired, tampered, and cross-owner session tokens', () => {
    const secret = 'a-session-secret-that-is-long-enough'
    const token = createSessionToken('single-user', secret, 1_000)
    expect(verifySessionToken(token, secret, 'single-user', 2_000)).toBe(true)
    expect(verifySessionToken(token, secret, 'other-user', 2_000)).toBe(false)
    expect(verifySessionToken(`${token}x`, secret, 'single-user', 2_000)).toBe(
      false
    )
    expect(verifySessionToken(token, secret, 'single-user', 50_000_000)).toBe(
      false
    )
  })

  it('sets protected cookie attributes in production', () => {
    expect(createSessionCookie('token', true)).toContain('HttpOnly')
    expect(createSessionCookie('token', true)).toContain('SameSite=Strict')
    expect(createSessionCookie('token', true)).toContain('Secure')
  })
})
