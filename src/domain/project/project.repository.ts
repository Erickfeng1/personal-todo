import type { Project } from './project.types'

export interface ProjectRepository {
  getById(id: string): Promise<Project | undefined>
  listAll(): Promise<Project[]>
  listActive(): Promise<Project[]>
  save(project: Project): Promise<void>
}
