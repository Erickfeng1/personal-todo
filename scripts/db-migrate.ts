import { resolve } from 'node:path'
import { assertNonProductionDatabase } from '../server/db/database-safety'
import { getMigrationSql } from '../server/db/client'
import { runMigrations } from '../server/db/migration-runner'

assertNonProductionDatabase()

const result = await runMigrations(
  getMigrationSql(),
  resolve(process.cwd(), 'db/migrations')
)

console.info(
  `Database migrations complete: ${result.applied.length} applied, ${result.skipped.length} unchanged.`
)
