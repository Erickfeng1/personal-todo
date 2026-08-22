import { describe, expect, it } from 'vitest'
import {
  getAuthorizedParties,
  parseAuthEnv,
  parseDatabaseEnv,
  parseMigrationEnv,
  parseSyncEnv
} from './env'

const requiredAuth = {
  SINGLE_USER_PASSWORD_HASH: 'scrypt$salt$hash',
  SINGLE_USER_SESSION_SECRET: 'a-secret-that-is-at-least-32-characters'
}

describe('server environment', () => {
  it('fails closed when database or auth secrets are missing', () => {
    expect(() => parseDatabaseEnv({})).toThrow()
    expect(() => parseMigrationEnv({})).toThrow()
    expect(() => parseAuthEnv({})).toThrow()
    expect(() => parseSyncEnv({})).toThrow()
  })

  it('deduplicates configured and preview origins', () => {
    const environment = parseAuthEnv({
      ...requiredAuth,
      APP_ORIGINS: 'https://todo.example, https://todo.example',
      VERCEL_URL: 'preview.example'
    })

    expect(getAuthorizedParties(environment)).toEqual([
      'https://todo.example',
      'https://preview.example'
    ])
  })

  it('requires an explicit origin in production', () => {
    const environment = parseAuthEnv({
      ...requiredAuth,
      VERCEL_ENV: 'production'
    })

    expect(() => getAuthorizedParties(environment)).toThrow(
      'APP_ORIGINS is required in production'
    )
  })
})
