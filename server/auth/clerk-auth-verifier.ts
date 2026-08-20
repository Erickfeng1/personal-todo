import { createClerkClient } from '@clerk/backend'
import type { AuthVerifier } from './auth-verifier.js'
import { getAuthorizedParties, parseAuthEnv } from '../env.js'

export function createClerkAuthVerifier(): AuthVerifier {
  const environment = parseAuthEnv()
  const clerk = createClerkClient({
    secretKey: environment.CLERK_SECRET_KEY,
    publishableKey: environment.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY,
    telemetry: { disabled: true }
  })
  const authorizedParties = getAuthorizedParties(environment)

  return {
    async authenticate(request) {
      const state = await clerk.authenticateRequest(request, {
        acceptsToken: 'session_token',
        authorizedParties
      })

      if (!state.isAuthenticated) return null

      return { userId: state.toAuth().userId }
    }
  }
}
