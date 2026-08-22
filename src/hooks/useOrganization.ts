import { projectRepository, tagRepository } from '../app/services'
import type { Project } from '../domain/project/project.types'
import type { Tag } from '../domain/tag/tag.types'
import { useCloudQuery } from './useCloudQuery'

export function useProjects(includeArchived = false): Project[] | undefined {
  return useCloudQuery(
    () =>
      includeArchived
        ? projectRepository.listAll()
        : projectRepository.listActive(),
    [includeArchived]
  )
}

export function useTags(): Tag[] | undefined {
  return useCloudQuery(() => tagRepository.listAll(), [])
}
