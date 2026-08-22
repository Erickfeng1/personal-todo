import type { NeonQueryFunction } from '@neondatabase/serverless'
import type {
  CloudDataSnapshot,
  CloudEntityType
} from '../../src/cloud/cloud.types.js'
import type { BackupEnvelopeV1 } from '../../src/data/backup/backup.types.js'
import type { Project } from '../../src/domain/project/project.types.js'
import type { AppSettings } from '../../src/domain/settings/settings.types.js'
import type { Tag } from '../../src/domain/tag/tag.types.js'
import type { Task } from '../../src/domain/task/task.types.js'

interface SnapshotRow {
  tasks: Array<{ payload: Task; revision: string | number }>
  projects: Array<{ payload: Project; revision: string | number }>
  tags: Array<{ payload: Tag; revision: string | number }>
  settings: Array<{ payload: AppSettings; revision: string | number }>
}

const tableByType = {
  task: 'cloud_tasks',
  project: 'cloud_projects',
  tag: 'cloud_tags',
  settings: 'cloud_settings'
} as const

export class RevisionConflictError extends Error {}
export class CloudNotEmptyError extends Error {}

export interface CloudDataRepository {
  getSnapshot(userId: string): Promise<CloudDataSnapshot>
  save(
    userId: string,
    entityType: CloudEntityType,
    entityId: string,
    payload: object,
    baseRevision: number | null
  ): Promise<number>
  deleteTag(
    userId: string,
    tagId: string,
    baseRevision: number
  ): Promise<number>
  replaceFromBackup(
    userId: string,
    backup: BackupEnvelopeV1,
    requireEmpty: boolean
  ): Promise<void>
}

export class NeonCloudDataRepository implements CloudDataRepository {
  constructor(private readonly sql: NeonQueryFunction<false, false>) {}

  async getSnapshot(userId: string): Promise<CloudDataSnapshot> {
    const rows = await this.sql.query(
      `SELECT
        COALESCE((SELECT jsonb_agg(jsonb_build_object('payload', payload, 'revision', revision)) FROM cloud_tasks WHERE user_id = $1 AND sync_deleted_at IS NULL), '[]'::jsonb) AS tasks,
        COALESCE((SELECT jsonb_agg(jsonb_build_object('payload', payload, 'revision', revision)) FROM cloud_projects WHERE user_id = $1 AND sync_deleted_at IS NULL), '[]'::jsonb) AS projects,
        COALESCE((SELECT jsonb_agg(jsonb_build_object('payload', payload, 'revision', revision)) FROM cloud_tags WHERE user_id = $1 AND sync_deleted_at IS NULL), '[]'::jsonb) AS tags,
        COALESCE((SELECT jsonb_agg(jsonb_build_object('payload', payload, 'revision', revision)) FROM cloud_settings WHERE user_id = $1 AND sync_deleted_at IS NULL), '[]'::jsonb) AS settings`,
      [userId]
    )
    const row = rows[0] as unknown as SnapshotRow | undefined
    if (!row) throw new Error('Unable to read cloud state')

    const settingsEntry = row.settings[0]
    return {
      data: {
        tasks: row.tasks.map((entry) => entry.payload),
        projects: row.projects.map((entry) => entry.payload),
        tags: row.tags.map((entry) => entry.payload),
        settings: settingsEntry?.payload ?? null
      },
      revisions: {
        tasks: Object.fromEntries(
          row.tasks.map((entry) => [entry.payload.id, Number(entry.revision)])
        ),
        projects: Object.fromEntries(
          row.projects.map((entry) => [
            entry.payload.id,
            Number(entry.revision)
          ])
        ),
        tags: Object.fromEntries(
          row.tags.map((entry) => [entry.payload.id, Number(entry.revision)])
        ),
        settings: settingsEntry ? Number(settingsEntry.revision) : null
      }
    }
  }

