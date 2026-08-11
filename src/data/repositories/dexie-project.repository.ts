import type { TodoDatabase } from '../db'
import type { ProjectRepository } from '../../domain/project/project.repository'
import type { Project } from '../../domain/project/project.types'

function projectOrder(a: Project, b: Project): number {
  return a.sortOrder - b.sortOrder || a.name.localeCompare(b.name, 'zh-CN')
}

export class DexieProjectRepository implements ProjectRepository {
  constructor(private readonly database: TodoDatabase) {}

  getById(id: string): Promise<Project | undefined> {
    return this.database.projects.get(id)
  }

  async listAll(): Promise<Project[]> {
    return (await this.database.projects.toArray()).sort(projectOrder)
  }

  async listActive(): Promise<Project[]> {
    return (await this.database.projects.toArray())
      .filter((project) => project.archivedAt === null)
      .sort(projectOrder)
  }

  async save(project: Project): Promise<void> {
    await this.database.projects.put(project)
  }
}
