import { describe, expect, it } from 'vitest'
import { createTag, normalizeTagNameForIndex, renameTag } from './tag.rules'

describe('tag rules', () => {
  it('normalizes case-insensitive names while preserving display text', () => {
    const tag = createTag(
      { name: '  Waiting  ' },
      { id: 'tag-1', now: '2026-08-11T08:00:00.000Z' }
    )
    const renamed = renameTag(tag, '等待回复', '2026-08-11T09:00:00.000Z')

    expect(tag.name).toBe('Waiting')
    expect(normalizeTagNameForIndex(tag.name)).toBe('waiting')
    expect(renamed.name).toBe('等待回复')
  })
})