  async save(
    userId: string,
    entityType: CloudEntityType,
    entityId: string,
    payload: object,
    baseRevision: number | null
  ): Promise<number> {
    const table = tableByType[entityType]
    const rows =
      baseRevision === null
        ? await this.sql.query(
            `INSERT INTO ${table} (user_id, id, payload, revision, server_updated_at, sync_deleted_at)
             VALUES ($1, $2, $3::jsonb, 1, now(), NULL)
             ON CONFLICT (user_id, id) DO NOTHING
             RETURNING revision`,
            [userId, entityId, JSON.stringify(payload)]
          )
        : await this.sql.query(
            `UPDATE ${table}
             SET payload = $3::jsonb,
                 revision = revision + 1,
                 server_updated_at = now(),
                 sync_deleted_at = NULL
             WHERE user_id = $1 AND id = $2 AND revision = $4
             RETURNING revision`,
            [userId, entityId, JSON.stringify(payload), baseRevision]
          )
    const row = rows[0] as unknown as { revision: string | number } | undefined
    if (!row) throw new RevisionConflictError('Revision conflict')
    return Number(row.revision)
  }

  async deleteTag(
    userId: string,
    tagId: string,
    baseRevision: number
  ): Promise<number> {
    const rows = await this.sql.query(
      `WITH deleted AS (
         DELETE FROM cloud_tags
         WHERE user_id = $1 AND id = $2 AND revision = $3
         RETURNING id
       ), updated AS (
         UPDATE cloud_tasks
         SET payload = jsonb_set(
               payload,
               '{tagIds}',
               COALESCE(
                 (SELECT jsonb_agg(value)
                  FROM jsonb_array_elements(payload->'tagIds') AS value
                  WHERE value <> to_jsonb($2::text)),
                 '[]'::jsonb
               )
             ),
             revision = revision + 1,
             server_updated_at = now()
         WHERE user_id = $1
           AND EXISTS (SELECT 1 FROM deleted)
           AND payload->'tagIds' ? $2
         RETURNING id
       )
       SELECT
         EXISTS (SELECT 1 FROM deleted) AS deleted,
         (SELECT COUNT(*) FROM updated) AS detached_count`,
      [userId, tagId, baseRevision]
    )
    const row = rows[0] as unknown as
      { deleted: boolean; detached_count: string | number } | undefined
    if (!row?.deleted) throw new RevisionConflictError('Revision conflict')
    return Number(row.detached_count)
  }

  async replaceFromBackup(
    userId: string,
    backup: BackupEnvelopeV1,
    requireEmpty: boolean
  ): Promise<void> {
    if (requireEmpty) {
      const state = await this.getSnapshot(userId)
      if (
        state.data.tasks.length > 0 ||
        state.data.projects.length > 0 ||
        state.data.tags.length > 0
      ) {
        throw new CloudNotEmptyError('Cloud data is not empty')
      }
    }

    await this.sql.transaction((transaction) => [
      transaction.query('DELETE FROM cloud_tasks WHERE user_id = $1', [userId]),
      transaction.query('DELETE FROM cloud_projects WHERE user_id = $1', [
        userId
      ]),
      transaction.query('DELETE FROM cloud_tags WHERE user_id = $1', [userId]),
      transaction.query('DELETE FROM cloud_settings WHERE user_id = $1', [
        userId
      ]),
      transaction.query(
        `INSERT INTO cloud_projects (user_id, id, payload, revision)
         SELECT $1, (item->>'id')::uuid, item, 1
         FROM jsonb_array_elements($2::jsonb) AS item`,
        [userId, JSON.stringify(backup.data.projects)]
      ),
      transaction.query(
        `INSERT INTO cloud_tags (user_id, id, payload, revision)
         SELECT $1, (item->>'id')::uuid, item, 1
         FROM jsonb_array_elements($2::jsonb) AS item`,
        [userId, JSON.stringify(backup.data.tags)]
      ),
      transaction.query(
        `INSERT INTO cloud_tasks (user_id, id, payload, revision)
         SELECT $1, (item->>'id')::uuid, item, 1
         FROM jsonb_array_elements($2::jsonb) AS item`,
        [userId, JSON.stringify(backup.data.tasks)]
      ),
      transaction.query(
        `INSERT INTO cloud_settings (user_id, id, payload, revision)
         VALUES ($1, 'singleton', $2::jsonb, 1)`,
        [userId, JSON.stringify(backup.data.settings)]
      )
    ])
  }
}
