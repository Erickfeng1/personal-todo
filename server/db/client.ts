import { neon, type NeonQueryFunction } from '@neondatabase/serverless'
import { parseDatabaseEnv, parseMigrationEnv } from '../env.js'

let sql: NeonQueryFunction<false, false> | undefined
let migrationSql: NeonQueryFunction<false, false> | undefined

export function getSql(): NeonQueryFunction<false, false> {
  sql ??= neon(parseDatabaseEnv().DATABASE_URL)
  return sql
}

export function getMigrationSql(): NeonQueryFunction<false, false> {
  migrationSql ??= neon(parseMigrationEnv().DATABASE_URL_UNPOOLED)
  return migrationSql
}
