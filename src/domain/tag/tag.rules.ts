import { AppError } from '../shared/app-error'
import type { CreateTagInput, Tag } from './tag.types'

const MAX_TAG_NAME_LENGTH = 50

export function normalizeTagName(name: string): string {
  const normalized = name.trim()
  if (normalized.length === 0) {
    throw new AppError('VALIDATION_ERROR', '标签名称不能为空')
  }
  if (normalized.length > MAX_TAG_NAME_LENGTH) {
    throw new AppError(
      'VALIDATION_ERROR',
      `标签名称不能超过 ${String(MAX_TAG_NAME_LENGTH)} 个字符`
    )
  }
  return normalized
}

export function normalizeTagNameForIndex(name: string): string {
  return normalizeTagName(name).toLocaleLowerCase()
}

export function createTag(
  input: CreateTagInput,
  options: { id: string; now: string }
): Tag {
  return {
    id: options.id,
    name: normalizeTagName(input.name),
    color: input.color ?? null,
    createdAt: options.now,
    updatedAt: options.now
  }
}

export function renameTag(tag: Tag, name: string, now: string): Tag {
  return { ...tag, name: normalizeTagName(name), updatedAt: now }
}
