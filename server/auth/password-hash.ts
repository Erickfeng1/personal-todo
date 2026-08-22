import { randomBytes, scrypt as nodeScrypt, timingSafeEqual } from 'node:crypto'
import { promisify } from 'node:util'

const scrypt = promisify(nodeScrypt)
const KEY_LENGTH = 32

export async function hashPassword(password: string): Promise<string> {
  if (password.length < 12) {
    throw new Error('访问密码至少需要 12 个字符')
  }
  const salt = randomBytes(16)
  const derived = (await scrypt(password, salt, KEY_LENGTH)) as Buffer
  return `scrypt$${salt.toString('base64url')}$${derived.toString('base64url')}`
}

export async function verifyPassword(
  password: string,
  encodedHash: string
): Promise<boolean> {
  const [algorithm, saltValue, hashValue, extra] = encodedHash.split('$')
  if (algorithm !== 'scrypt' || !saltValue || !hashValue || extra) return false

  try {
    const salt = Buffer.from(saltValue, 'base64url')
    const expected = Buffer.from(hashValue, 'base64url')
    if (salt.length < 16 || expected.length !== KEY_LENGTH) return false
    const actual = (await scrypt(password, salt, expected.length)) as Buffer
    return timingSafeEqual(actual, expected)
  } catch {
    return false
  }
}
