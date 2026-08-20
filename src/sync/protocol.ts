import { z } from 'zod'

export const SYNC_PROTOCOL_VERSION = 1 as const

export const syncEntityTypeSchema = z.enum([
  'task',
  'project',
  'tag',
  'settings'
])

export type SyncEntityType = z.infer<typeof syncEntityTypeSchema>

export const syncStateSchema = z.object({
  protocolVersion: z.literal(SYNC_PROTOCOL_VERSION),
  requestId: z.uuid(),
  cloudEmpty: z.boolean(),
  counts: z.object({
    tasks: z.number().int().nonnegative(),
    projects: z.number().int().nonnegative(),
    tags: z.number().int().nonnegative(),
    settings: z.number().int().nonnegative()
  })
})

export type SyncState = z.infer<typeof syncStateSchema>

const syncMutationBaseSchema = z.object({
  mutationId: z.uuid(),
  entityType: syncEntityTypeSchema,
  entityId: z.string().min(1).max(128),
  baseRevision: z.number().int().nonnegative().nullable()
})

export const syncMutationSchema = z.discriminatedUnion('operation', [
  syncMutationBaseSchema.extend({
    operation: z.literal('upsert'),
    payload: z.record(z.string(), z.unknown())
  }),
  syncMutationBaseSchema.extend({
    operation: z.literal('delete'),
    payload: z.null()
  })
])

export type SyncMutation = z.infer<typeof syncMutationSchema>

export const syncPushRequestSchema = z.object({
  protocolVersion: z.literal(SYNC_PROTOCOL_VERSION),
  mutations: z.array(syncMutationSchema).max(500)
})

export const syncPullRequestSchema = z.object({
  protocolVersion: z.literal(SYNC_PROTOCOL_VERSION),
  cursor: z.string().min(1).nullable(),
  limit: z.number().int().min(1).max(500).default(200)
})

export const syncChangeSchema = z.object({
  entityType: syncEntityTypeSchema,
  entityId: z.string().min(1).max(128),
  revision: z.number().int().positive(),
  serverUpdatedAt: z.iso.datetime(),
  syncDeletedAt: z.iso.datetime().nullable(),
  payload: z.record(z.string(), z.unknown()).nullable()
})

export type SyncChange = z.infer<typeof syncChangeSchema>

export const syncPullResponseSchema = z.object({
  protocolVersion: z.literal(SYNC_PROTOCOL_VERSION),
  requestId: z.uuid(),
  changes: z.array(syncChangeSchema).max(500),
  nextCursor: z.string().min(1).nullable(),
  hasMore: z.boolean()
})

export type SyncPullResponse = z.infer<typeof syncPullResponseSchema>
