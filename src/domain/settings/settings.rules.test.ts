import { describe, expect, it } from 'vitest'
import { createDefaultSettings, updateSettings } from './settings.rules'

describe('settings rules', () => {
  it('creates local-first defaults', () => {
    expect(createDefaultSettings('zh-CN', '2026-08-11T08:00:00.000Z')).toEqual({
      id: 'singleton',
      theme: 'system',
      weekStartsOn: 1,
      locale: 'zh-CN',
      updatedAt: '2026-08-11T08:00:00.000Z'
    })
  })

  it('updates only requested preferences', () => {
    const settings = createDefaultSettings('zh-CN', '2026-08-11T08:00:00.000Z')
    expect(
      updateSettings(settings, { theme: 'dark' }, '2026-08-11T09:00:00.000Z')
    ).toMatchObject({ theme: 'dark', weekStartsOn: 1 })
  })
})
