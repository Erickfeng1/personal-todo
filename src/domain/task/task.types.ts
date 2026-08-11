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

export type CreateTaskContext =
  { source: 'inbox' } | { source: 'today'; today: LocalDate }

export interface TaskClassificationPatch {
  importance: TaskImportance | null
  urgency: TaskUrgency | null
}

export type ClassificationFilter =
  'all' | TaskImportance | TaskUrgency | EisenhowerQuadrant | 'unclassified'
