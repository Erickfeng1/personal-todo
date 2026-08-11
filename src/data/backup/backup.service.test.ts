import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createProject } from '../../domain/project/project.rules'
import { SettingsService } from '../../domain/settings/settings.service'
import { createTag } from '../../domain/tag/tag.rules'
import { createTask } from '../../domain/task/task.rules'
import { TodoDatabase } from '../db'
import { DexieSettingsRepository } from '../repositories/dexie-settings.repository'
import { BackupService } from './backup.service'
import { parseBackupText, validateBackup } from './backup.schema'

describe('backup service', () => {
  let database: TodoDatabase
  let service: BackupService

  beforeEach(() => {
    database = new TodoDatabase(`personal-todo-backup-${crypto.randomUUID()}`)
    const settingsService = new SettingsService({
      repository: new DexieSettingsRepository(database),
      getLocale: () => 'zh-CN',
      now: () => '2026-08-11T08:00:00.000Z'
    })
    service = new BackupService({
      database,
      settingsService,
      now: () => '2026-08-11T09:00:00.000Z'
    })
  })

  afterEach(async () => {
    database.close()
    await database.delete()
  })

  async function seedData() {
    const project = createProject(
      { name: '工作' },
      { id: 'project-1', now: '2026-08-11T08:00:00.000Z', sortOrder: 1 }
    )
    const tag = createTag(
      { name: '等待回复' },
      { id: 'tag-1', now: '2026-08-11T08:00:00.000Z' }
    )
    const task = {
      ...createTask(
        { title: '跟进合同' },
        { source: 'project', projectId: project.id },
        { id: 'task-1', now: '2026-08-11T08:00:00.000Z', sortOrder: 1 }
      ),
      tagIds: [tag.id],
      importance: 'important' as const,
      urgency: 'not-urgent' as const
    }
    await database.projects.put(project)
    await database.tags.put({ ...tag, nameNormalized: '等待回复' })
    await database.tasks.put(task)
    return { project, tag, task }
  }

  it('exports and restores every business entity consistently', async () => {
    const original = await seedData()
    const backup = await service.export()

    expect(backup).toMatchObject({
      schemaVersion: 1,
      appVersion: '0.1.0',
      exportedAt: '2026-08-11T09:00:00.000Z',
      summary: { taskCount: 1, projectCount: 1, tagCount: 1 }
    })
    expect(backup.data.tasks[0]).toMatchObject({
      importance: 'important',
      urgency: 'not-urgent'
    })

    await database.tasks.clear()
    await database.projects.clear()
    await database.tags.clear()
    await service.restore(backup)

    await expect(database.tasks.get(original.task.id)).resolves.toEqual(
      original.task
    )
    await expect(database.projects.get(original.project.id)).resolves.toEqual(
      original.project
    )
    await expect(database.tags.get(original.tag.id)).resolves.toMatchObject(
      original.tag
    )
    await expect(database.settings.get('singleton')).resolves.toEqual(
      backup.data.settings
    )
  })

  it('rejects malformed JSON and missing references before changing data', async () => {
    const { task } = await seedData()
    expect(() => parseBackupText('{invalid')).toThrow('有效的 JSON')

    const backup = await service.export()
    const invalid = structuredClone(backup)
    invalid.data.tasks[0] = {
      ...invalid.data.tasks[0]!,
      projectId: 'missing-project'
    }
    expect(() => validateBackup(invalid)).toThrow('不存在的项目')
    await expect(database.tasks.get(task.id)).resolves.toEqual(task)
  })

  it('rolls back all tables when a restore write fails', async () => {
    const original = await seedData()
    const backup = await service.export()
    backup.data.tasks[0] = {
      ...backup.data.tasks[0]!,
      title: '恢复后的标题'
    }
    vi.spyOn(database.settings, 'put').mockRejectedValueOnce(
      new Error('simulated write failure')
    )

    await expect(service.restore(backup)).rejects.toThrow('原有数据保持不变')
    await expect(database.tasks.get(original.task.id)).resolves.toEqual(
      original.task
    )
    await expect(database.projects.get(original.project.id)).resolves.toEqual(
      original.project
    )
  })
})
