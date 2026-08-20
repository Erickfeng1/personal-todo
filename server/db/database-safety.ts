const NON_PRODUCTION_ENVIRONMENTS = new Set(['development', 'test', 'preview'])

export function assertNonProductionDatabase(
  environment: NodeJS.ProcessEnv = process.env
): void {
  const target = environment.DATABASE_ENVIRONMENT

  if (target && NON_PRODUCTION_ENVIRONMENTS.has(target)) return
  if (environment.ALLOW_PRODUCTION_MIGRATIONS === 'true') return

  throw new Error(
    'Refusing database mutation: set DATABASE_ENVIRONMENT to development, test, or preview'
  )
}
