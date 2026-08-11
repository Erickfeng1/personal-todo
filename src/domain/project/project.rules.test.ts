import { describe, expect, it } from 'vitest'
import { archiveProject, createProject, renameProject } from './project.rules'

describe('project rules', () => {
  it('creates, renames, and archives without deleting identity', () => {
    const project = createProject(
      { name: '  个人网站  ' },
      { id: 'project-1', now: '2026-08-11T08:00:00.000Z', sortOrder: 1 }
    )
    const renamed = renameProject(project, '作品集', '2026-08-11T09:00:00.000Z')
    const archived = archiveProject(renamed, '2026-08-11T10:00:00.000Z')

    expect(project.name).toBe('个人网站')
    expect(archived).toMatchObject({
      id: 'project-1',
      name: '作品集',
      archivedAt: '2026-08-11T10:00:00.000Z'
    })
  })
})
