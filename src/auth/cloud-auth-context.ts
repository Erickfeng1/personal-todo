import { createContext, useContext } from 'react'

export type CloudAuthStatus =
  'loading' | 'signed-out' | 'signed-in' | 'unavailable'

export interface CloudAuthValue {
  status: CloudAuthStatus
  userId: string | null
  userLabel: string | null
  getToken: () => Promise<string | null>
  openSignIn: () => void
  signOut: () => Promise<void>
}

export const unavailableCloudAuth: CloudAuthValue = {
  status: 'unavailable',
  userId: null,
  userLabel: null,
  getToken: () => Promise.resolve(null),
  openSignIn: () => undefined,
  signOut: () => Promise.resolve()
}

export const CloudAuthContext =
  createContext<CloudAuthValue>(unavailableCloudAuth)

export function useCloudAuth(): CloudAuthValue {
  return useContext(CloudAuthContext)
}
