import type { LocalDate } from '../date/local-date'

export type UUID = string
export type UTCDateTime = string
export type TaskStatus = 'todo' | 'completed'
export type TaskImportance = 'important' | 'not-important'
export type TaskUrgency = 'urgent' | 'not-urgent'
export type EisenhowerQuadrant =
  | 'important-urgent'
  | 'important-not-urgent'
  | 'not-important-urgent'
  | 'not-important-not-urgent'

export interface Task {
  id: UUID
  title: string
  notes: string
  status: TaskStatus
  importance: TaskImportance | null
  urgency: TaskUrgency | null
  plannedDate: LocalDate | null
  deadline: LocalDate | null
  inbox: boolean
  projectId: UUID | null
  tagIds: UUID[]
  sortOrder: number
  createdAt: UTCDateTime
  updatedAt: UTCDateTime
  completedAt: UTCDateTime | null
  deletedAt: UTCDateTime | null
}

export interface CreateTaskInput {
  title: string
}

export interface UpdateTaskDetailsInput {
  title: string
  notes: string
  importance: TaskImportance | null
  urgency: TaskUrgency | null
  plannedDate: LocalDate | null
  deadline: LocalDate | null
  inbox: boolean
  projectId: UUID | null
  tagIds: UUID[]
}

export type CreateTaskContext =
  | { source: 'inbox' }
  | { source: 'today'; today: LocalDate }
  | { source: 'project'; projectId: UUID }
  | { source: 'tag'; tagId: UUID }

export interface TaskClassificationPatch {
  importance: TaskImportance | null
  urgency: TaskUrgency | null
}

export type ClassificationFilter =
  'all' | TaskImportance | TaskUrgency | EisenhowerQuadrant | 'unclassified'

export type TodayGroup =
  'overdue-deadline' | 'due-today' | 'carry-over' | 'planned-today'

export type TaskSort = 'created' | 'planned' | 'deadline' | 'quadrant'

export interface TaskFilterOptions {
  status: TaskStatus | 'all'
  importance: TaskImportance | 'all'
  urgency: TaskUrgency | 'all'
  quadrant: EisenhowerQuadrant | 'unclassified' | 'all'
  projectId: string
  tagId: string
  sort: TaskSort
  includeCompleted: boolean
}

export interface TaskFilterQuery extends TaskFilterOptions {
  search: string
}
