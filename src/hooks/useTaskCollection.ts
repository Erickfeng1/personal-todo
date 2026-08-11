import { useLiveQuery } from 'dexie-react-hooks'
import { taskRepository } from '../app/services'
import { getTodayLocal } from '../domain/date/local-date'
import type { Task } from '../domain/task/task.types'

export type TaskCollection = 'inbox' | 'today' | 'upcoming' | 'completed'

export function useTaskCollection(
  collection: TaskCollection
): Task[] | undefined {
  const today = getTodayLocal()

  return useLiveQuery(async () => {
    if (collection === 'inbox') return taskRepository.queryInbox()
    if (collection === 'completed') return taskRepository.queryCompleted()
    if (collection === 'upcoming') {
      return taskRepository.queryUpcoming(today, 7)
    }
    return taskRepository.queryToday(today)
  }, [collection, today])
}
