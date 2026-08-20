import { createClerkClient } from '@clerk/backend'
import { parseAuthEnv } from '../server/env'

const environment = parseAuthEnv()
const clerk = createClerkClient({
  secretKey: environment.CLERK_SECRET_KEY,
  publishableKey: environment.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY,
  telemetry: { disabled: true }
})

await clerk.users.getUserList({ limit: 1 })

console.info('Clerk credentials are healthy.')
