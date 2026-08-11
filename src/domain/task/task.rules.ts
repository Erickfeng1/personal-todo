import { AppError } from '../shared/app-error'
import { addLocalDays, isLocalDate } from '../date/local-date'
import type { LocalDate } from '../date/local-date'
import type {
  ClassificationFilter,
  CreateTaskContext,
  CreateTaskInput,
  EisenhowerQuadrant,
  Task,
  TaskClassificationPatch,
  TodayGroup,
  UpdateTaskDetailsInput
} from './task.types'

const MAX_TITLE_LENGTH = 300
const MAX_NOTES_LENGTH = 20_000

export function normalizeTaskTitle(title: string): string {
  const normalized = title.trim()

  if (normalized.length === 0) {
    throw new AppError('VALIDATION_ERROR', '任务标题不能为空')
  }

  if (normalized.length > MAX_TITLE_LENGTH) {
    throw new AppError(
      'VALIDATION_ERROR',
      `任务标题不能超过 ${String(MAX_TITLE_LENGTH)} 个字符`
    )
  }

  return normalized
}

export function createTask(
  input: CreateTaskInput,
  context: CreateTaskContext,
  options: { id: string; now: string; sortOrder: number }
): Task {
  return {
    id: options.id,
    title: normalizeTaskTitle(input.title),
    notes: '',
    status: 'todo',
    importance: null,
    urgency: null,
    plannedDate: context.source === 'today' ? context.today : null,
    deadline: null,
    inbox: context.source === 'inbox',
    projectId: null,
    tagIds: [],
    sortOrder: options.sortOrder,
    createdAt: options.now,
    updatedAt: options.now,
    completedAt: null,
    deletedAt: null
  }
}

export function completeTask(task: Task, now: string): Task {
  if (task.deletedAt !== null) {
    throw new AppError('NOT_FOUND', '找不到可完成的任务')
  }

  if (task.status === 'completed') return task

  return { ...task, status: 'completed', completedAt: now, updatedAt: now }
}

export function reopenTask(task: Task, now: string): Task {
  if (task.deletedAt !== null) {
    throw new AppError('NOT_FOUND', '找不到可恢复的任务')
  }

  if (task.status === 'todo') return task

  return { ...task, status: 'todo', completedAt: null, updatedAt: now }
}

export function updateTaskClassification(
  task: Task,
  patch: TaskClassificationPatch,
  now: string
): Task {
  return {
    ...task,
    importance: patch.importance,
    urgency: patch.urgency,
    updatedAt: now
  }
}

function normalizeTaskNotes(notes: string): string {
  if (notes.length > MAX_NOTES_LENGTH) {
    throw new AppError(
      'VALIDATION_ERROR',
      `任务备注不能超过 ${String(MAX_NOTES_LENGTH)} 个字符`
    )
  }
  return notes
}

function validateOptionalLocalDate(
  value: LocalDate | null,
  label: string
): LocalDate | null {
  if (value !== null && !isLocalDate(value)) {
    throw new AppError('VALIDATION_ERROR', `${label}不是有效日期`)
  }
  return value
}

export function updateTaskDetails(
  task: Task,
  input: UpdateTaskDetailsInput,
  now: string
): Task {
  if (task.deletedAt !== null) {
    throw new AppError('NOT_FOUND', '找不到可编辑的任务')
  }

  const plannedDate = validateOptionalLocalDate(input.plannedDate, '计划日期')
  const deadline = validateOptionalLocalDate(input.deadline, '截止日期')

  return {
    ...task,
    title: normalizeTaskTitle(input.title),
    notes: normalizeTaskNotes(input.notes),
    importance: input.importance,
    urgency: input.urgency,
    plannedDate,
    deadline,
    inbox: plannedDate === null ? task.inbox : false,
    updatedAt: now
  }
}

export const TODAY_GROUP_ORDER: TodayGroup[] = [
  'overdue-deadline',
  'due-today',
  'carry-over',
  'planned-today'
]

export function getTodayGroup(task: Task, today: LocalDate): TodayGroup | null {
  if (task.status !== 'todo' || task.deletedAt !== null) return null
  if (task.deadline !== null && task.deadline < today) {
    return 'overdue-deadline'
  }
  if (task.deadline === today) return 'due-today'
  if (task.plannedDate !== null && task.plannedDate < today) {
    return 'carry-over'
  }
  if (task.plannedDate === today) return 'planned-today'
  return null
}

export function getUpcomingDate(
  task: Task,
  today: LocalDate,
  days = 7
): LocalDate | null {
  if (task.status !== 'todo' || task.deletedAt !== null) return null

  const tomorrow = addLocalDays(today, 1)
  const endDate = addLocalDays(today, days)
  const relevantDates = [task.plannedDate, task.deadline]
    .filter((date): date is LocalDate => date !== null)
    .filter((date) => date >= tomorrow && date <= endDate)
    .sort()

  return relevantDates[0] ?? null
}

export function getEisenhowerQuadrant(
  task: Pick<Task, 'importance' | 'urgency'>
): EisenhowerQuadrant | null {
  if (task.importance === null || task.urgency === null) return null
  return `${task.importance}-${task.urgency}` as EisenhowerQuadrant
}

export function matchesClassificationFilter(
  task: Pick<Task, 'importance' | 'urgency'>,
  filter: ClassificationFilter
): boolean {
  if (filter === 'all') return true
  if (filter === 'unclassified') {
    return task.importance === null || task.urgency === null
  }
  if (filter === 'important' || filter === 'not-important') {
    return task.importance === filter
  }
  if (filter === 'urgent' || filter === 'not-urgent') {
    return task.urgency === filter
  }
  return getEisenhowerQuadrant(task) === filter
}
