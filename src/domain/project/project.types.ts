import type { UTCDateTime, UUID } from '../task/task.types'

export interface Project {
  id: UUID
  name: string
  color: string | null
  sortOrder: number
  archivedAt: UTCDateTime | null
  createdAt: UTCDateTime
  updatedAt: UTCDateTime
}

export interface CreateProjectInput {
  name: string
  color?: string | null
}
