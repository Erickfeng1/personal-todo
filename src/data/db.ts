import Dexie, { type EntityTable } from 'dexie'
import type { Task } from '../domain/task/task.types'
import type { Project } from '../domain/project/project.types'
import type { Tag } from '../domain/tag/tag.types'
import type { AppSettings } from '../domain/settings/settings.types'

export const DATABASE_SCHEMA_VERSION = 3

export interface StoredTag extends Tag {
  nameNormalized: string
}

export interface DatabaseMeta {
  key: 'schemaVersion' | 'createdAt' | 'lastSuccessfulMigrationAt'
  value: string | number
}

class TodoDatabase extends Dexie {
  tasks!: EntityTable<Task, 'id'>
  projects!: EntityTable<Project, 'id'>
  tags!: EntityTable<StoredTag, 'id'>
  settings!: EntityTable<AppSettings, 'id'>
  meta!: EntityTable<DatabaseMeta, 'key'>

  constructor(name = 'personal-todo') {
    super(name)
    this.version(1).stores({
      tasks:
        'id,status,inbox,importance,urgency,plannedDate,deadline,projectId,*tagIds,completedAt,deletedAt,createdAt,updatedAt'
    })
    this.version(2).stores({
      tasks:
        'id,status,inbox,importance,urgency,plannedDate,deadline,projectId,*tagIds,completedAt,deletedAt,createdAt,updatedAt',
      projects: 'id,name,archivedAt,sortOrder,updatedAt',
      tags: 'id,&nameNormalized,updatedAt'
    })
    this.version(DATABASE_SCHEMA_VERSION)
      .stores({
        tasks:
          'id,status,inbox,importance,urgency,plannedDate,deadline,projectId,*tagIds,completedAt,deletedAt,createdAt,updatedAt',
        projects: 'id,name,archivedAt,sortOrder,updatedAt',
        tags: 'id,&nameNormalized,updatedAt',
        settings: 'id',
        meta: 'key'
      })
      .upgrade(async (transaction) => {
        const now = new Date().toISOString()
        await transaction.table<DatabaseMeta, string>('meta').bulkPut([
          { key: 'schemaVersion', value: DATABASE_SCHEMA_VERSION },
          { key: 'createdAt', value: now },
          { key: 'lastSuccessfulMigrationAt', value: now }
        ])
      })
    this.on('populate', (transaction) => {
      const now = new Date().toISOString()
      return transaction.table<DatabaseMeta, string>('meta').bulkPut([
        { key: 'schemaVersion', value: DATABASE_SCHEMA_VERSION },
        { key: 'createdAt', value: now },
        { key: 'lastSuccessfulMigrationAt', value: now }
      ])
    })
  }
}

export const db = new TodoDatabase()
export { TodoDatabase }
