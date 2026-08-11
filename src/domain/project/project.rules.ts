import { AppError } from '../shared/app-error'
import type { CreateProjectInput, Project } from './project.types'

const MAX_PROJECT_NAME_LENGTH = 100

export function normalizeProjectName(name: string): string {
  const normalized = name.trim()
  if (normalized.length === 0) {
    throw new AppError('VALIDATION_ERROR', '项目名称不能为空')
  }
  if (normalized.length > MAX_PROJECT_NAME_LENGTH) {
    throw new AppError(
      'VALIDATION_ERROR',
      `项目名称不能超过 ${String(MAX_PROJECT_NAME_LENGTH)} 个字符`
    )
  }
  return normalized
}

export function createProject(
  input: CreateProjectInput,
  options: { id: string; now: string; sortOrder: number }
): Project {
  return {
    id: options.id,
    name: normalizeProjectName(input.name),
    color: input.color ?? null,
    sortOrder: options.sortOrder,
    archivedAt: null,
    createdAt: options.now,
    updatedAt: options.now
  }
}

export function renameProject(
  project: Project,
  name: string,
  now: string
): Project {
  return { ...project, name: normalizeProjectName(name), updatedAt: now }
}

export function archiveProject(project: Project, now: string): Project {
  if (project.archivedAt !== null) return project
  return { ...project, archivedAt: now, updatedAt: now }
}
