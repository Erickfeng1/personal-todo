import { randomBytes } from 'node:crypto'
import { hashPassword } from '../server/auth/password-hash'

const password = randomBytes(18).toString('base64url')
const sessionSecret = randomBytes(32).toString('base64url')
const passwordHash = await hashPassword(password)

console.info(`ACCESS_PASSWORD=${password}`)
console.info(`SINGLE_USER_PASSWORD_HASH=${passwordHash}`)
console.info(`SINGLE_USER_SESSION_SECRET=${sessionSecret}`)
console.info('请把访问密码保存到密码管理器；Vercel 只配置后两个服务端变量。')
