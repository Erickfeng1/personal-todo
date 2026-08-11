import type { StoredTag, TodoDatabase } from '../db'
import type { TagRepository } from '../../domain/tag/tag.repository'
import { normalizeTagNameForIndex } from '../../domain/tag/tag.rules'
import type { Tag } from '../../domain/tag/tag.types'

export class DexieTagRepository implements TagRepository {
  constructor(private readonly database: TodoDatabase) {}

  async getById(id: string): Promise<Tag | undefined> {
    const stored = await this.database.tags.get(id)
    if (!stored) return undefined
    return toDomainTag(stored)
  }

  async listAll(): Promise<Tag[]> {
    return (await this.database.tags.toArray())
      .map(toDomainTag)
      .sort((a, b) => a.name.localeCompare(b.name, 'zh-CN'))
  }

  async save(tag: Tag): Promise<void> {
    await this.database.tags.put({
      ...tag,
      nameNormalized: normalizeTagNameForIndex(tag.name)
    })
  }

  countUsage(id: string): Promise<number> {
    return this.database.tasks.where('tagIds').equals(id).count()
  }

  async deleteAndDetach(id: string): Promise<number> {
    return this.database.transaction(
      'rw',
      this.database.tasks,
      this.database.tags,
      async () => {
        const tasks = await this.database.tasks
          .where('tagIds')
          .equals(id)
          .toArray()
        if (tasks.length > 0) {
          const updatedAt = new Date().toISOString()
          await this.database.tasks.bulkPut(
            tasks.map((task) => ({
              ...task,
              tagIds: task.tagIds.filter((tagId) => tagId !== id),
              updatedAt
            }))
          )
        }
        await this.database.tags.delete(id)
        return tasks.length
      }
    )
  }
}

function toDomainTag(stored: StoredTag): Tag {
  return {
    id: stored.id,
    name: stored.name,
    color: stored.color,
    createdAt: stored.createdAt,
    updatedAt: stored.updatedAt
  }
}
