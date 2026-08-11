import { AppError } from '../shared/app-error'
import type {
  ClassificationFilter,
  CreateTaskContext,
  CreateTaskInput,
  EisenhowerQuadrant,
  Task,
  TaskClassificationPatch
} from './task.types'

const MAX_TITLE_LENGTH = 300

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
