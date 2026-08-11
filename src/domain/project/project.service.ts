import { AppError } from '../shared/app-error'
import type { ProjectRepository } from './project.repository'
import { archiveProject, createProject, renameProject } from './project.rules'
import type { CreateProjectInput, Project } from './project.types'

interface ProjectServiceDependencies {
  repository: ProjectRepository
  createId?: () => string
  now?: () => Date
}

export class ProjectService {
  private readonly repository: ProjectRepository
  private readonly createId: () => string
  private readonly now: () => Date

  constructor({ repository, createId, now }: ProjectServiceDependencies) {
    this.repository = repository
    this.createId = createId ?? (() => crypto.randomUUID())
    this.now = now ?? (() => new Date())
  }

  async create(input: CreateProjectInput): Promise<Project> {
    const now = this.now()
    const project = createProject(input, {
      id: this.createId(),
      now: now.toISOString(),
      sortOrder: now.getTime()
    })
    await this.assertUniqueName(project.name)
    await this.persist(project)
    return project
  }

  async rename(id: string, name: string): Promise<Project> {
    const project = await this.requireProject(id)
    const renamed = renameProject(project, name, this.now().toISOString())
    await this.assertUniqueName(renamed.name, id)
    await this.persist(renamed)
    return renamed
  }

  async archive(id: string): Promise<Project> {
    const project = await this.requireProject(id)
    const archived = archiveProject(project, this.now().toISOString())
    await this.persist(archived)
    return archived
  }

  private async assertUniqueName(name: string, exceptId?: string) {
    const normalized = name.trim().toLocaleLowerCase()
    const projects = await this.repository.listAll()
    if (
      projects.some(
        (project) =>
          project.id !== exceptId &&
          project.name.trim().toLocaleLowerCase() === normalized
      )
    ) {
      throw new AppError('VALIDATION_ERROR', '已经存在同名项目')
    }
  }

  private async requireProject(id: string): Promise<Project> {
    const project = await this.repository.getById(id)
    if (!project) throw new AppError('NOT_FOUND', '项目不存在')
    return project
  }

  private async persist(project: Project) {
    try {
      await this.repository.save(project)
    } catch (cause) {
      throw new AppError('STORAGE_WRITE_FAILED', '项目未能保存，请重试', {
        cause
      })
    }
  }
}
