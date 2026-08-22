import type { NeonQueryFunction } from '@neondatabase/serverless'

interface RateLimitRow {
  failed_count: number
  locked: boolean
}

export interface LoginRateLimiter {
  isLocked(identifierHash: string): Promise<boolean>
  recordFailure(identifierHash: string): Promise<void>
  reset(identifierHash: string): Promise<void>
}

export class NeonLoginRateLimiter implements LoginRateLimiter {
  constructor(private readonly sql: NeonQueryFunction<false, false>) {}

  async isLocked(identifierHash: string): Promise<boolean> {
    const rows = await this.sql.query(
      `SELECT failed_count,
              locked_until IS NOT NULL AND locked_until > now() AS locked
       FROM single_user_login_attempts
       WHERE identifier_hash = $1`,
      [identifierHash]
    )
    return Boolean((rows[0] as unknown as RateLimitRow | undefined)?.locked)
  }

  async recordFailure(identifierHash: string): Promise<void> {
    await this.sql.query(
      `INSERT INTO single_user_login_attempts
         (identifier_hash, failed_count, window_started_at, locked_until, updated_at)
       VALUES ($1, 1, now(), NULL, now())
       ON CONFLICT (identifier_hash) DO UPDATE SET
         failed_count = CASE
           WHEN single_user_login_attempts.window_started_at < now() - interval '15 minutes' THEN 1
           ELSE single_user_login_attempts.failed_count + 1
         END,
         window_started_at = CASE
           WHEN single_user_login_attempts.window_started_at < now() - interval '15 minutes' THEN now()
           ELSE single_user_login_attempts.window_started_at
         END,
         locked_until = CASE
           WHEN single_user_login_attempts.window_started_at >= now() - interval '15 minutes'
             AND single_user_login_attempts.failed_count + 1 >= 5
           THEN now() + interval '15 minutes'
           ELSE NULL
         END,
         updated_at = now()`,
      [identifierHash]
    )
  }

  async reset(identifierHash: string): Promise<void> {
    await this.sql.query(
      'DELETE FROM single_user_login_attempts WHERE identifier_hash = $1',
      [identifierHash]
    )
  }
}
