import { useLiveQuery } from 'dexie-react-hooks'
import { taskRepository } from '../app/services'
import { getTodayLocal } from '../domain/date/local-date'
import type { Task } from '../domain/task/task.types'

export type TaskCollection =
  'inbox' | 'today' | 'upcoming' | 'project' | 'tag' | 'all' | 'completed'

export function useTaskCollection(
  collection: TaskCollection,
  entityId?: string,
  includeCompleted = false,
  enabled = true
): Task[] | undefined {
  const today = getTodayLocal()

  return useLiveQuery(async () => {
    if (!enabled) return []
    if (collection === 'inbox') return taskRepository.queryInbox()
    if (collection === 'completed') return taskRepository.queryCompleted()
    if (collection === 'project') {
      return entityId ? taskRepository.queryByProject(entityId) : []
    }
    if (collection === 'tag') {
      return entityId ? taskRepository.queryByTag(entityId) : []
    }
    if (collection === 'all') return taskRepository.queryAll(includeCompleted)
    if (collection === 'upcoming') {
      return taskRepository.queryUpcoming(today, 7)
    }
    return taskRepository.queryToday(today)
  }, [collection, enabled, entityId, includeCompleted, today])
}
