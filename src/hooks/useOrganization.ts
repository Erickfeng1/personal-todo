import { useLiveQuery } from 'dexie-react-hooks'
import { projectRepository, tagRepository } from '../app/services'
import type { Project } from '../domain/project/project.types'
import type { Tag } from '../domain/tag/tag.types'

export function useProjects(includeArchived = false): Project[] | undefined {
  return useLiveQuery(
    () =>
      includeArchived
        ? projectRepository.listAll()
        : projectRepository.listActive(),
    [includeArchived]
  )
}

export function useTags(): Tag[] | undefined {
  return useLiveQuery(() => tagRepository.listAll(), [])
}
