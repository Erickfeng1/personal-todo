import { describe, expect, it } from 'vitest'
import {
  getAuthorizedParties,
  parseAuthEnv,
  parseDatabaseEnv,
  parseMigrationEnv,
  parseSyncEnv
} from './env'

const requiredAuth = {
  CLERK_SECRET_KEY: 'secret',
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: 'publishable'
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
