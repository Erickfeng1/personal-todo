import { z } from 'zod'
import { isLocalDate, type LocalDate } from '../../domain/date/local-date.js'
import { AppError } from '../../domain/shared/app-error.js'
import type { Project } from '../../domain/project/project.types.js'
import {
  isThemePreference,
  isWeekStartsOn
} from '../../domain/settings/settings.rules.js'
import type {
  AppSettings,
  ThemePreference,
  WeekStartsOn
} from '../../domain/settings/settings.types.js'
import type { Tag } from '../../domain/tag/tag.types.js'
import type { Task } from '../../domain/task/task.types.js'
import { BACKUP_SCHEMA_VERSION, type BackupEnvelopeV1 } from './backup.types.js'

const idSchema = z.uuid()
const utcDateSchema = z.string().datetime({ offset: true })
const nullableUtcDateSchema = utcDateSchema.nullable()
const localDateSchema = z.custom<LocalDate>(
  (value) => typeof value === 'string' && isLocalDate(value)
)

export const taskSchema: z.ZodType<Task> = z
  .object({
    id: idSchema,
    title: z.string().trim().min(1).max(200),
    notes: z.string().max(20_000),
    status: z.enum(['todo', 'completed']),
    importance: z.enum(['important', 'not-important']).nullable(),
    urgency: z.enum(['urgent', 'not-urgent']).nullable(),
    plannedDate: localDateSchema.nullable(),
    deadline: localDateSchema.nullable(),
    inbox: z.boolean(),
    projectId: idSchema.nullable(),
    tagIds: z.array(idSchema).max(500),
    sortOrder: z.number().finite(),
    createdAt: utcDateSchema,
    updatedAt: utcDateSchema,
    completedAt: nullableUtcDateSchema,
    deletedAt: nullableUtcDateSchema
  })
  .strict()
  .superRefine((task, context) => {
    if (task.status === 'completed' && task.completedAt === null) {
      context.addIssue({
        code: 'custom',
        path: ['completedAt'],
        message: '已完成任务必须包含完成时间'
      })
    }
    if (task.status === 'todo' && task.completedAt !== null) {
      context.addIssue({
        code: 'custom',
        path: ['completedAt'],
        message: '未完成任务不能包含完成时间'
      })
    }
  })

export const projectSchema: z.ZodType<Project> = z
  .object({
    id: idSchema,
    name: z.string().trim().min(1).max(50),
    color: z.string().max(100).nullable(),
    sortOrder: z.number().finite(),
    archivedAt: nullableUtcDateSchema,
    createdAt: utcDateSchema,
    updatedAt: utcDateSchema
  })
  .strict()

export const tagSchema: z.ZodType<Tag> = z
  .object({
    id: idSchema,
    name: z.string().trim().min(1).max(50),
    color: z.string().max(100).nullable(),
    createdAt: utcDateSchema,
    updatedAt: utcDateSchema
  })
  .strict()

export const settingsSchema: z.ZodType<AppSettings> = z
  .object({
    id: z.literal('singleton'),
    theme: z.custom<ThemePreference>(isThemePreference),
    weekStartsOn: z.custom<WeekStartsOn>(isWeekStartsOn),
    locale: z.string().trim().min(1).max(100),
    updatedAt: utcDateSchema
  })
  .strict()

const backupSchema: z.ZodType<BackupEnvelopeV1> = z
  .object({
    schemaVersion: z.literal(BACKUP_SCHEMA_VERSION),
    appVersion: z.string().trim().min(1).max(100),
    exportedAt: utcDateSchema,
    data: z
      .object({
        tasks: z.array(taskSchema),
        projects: z.array(projectSchema),
        tags: z.array(tagSchema),
        settings: settingsSchema
      })
      .strict(),
    summary: z
      .object({
        taskCount: z.number().int().nonnegative(),
        projectCount: z.number().int().nonnegative(),
        tagCount: z.number().int().nonnegative()
      })
      .strict()
  })
  .strict()

function assertUniqueIds(ids: string[], label: string): void {
  if (new Set(ids).size !== ids.length) {
    throw new AppError('BACKUP_INVALID', `${label}存在重复 ID`)
  }
}

export function validateBackup(input: unknown): BackupEnvelopeV1 {
  if (
    typeof input === 'object' &&
    input !== null &&
    'schemaVersion' in input &&
    input.schemaVersion !== BACKUP_SCHEMA_VERSION
  ) {
    throw new AppError('BACKUP_UNSUPPORTED_VERSION', '备份版本不受支持')
  }

  const result = backupSchema.safeParse(input)
  if (!result.success) {
    throw new AppError('BACKUP_INVALID', '备份文件结构或字段无效', {
      cause: result.error
    })
  }

  const backup = result.data
  const { tasks, projects, tags } = backup.data
  assertUniqueIds(
    tasks.map(({ id }) => id),
    '任务'
  )
  assertUniqueIds(
    projects.map(({ id }) => id),
    '项目'
  )
  assertUniqueIds(
    tags.map(({ id }) => id),
    '标签'
  )

  const projectIds = new Set(projects.map(({ id }) => id))
  const tagIds = new Set(tags.map(({ id }) => id))
  const normalizedTagNames = tags.map(({ name }) =>
    name.trim().toLocaleLowerCase()
  )
  if (new Set(normalizedTagNames).size !== normalizedTagNames.length) {
    throw new AppError('BACKUP_INVALID', '标签名称存在重复')
  }

  for (const task of tasks) {
    if (task.projectId !== null && !projectIds.has(task.projectId)) {
      throw new AppError('BACKUP_INVALID', '任务引用了不存在的项目')
    }
    if (new Set(task.tagIds).size !== task.tagIds.length) {
      throw new AppError('BACKUP_INVALID', '任务包含重复标签引用')
    }
    if (task.tagIds.some((tagId) => !tagIds.has(tagId))) {
      throw new AppError('BACKUP_INVALID', '任务引用了不存在的标签')
    }
  }

  const expectedSummary = {
    taskCount: tasks.length,
    projectCount: projects.length,
    tagCount: tags.length
  }
  if (
    backup.summary.taskCount !== expectedSummary.taskCount ||
    backup.summary.projectCount !== expectedSummary.projectCount ||
    backup.summary.tagCount !== expectedSummary.tagCount
  ) {
    throw new AppError('BACKUP_INVALID', '备份摘要与实际数据不一致')
  }

  return backup
}

export function parseBackupText(text: string): BackupEnvelopeV1 {
  let parsed: unknown
  try {
    parsed = JSON.parse(text) as unknown
  } catch (cause) {
    throw new AppError('BACKUP_INVALID', '备份不是有效的 JSON 文件', {
      cause
    })
  }
  return validateBackup(parsed)
}
