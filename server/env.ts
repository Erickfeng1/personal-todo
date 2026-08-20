import { z } from 'zod'

type Environment = Record<string, string | undefined>

const processEnvironment =
  (
    globalThis as typeof globalThis & {
      process?: { env?: Environment }
    }
  ).process?.env ?? {}

const databaseEnvSchema = z.object({
  DATABASE_URL: z.url().startsWith('postgres')
})

const migrationEnvSchema = z.object({
  DATABASE_URL_UNPOOLED: z.url().startsWith('postgres')
})

const authEnvSchema = z.object({
  CLERK_SECRET_KEY: z.string().min(1),
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: z.string().min(1),
  APP_ORIGINS: z.string().optional(),
  VERCEL_URL: z.string().optional(),
  VERCEL_ENV: z.enum(['development', 'preview', 'production']).optional()
})

const syncEnvSchema = z.object({
  SYNC_CURSOR_SECRET: z.string().min(32)
})

export type DatabaseEnv = z.infer<typeof databaseEnvSchema>
export type MigrationEnv = z.infer<typeof migrationEnvSchema>
export type AuthEnv = z.infer<typeof authEnvSchema>
export type SyncEnv = z.infer<typeof syncEnvSchema>

export function parseDatabaseEnv(
  environment: Environment = processEnvironment
): DatabaseEnv {
  return databaseEnvSchema.parse(environment)
}

export function parseMigrationEnv(
  environment: Environment = processEnvironment
): MigrationEnv {
  return migrationEnvSchema.parse(environment)
}

export function parseAuthEnv(
  environment: Environment = processEnvironment
): AuthEnv {
  return authEnvSchema.parse(environment)
}

export function parseSyncEnv(
  environment: Environment = processEnvironment
): SyncEnv {
  return syncEnvSchema.parse(environment)
}

export function getAuthorizedParties(environment: AuthEnv): string[] {
  const configured = (environment.APP_ORIGINS ?? '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean)

  if (environment.VERCEL_URL) {
    configured.push(`https://${environment.VERCEL_URL}`)
  }

  const parties = [...new Set(configured)]
  if (parties.length === 0 && environment.VERCEL_ENV !== 'production') {
    return ['http://localhost:3000', 'http://localhost:5173']
  }

  if (parties.length === 0) {
    throw new Error('APP_ORIGINS is required in production')
  }

  return parties
}
