import { getSql } from '../server/db/client'

const sql = getSql()
const rows = await sql.query(
  `SELECT COUNT(*) AS migration_count
   FROM schema_migrations`
)
const migrationCount = Number(
  (rows[0] as { migration_count?: string } | undefined)?.migration_count ?? 0
)

if (migrationCount < 1) {
  throw new Error('No database migrations have been applied')
}

console.info(
  `Database connection is healthy; ${migrationCount} migration(s) applied.`
)
