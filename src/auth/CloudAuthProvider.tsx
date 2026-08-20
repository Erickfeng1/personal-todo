import { ClerkProvider, useAuth, useClerk, useUser } from '@clerk/react'
import { useCallback, useMemo, type PropsWithChildren } from 'react'
import {
  CloudAuthContext,
  unavailableCloudAuth,
  type CloudAuthValue
} from './cloud-auth-context'

const clientEnvironment = import.meta.env as unknown as {
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY?: string
}
const publishableKey =
  clientEnvironment.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY?.trim()

function ClerkAuthBridge({ children }: PropsWithChildren) {
  const auth = useAuth()
  const { user, isLoaded: isUserLoaded } = useUser()
  const clerk = useClerk()

  const getToken = useCallback(() => auth.getToken(), [auth])
  const openSignIn = useCallback(() => clerk.openSignIn(), [clerk])
  const signOut = useCallback(
    () => clerk.signOut({ redirectUrl: '/settings' }),
    [clerk]
  )

  const value = useMemo<CloudAuthValue>(() => {
    if (!auth.isLoaded || !isUserLoaded) {
      return {
        ...unavailableCloudAuth,
        status: 'loading'
      }
    }

    if (!auth.isSignedIn) {
      return {
        ...unavailableCloudAuth,
        status: 'signed-out',
        openSignIn
      }
    }

    return {
      status: 'signed-in',
      userId: auth.userId,
      userLabel:
        user?.fullName ?? user?.primaryEmailAddress?.emailAddress ?? '当前账号',
      getToken,
      openSignIn,
      signOut
    }
  }, [
    auth.isLoaded,
    auth.isSignedIn,
    auth.userId,
    getToken,
    isUserLoaded,
    openSignIn,
    signOut,
    user
  ])

  return (
    <CloudAuthContext.Provider value={value}>
      {children}
    </CloudAuthContext.Provider>
  )
}

export function CloudAuthProvider({ children }: PropsWithChildren) {
  if (!publishableKey) {
    return (
      <CloudAuthContext.Provider value={unavailableCloudAuth}>
        {children}
      </CloudAuthContext.Provider>
    )
  }

  return (
    <ClerkProvider
      publishableKey={publishableKey}
      telemetry={{ disabled: true }}
      appearance={{
        variables: {
          colorPrimary: '#31594d',
          borderRadius: '0.75rem'
        }
      }}
    >
      <ClerkAuthBridge>{children}</ClerkAuthBridge>
    </ClerkProvider>
  )
}
