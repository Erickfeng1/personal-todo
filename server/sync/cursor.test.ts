import { describe, expect, it } from 'vitest'
import {
  decodeSyncCursor,
  encodeSyncCursor,
  InvalidSyncCursorError
} from './cursor'

const secret = 'a-test-secret-with-at-least-thirty-two-characters'

describe('signed sync cursor', () => {
  it('round-trips for the issuing user', async () => {
    const cursor = await encodeSyncCursor(42, 'user_a', secret)
    await expect(decodeSyncCursor(cursor, 'user_a', secret)).resolves.toBe(42)
  })

  it('cannot be reused by another user', async () => {
    const cursor = await encodeSyncCursor(42, 'user_a', secret)
    await expect(
      decodeSyncCursor(cursor, 'user_b', secret)
    ).rejects.toBeInstanceOf(InvalidSyncCursorError)
  })

  it('rejects a modified cursor', async () => {
    const cursor = await encodeSyncCursor(42, 'user_a', secret)
    await expect(
      decodeSyncCursor(`${cursor.slice(0, -1)}x`, 'user_a', secret)
    ).rejects.toBeInstanceOf(InvalidSyncCursorError)
  })
})
