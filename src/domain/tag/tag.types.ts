import type { UTCDateTime, UUID } from '../task/task.types.js'

export interface Tag {
  id: UUID
  name: string
  color: string | null
  createdAt: UTCDateTime
  updatedAt: UTCDateTime
}

export interface CreateTagInput {
  name: string
  color?: string | null
}
