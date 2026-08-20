import { createHash } from 'node:crypto'
import { readdir, readFile } from 'node:fs/promises'
import { join } from 'node:path'
import type { NeonQueryFunction } from '@neondatabase/serverless'

const BREAKPOINT = '-- statement-breakpoint'

interface AppliedMigration {
  name: string
  checksum: string
}

export interface MigrationResult {
  applied: string[]
  skipped: string[]
}

export async function runMigrations(
  sql: NeonQueryFunction<false, false>,
  migrationsDirectory: string
): Promise<MigrationResult> {
  await sql.query(`CREATE TABLE IF NOT EXISTS schema_migrations (
    name TEXT PRIMARY KEY,
    checksum TEXT NOT NULL,
    applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
  )`)

  const appliedRows = (await sql.query(
    'SELECT name, checksum FROM schema_migrations ORDER BY name'
  )) as unknown as AppliedMigration[]
  const appliedByName = new Map(
    appliedRows.map((migration) => [migration.name, migration.checksum])
  )
  const names = (await readdir(migrationsDirectory))
    .filter((name) => /^\d+.*\.sql$/.test(name))
    .sort()
  const result: MigrationResult = { applied: [], skipped: [] }

  for (const name of names) {
    const source = await readFile(join(migrationsDirectory, name), 'utf8')
    const checksum = createHash('sha256').update(source).digest('hex')
    const existingChecksum = appliedByName.get(name)

    if (existingChecksum) {
      if (existingChecksum !== checksum) {
        throw new Error(`Applied migration was modified: ${name}`)
      }
      result.skipped.push(name)
      continue
    }

    const statements = source
      .split(BREAKPOINT)
      .map((statement) => statement.trim())
      .filter(Boolean)

    await sql.transaction((transaction) => [
      transaction.query(
        "SELECT pg_advisory_xact_lock(hashtext('personal-todo-migrations'))"
      ),
      ...statements.map((statement) => transaction.query(statement)),
      transaction.query(
        'INSERT INTO schema_migrations (name, checksum) VALUES ($1, $2) ON CONFLICT (name) DO NOTHING',
        [name, checksum]
      )
    ])
    result.applied.push(name)
  }

  return result
}
