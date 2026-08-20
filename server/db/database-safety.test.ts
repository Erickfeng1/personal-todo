import { describe, expect, it } from 'vitest'
import { assertNonProductionDatabase } from './database-safety'

describe('database safety guard', () => {
  it.each(['development', 'test', 'preview'])('allows %s', (target) => {
    expect(() =>
      assertNonProductionDatabase({ DATABASE_ENVIRONMENT: target })
    ).not.toThrow()
  })

  it('refuses an unlabeled or production target', () => {
    expect(() => assertNonProductionDatabase({})).toThrow(
      'Refusing database mutation'
    )
    expect(() =>
      assertNonProductionDatabase({ DATABASE_ENVIRONMENT: 'production' })
    ).toThrow('Refusing database mutation')
  })
})
