import { AppError } from '../shared/app-error'
import type { TagRepository } from './tag.repository'
import { createTag, normalizeTagNameForIndex, renameTag } from './tag.rules'
import type { CreateTagInput, Tag } from './tag.types'

interface TagServiceDependencies {
  repository: TagRepository
  createId?: () => string
  now?: () => Date
}

export class TagService {
  private readonly repository: TagRepository
  private readonly createId: () => string
  private readonly now: () => Date

  constructor({ repository, createId, now }: TagServiceDependencies) {
    this.repository = repository
    this.createId = createId ?? (() => crypto.randomUUID())
    this.now = now ?? (() => new Date())
  }

  async create(input: CreateTagInput): Promise<Tag> {
    const tag = createTag(input, {
      id: this.createId(),
      now: this.now().toISOString()
    })
    await this.assertUniqueName(tag.name)
    await this.persist(tag)
    return tag
  }

  async rename(id: string, name: string): Promise<Tag> {
    const tag = await this.requireTag(id)
    const renamed = renameTag(tag, name, this.now().toISOString())
    await this.assertUniqueName(renamed.name, id)
    await this.persist(renamed)
    return renamed
  }

  countUsage(id: string): Promise<number> {
    return this.repository.countUsage(id)
  }

  async delete(id: string): Promise<number> {
    await this.requireTag(id)
    try {
      return await this.repository.deleteAndDetach(id)
    } catch (cause) {
      if (cause instanceof AppError) throw cause
      throw new AppError(
        'STORAGE_WRITE_FAILED',
        '标签未能删除，任务没有被修改，请重试',
        { cause }
      )
    }
  }

  private async assertUniqueName(name: string, exceptId?: string) {
    const normalized = normalizeTagNameForIndex(name)
    const tags = await this.repository.listAll()
    if (
      tags.some(
        (tag) =>
          tag.id !== exceptId &&
          normalizeTagNameForIndex(tag.name) === normalized
      )
    ) {
      throw new AppError('VALIDATION_ERROR', '已经存在同名标签')
    }
  }

  private async requireTag(id: string): Promise<Tag> {
    const tag = await this.repository.getById(id)
    if (!tag) throw new AppError('NOT_FOUND', '标签不存在')
    return tag
  }

  private async persist(tag: Tag) {
    try {
      await this.repository.save(tag)
    } catch (cause) {
      if (cause instanceof AppError) throw cause
      throw new AppError('STORAGE_WRITE_FAILED', '标签未能保存，请重试', {
        cause
      })
    }
  }
}
