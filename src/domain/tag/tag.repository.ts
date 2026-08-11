import type { Tag } from './tag.types'

export interface TagRepository {
  getById(id: string): Promise<Tag | undefined>
  listAll(): Promise<Tag[]>
  save(tag: Tag): Promise<void>
  countUsage(id: string): Promise<number>
  deleteAndDetach(id: string): Promise<number>
}
