import { describe, expect, it } from 'vitest'
import { compareLocalDate, getTodayLocal, isLocalDate } from './local-date'

describe('local date helpers', () => {
  it('formats the device-local calendar date without UTC parsing', () => {
    expect(getTodayLocal(new Date(2026, 7, 11, 23, 30))).toBe('2026-08-11')
  })

  it('validates real calendar dates', () => {
    expect(isLocalDate('2024-02-29')).toBe(true)
    expect(isLocalDate('2025-02-29')).toBe(false)
    expect(isLocalDate('2026-8-11')).toBe(false)
  })

  it('compares ISO local dates lexicographically', () => {
    expect(compareLocalDate('2026-08-10', '2026-08-11')).toBe(-1)
    expect(compareLocalDate('2026-08-11', '2026-08-11')).toBe(0)
    expect(compareLocalDate('2026-08-12', '2026-08-11')).toBe(1)
  })
})
