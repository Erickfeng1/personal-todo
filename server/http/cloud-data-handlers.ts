import { z } from 'zod'
import type { AuthVerifier } from '../auth/auth-verifier.js'
import {
  CloudNotEmptyError,
  RevisionConflictError,
  type CloudDataRepository
} from '../db/cloud-data-repository.js'
import { parseAuthEnv } from '../env.js'
import { errorResponse, jsonResponse } from './responses.js'
import { hasAuthorizedOrigin } from './request-security.js'
import {
  projectSchema,
  settingsSchema,
  tagSchema,
  taskSchema,
  validateBackup
} from '../../src/data/backup/backup.schema.js'
import type {
  CloudDataSnapshot,
  CloudEntityType
} from '../../src/cloud/cloud.types.js'
import type { Task } from '../../src/domain/task/task.types.js'
import type { Project } from '../../src/domain/project/project.types.js'
import type { Tag } from '../../src/domain/tag/tag.types.js'
import { AppError } from '../../src/domain/shared/app-error.js'

const entityRequestSchema = z
  .object({
    entityType: z.enum(['task', 'project', 'tag', 'settings']),
    entityId: z.string().trim().min(1).max(200),
    baseRevision: z.number().int().positive().nullable(),
    payload: z.unknown()
  })
  .strict()

const deleteTagSchema = z
  .object({
    tagId: z.string().uuid(),
    baseRevision: z.number().int().positive()
  })
  .strict()

const restoreSchema = z
  .object({
    mode: z.enum(['restore', 'migrate']),
    backup: z.unknown()
  })
  .strict()

function validatePayload(entityType: CloudEntityType, payload: unknown) {
  if (entityType === 'task') return taskSchema.parse(payload)
  if (entityType === 'project') return projectSchema.parse(payload)
  if (entityType === 'tag') return tagSchema.parse(payload)
  return settingsSchema.parse(payload)
}

function validateSnapshot(snapshot: CloudDataSnapshot): CloudDataSnapshot {
  const data = {
    tasks: z.array(taskSchema).parse(snapshot.data.tasks),
    projects: z.array(projectSchema).parse(snapshot.data.projects),
    tags: z.array(tagSchema).parse(snapshot.data.tags),
    settings: settingsSchema.nullable().parse(snapshot.data.settings)
  }
  const projectIds = new Set(data.projects.map((project) => project.id))
  const tagIds = new Set(data.tags.map((tag) => tag.id))
  if (
    data.tasks.some(
      (task) =>
        (task.projectId !== null && !projectIds.has(task.projectId)) ||
        task.tagIds.some((tagId) => !tagIds.has(tagId))
    )
  ) {
    throw new Error('Invalid cloud references')
  }
  return { ...snapshot, data }
}

async function authenticate(request: Request, auth: AuthVerifier) {
  try {
    return await auth.authenticate(request)
  } catch {
    return null
  }
}

export function createCloudStateHandler(dependencies: {
  auth: AuthVerifier
  repository: CloudDataRepository
}) {
  return async function handle(request: Request): Promise<Response> {
    const user = await authenticate(request, dependencies.auth)
    if (!user) return errorResponse(401, 'UNAUTHORIZED')
    try {
      return jsonResponse(
        validateSnapshot(await dependencies.repository.getSnapshot(user.userId))
      )
    } catch {
      return errorResponse(503, 'CLOUD_READ_FAILED')
    }
  }
}

