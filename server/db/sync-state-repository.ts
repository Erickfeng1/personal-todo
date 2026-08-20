import type { NeonQueryFunction } from '@neondatabase/serverless'
import type { SyncState } from '../../src/sync/protocol.js'
import { SYNC_PROTOCOL_VERSION } from '../../src/sync/protocol.js'

export type SyncCounts = SyncState['counts']

export interface SyncStateRepository {
  getCounts(userId: string): Promise<SyncCounts>
}

interface CountsRow {
  tasks: string
  projects: string
  tags: string
  settings: string
}

export class NeonSyncStateRepository implements SyncStateRepository {
  constructor(private readonly sql: NeonQueryFunction<false, false>) {}

  async getCounts(userId: string): Promise<SyncCounts> {
    const rows = await this.sql.query(
      `SELECT
        (SELECT COUNT(*) FROM cloud_tasks WHERE user_id = $1 AND sync_deleted_at IS NULL) AS tasks,
        (SELECT COUNT(*) FROM cloud_projects WHERE user_id = $1 AND sync_deleted_at IS NULL) AS projects,
        (SELECT COUNT(*) FROM cloud_tags WHERE user_id = $1 AND sync_deleted_at IS NULL) AS tags,
        (SELECT COUNT(*) FROM cloud_settings WHERE user_id = $1 AND sync_deleted_at IS NULL) AS settings`,
      [userId]
    )
    const row = rows[0] as unknown as CountsRow | undefined

    if (!row) throw new Error('Unable to read sync state')

    return {
      tasks: Number(row.tasks),
      projects: Number(row.projects),
      tags: Number(row.tags),
      settings: Number(row.settings)
    }
  }
}

export function toSyncState(counts: SyncCounts): SyncState {
  return {
    protocolVersion: SYNC_PROTOCOL_VERSION,
    requestId: crypto.randomUUID(),
    cloudEmpty: Object.values(counts).every((count) => count === 0),
    counts
  }
}
