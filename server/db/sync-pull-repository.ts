import type { NeonQueryFunction } from '@neondatabase/serverless'
import {
  syncChangeSchema,
  type SyncChange,
  type SyncEntityType
} from '../../src/sync/protocol.js'

export interface SequencedSyncChange extends SyncChange {
  sequence: number
}

export interface SyncPullPage {
  changes: SequencedSyncChange[]
  hasMore: boolean
}

export interface SyncPullRepository {
  pull(
    userId: string,
    afterSequence: number,
    limit: number
  ): Promise<SyncPullPage>
}

interface ChangeRow {
  sequence: string
  entity_type: SyncEntityType
  entity_id: string
  revision: string
  server_updated_at: string | Date
  sync_deleted_at: string | Date | null
  payload: unknown
}

function toIsoString(value: string | Date): string {
  return new Date(value).toISOString()
}

export class NeonSyncPullRepository implements SyncPullRepository {
  constructor(private readonly sql: NeonQueryFunction<false, false>) {}

  async pull(
    userId: string,
    afterSequence: number,
    limit: number
  ): Promise<SyncPullPage> {
    const rows = (await this.sql.query(
      `SELECT
         change.sequence,
         change.entity_type,
         change.entity_id,
         change.revision,
         change.server_updated_at,
         change.sync_deleted_at,
         CASE change.entity_type
           WHEN 'task' THEN (
             SELECT payload FROM cloud_tasks
             WHERE user_id = change.user_id AND id::text = change.entity_id
           )
           WHEN 'project' THEN (
             SELECT payload FROM cloud_projects
             WHERE user_id = change.user_id AND id::text = change.entity_id
           )
           WHEN 'tag' THEN (
             SELECT payload FROM cloud_tags
             WHERE user_id = change.user_id AND id::text = change.entity_id
           )
           WHEN 'settings' THEN (
             SELECT payload FROM cloud_settings
             WHERE user_id = change.user_id AND id = change.entity_id
           )
         END AS payload
       FROM sync_changes AS change
       WHERE change.user_id = $1 AND change.sequence > $2
       ORDER BY change.sequence ASC
       LIMIT $3`,
      [userId, afterSequence, limit + 1]
    )) as unknown as ChangeRow[]

    const hasMore = rows.length > limit
    const changes = rows.slice(0, limit).map((row) => ({
      sequence: Number(row.sequence),
      ...syncChangeSchema.parse({
        entityType: row.entity_type,
        entityId: row.entity_id,
        revision: Number(row.revision),
        serverUpdatedAt: toIsoString(row.server_updated_at),
        syncDeletedAt: row.sync_deleted_at
          ? toIsoString(row.sync_deleted_at)
          : null,
        payload: row.payload
      })
    }))

    if (changes.some((change) => !Number.isSafeInteger(change.sequence))) {
      throw new Error('Invalid sync sequence')
    }

    return { changes, hasMore }
  }
}
