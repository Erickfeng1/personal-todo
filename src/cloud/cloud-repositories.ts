import type { LocalDate } from '../domain/date/local-date'
import type { ProjectRepository } from '../domain/project/project.repository'
import type { Project } from '../domain/project/project.types'
import type { SettingsRepository } from '../domain/settings/settings.repository'
import type { AppSettings } from '../domain/settings/settings.types'
import type { TagRepository } from '../domain/tag/tag.repository'
import type { Tag } from '../domain/tag/tag.types'
import type { TaskRepository } from '../domain/task/task.repository'
import { getTodayGroup, getUpcomingDate } from '../domain/task/task.rules'
import type { Task } from '../domain/task/task.types'
import type { CloudStore } from './cloud-store'

const newestFirst = (a: Task, b: Task) => b.sortOrder - a.sortOrder
const active = (task: Task) => task.status === 'todo' && task.deletedAt === null

export class CloudTaskRepository implements TaskRepository {
  constructor(private readonly store: CloudStore) {}
  getById(id: string) {
    return Promise.resolve(
      this.store.getSnapshot().data.tasks.find((task) => task.id === id)
    )
  }
  save(task: Task) {
    return this.store.saveTask(task)
  }
  queryInbox() {
    return Promise.resolve(
      this.tasks()
        .filter(active)
        .filter((task) => task.inbox)
        .sort(newestFirst)
    )
  }
  queryToday(today: LocalDate) {
    return Promise.resolve(
      this.tasks()
        .filter((task) => getTodayGroup(task, today) !== null)
        .sort(newestFirst)
    )
  }
  queryUpcoming(today: LocalDate, days: number) {
    return Promise.resolve(
      this.tasks()
        .filter((task) => getUpcomingDate(task, today, days) !== null)
        .sort(newestFirst)
    )
  }
  queryByProject(projectId: string) {
    return Promise.resolve(
      this.tasks()
        .filter(active)
        .filter((task) => task.projectId === projectId)
        .sort(newestFirst)
    )
  }
  queryByTag(tagId: string) {
    return Promise.resolve(
      this.tasks()
        .filter(active)
        .filter((task) => task.tagIds.includes(tagId))
        .sort(newestFirst)
    )
  }
  queryAll(includeCompleted = false) {
    return Promise.resolve(
      this.tasks()
        .filter(
          (task) =>
            task.deletedAt === null &&
            (includeCompleted || task.status === 'todo')
        )
        .sort(newestFirst)
    )
  }
  queryCompleted() {
    return Promise.resolve(
      this.tasks()
        .filter(
          (task) => task.status === 'completed' && task.deletedAt === null
        )
        .sort((a, b) =>
          (b.completedAt ?? '').localeCompare(a.completedAt ?? '')
        )
    )
  }
  private tasks() {
    return [...this.store.getSnapshot().data.tasks]
  }
}

export class CloudProjectRepository implements ProjectRepository {
  constructor(private readonly store: CloudStore) {}
  getById(id: string) {
    return Promise.resolve(
      this.store
        .getSnapshot()
        .data.projects.find((project) => project.id === id)
    )
  }
  listAll() {
    return Promise.resolve(
      [...this.store.getSnapshot().data.projects].sort(
        (a, b) =>
          a.sortOrder - b.sortOrder || a.name.localeCompare(b.name, 'zh-CN')
      )
    )
  }
  async listActive() {
    return (await this.listAll()).filter(
      (project) => project.archivedAt === null
    )
  }
  save(project: Project) {
    return this.store.saveProject(project)
  }
}

export class CloudTagRepository implements TagRepository {
  constructor(private readonly store: CloudStore) {}
  getById(id: string) {
    return Promise.resolve(
      this.store.getSnapshot().data.tags.find((tag) => tag.id === id)
    )
  }
  listAll() {
    return Promise.resolve(
      [...this.store.getSnapshot().data.tags].sort((a, b) =>
        a.name.localeCompare(b.name, 'zh-CN')
      )
    )
  }
  save(tag: Tag) {
    return this.store.saveTag(tag)
  }
  countUsage(id: string) {
    return Promise.resolve(
      this.store
        .getSnapshot()
        .data.tasks.filter((task) => task.tagIds.includes(id)).length
    )
  }
  deleteAndDetach(id: string) {
    return this.store.deleteTag(id)
  }
}

export class CloudSettingsRepository implements SettingsRepository {
  constructor(private readonly store: CloudStore) {}
  get(): Promise<AppSettings | undefined> {
    return Promise.resolve(this.store.getSnapshot().data.settings ?? undefined)
  }
  save(settings: AppSettings) {
    return this.store.saveSettings(settings)
  }
}
