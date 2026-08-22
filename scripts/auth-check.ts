import { verifyPassword } from '../server/auth/password-hash'
import { parseAuthEnv, getAuthorizedParties } from '../server/env'

const environment = parseAuthEnv()
getAuthorizedParties(environment)
await verifyPassword(
  '__configuration_check_only__',
  environment.SINGLE_USER_PASSWORD_HASH
)

console.info(
  'Single-user password hash, session secret, and origins are configured.'
)
