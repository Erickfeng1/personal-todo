import Dexie from 'dexie'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { TodoDatabase } from '../db'
import { DexieProjectRepository } from './dexie-project.repository'
import { DexieTagRepository } from './dexie-tag.repository'
import {
  createProject,
  archiveProject
} from '../../domain/project/project.rules'
import { createTag } from '../../domain/tag/tag.rules'
import { createTask } from '../../domain/task/task.rules'

describe('organization repositories', () => {
  let database: TodoDatabase
  let databaseName: string

  beforeEach(() => {
    databaseName = `personal-todo-organization-${crypto.randomUUID()}`
    database = new TodoDatabase(databaseName)
  })

  afterEach(async () => {
    database.close()
    await database.delete()
  })

  it('keeps archived projects and their task references', async () => {
    const projects = new DexieProjectRepository(database)
    const project = createProject(
      { name: '旧项目' },
      { id: 'project-1', now: '2026-08-11T08:00:00.000Z', sortOrder: 1 }
    )
    const task = {
      ...createTask(
        { title: '原项目任务' },
        { source: 'project', projectId: project.id },
        { id: 'task-1', now: '2026-08-11T08:00:00.000Z', sortOrder: 1 }
      )
    }
    await projects.save(project)
    await database.tasks.put(task)
    await projects.save(archiveProject(project, '2026-08-11T09:00:00.000Z'))

    await expect(projects.listActive()).resolves.toEqual([])
    await expect(database.tasks.get(task.id)).resolves.toMatchObject({
      projectId: project.id
    })
  })

  it('initializes versioned metadata for a fresh database', async () => {
    await database.open()
    await expect(database.meta.get('schemaVersion')).resolves.toEqual({
      key: 'schemaVersion',
      value: 3
    })
    await expect(database.meta.get('createdAt')).resolves.toMatchObject({
      key: 'createdAt'
    })
  })

  it('deletes a tag transactionally without deleting associated tasks', async () => {
    const tags = new DexieTagRepository(database)
    const tag = createTag(
      { name: '等待回复' },
      { id: 'tag-1', now: '2026-08-11T08:00:00.000Z' }
    )
    const task = createTask(
      { title: '等待客户' },
      { source: 'tag', tagId: tag.id },
      { id: 'task-1', now: '2026-08-11T08:00:00.000Z', sortOrder: 1 }
    )
    await tags.save(tag)
    await database.tasks.put(task)

    await expect(tags.countUsage(tag.id)).resolves.toBe(1)
    await expect(tags.deleteAndDetach(tag.id)).resolves.toBe(1)
    await expect(tags.getById(tag.id)).resolves.toBeUndefined()
    await expect(database.tasks.get(task.id)).resolves.toMatchObject({
      tagIds: []
    })
  })

  it('migrates a version-1 task database without losing tasks', async () => {
    database.close()
    await database.delete()

    const legacy = new Dexie(databaseName)
    legacy.version(1).stores({
      tasks:
        'id,status,inbox,importance,urgency,plannedDate,deadline,projectId,*tagIds,completedAt,deletedAt,createdAt,updatedAt'
    })
    await legacy.open()
    const task = createTask(
      { title: '迁移保留' },
      { source: 'inbox' },
      { id: 'task-legacy', now: '2026-08-11T08:00:00.000Z', sortOrder: 1 }
    )
    await legacy.table('tasks').put(task)
    legacy.close()

    database = new TodoDatabase(databaseName)
    await database.open()
    await expect(database.tasks.get(task.id)).resolves.toEqual(task)
    await expect(database.projects.count()).resolves.toBe(0)
    await expect(database.tags.count()).resolves.toBe(0)
    await expect(database.settings.count()).resolves.toBe(0)
    await expect(database.meta.get('schemaVersion')).resolves.toEqual({
      key: 'schemaVersion',
      value: 3
    })
  })
})