export function createCloudEntityHandler(dependencies: {
  auth: AuthVerifier
  repository: CloudDataRepository
}) {
  return async function handle(request: Request): Promise<Response> {
    const user = await authenticate(request, dependencies.auth)
    if (!user) return errorResponse(401, 'UNAUTHORIZED')
    if (request.method !== 'PUT')
      return errorResponse(405, 'METHOD_NOT_ALLOWED')
    if (!hasAuthorizedOrigin(request, parseAuthEnv())) {
      return errorResponse(403, 'ORIGIN_NOT_ALLOWED')
    }

    try {
      const input = entityRequestSchema.parse(await request.json())
      const payload = validatePayload(input.entityType, input.payload)
      if (payload.id !== input.entityId) {
        return errorResponse(400, 'ENTITY_ID_MISMATCH')
      }

      const state = validateSnapshot(
        await dependencies.repository.getSnapshot(user.userId)
      )
      if (input.entityType === 'task') {
        const task = payload as Task
        if (
          task.projectId !== null &&
          !state.data.projects.some((project) => project.id === task.projectId)
        ) {
          return errorResponse(400, 'PROJECT_NOT_FOUND')
        }
        if (
          task.tagIds.some(
            (tagId) => !state.data.tags.some((tag) => tag.id === tagId)
          )
        ) {
          return errorResponse(400, 'TAG_NOT_FOUND')
        }
      }
      if (input.entityType === 'project') {
        const name = (payload as Project).name.trim().toLocaleLowerCase()
        if (
          state.data.projects.some(
            (project) =>
              project.id !== input.entityId &&
              project.name.trim().toLocaleLowerCase() === name
          )
        ) {
          return errorResponse(409, 'DUPLICATE_NAME')
        }
      }
      if (input.entityType === 'tag') {
        const name = (payload as Tag).name.trim().toLocaleLowerCase()
        if (
          state.data.tags.some(
            (tag) =>
              tag.id !== input.entityId &&
              tag.name.trim().toLocaleLowerCase() === name
          )
        ) {
          return errorResponse(409, 'DUPLICATE_NAME')
        }
      }

      const revision = await dependencies.repository.save(
        user.userId,
        input.entityType,
        input.entityId,
        payload,
        input.baseRevision
      )
      return jsonResponse({
        entityType: input.entityType,
        entityId: input.entityId,
        revision
      })
    } catch (error) {
      if (error instanceof RevisionConflictError) {
        return errorResponse(409, 'REVISION_CONFLICT')
      }
      if (error instanceof z.ZodError)
        return errorResponse(400, 'INVALID_REQUEST')
      return errorResponse(503, 'CLOUD_WRITE_FAILED')
    }
  }
}

export function createCloudTagDeleteHandler(dependencies: {
  auth: AuthVerifier
  repository: CloudDataRepository
}) {
  return async function handle(request: Request): Promise<Response> {
    const user = await authenticate(request, dependencies.auth)
    if (!user) return errorResponse(401, 'UNAUTHORIZED')
    if (request.method !== 'DELETE')
      return errorResponse(405, 'METHOD_NOT_ALLOWED')
    if (!hasAuthorizedOrigin(request, parseAuthEnv())) {
      return errorResponse(403, 'ORIGIN_NOT_ALLOWED')
    }
    try {
      const input = deleteTagSchema.parse(await request.json())
      const detachedCount = await dependencies.repository.deleteTag(
        user.userId,
        input.tagId,
        input.baseRevision
      )
      return jsonResponse({ detachedCount })
    } catch (error) {
      if (error instanceof RevisionConflictError) {
        return errorResponse(409, 'REVISION_CONFLICT')
      }
      if (error instanceof z.ZodError)
        return errorResponse(400, 'INVALID_REQUEST')
      return errorResponse(503, 'CLOUD_WRITE_FAILED')
    }
  }
}

export function createCloudRestoreHandler(dependencies: {
  auth: AuthVerifier
  repository: CloudDataRepository
}) {
  return async function handle(request: Request): Promise<Response> {
    const user = await authenticate(request, dependencies.auth)
    if (!user) return errorResponse(401, 'UNAUTHORIZED')
    if (request.method !== 'POST')
      return errorResponse(405, 'METHOD_NOT_ALLOWED')
    if (!hasAuthorizedOrigin(request, parseAuthEnv())) {
      return errorResponse(403, 'ORIGIN_NOT_ALLOWED')
    }

    try {
      const input = restoreSchema.parse(await request.json())
      const backup = validateBackup(input.backup)
      await dependencies.repository.replaceFromBackup(
        user.userId,
        backup,
        input.mode === 'migrate'
      )
      return jsonResponse({ summary: backup.summary })
    } catch (error) {
      if (error instanceof CloudNotEmptyError) {
        return errorResponse(409, 'CLOUD_NOT_EMPTY')
      }
      if (error instanceof AppError) return errorResponse(400, error.code)
      if (error instanceof z.ZodError)
        return errorResponse(400, 'INVALID_REQUEST')
      return errorResponse(503, 'CLOUD_RESTORE_FAILED')
    }
  }
}
