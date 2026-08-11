import type { TaskFilterOptions } from '../../domain/task/task.types'

export type TaskFilterState = TaskFilterOptions

export const DEFAULT_TASK_FILTERS: TaskFilterState = {
  status: 'all',
  importance: 'all',
  urgency: 'all',
  quadrant: 'all',
  projectId: 'all',
  tagId: 'all',
  sort: 'created',
  includeCompleted: false
}
