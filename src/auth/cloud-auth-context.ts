import { createContext, useContext } from 'react'

export type CloudAuthStatus =
  'loading' | 'signed-out' | 'signed-in' | 'unavailable' | 'error'

export interface CloudAuthValue {
  status: CloudAuthStatus
  userId: string | null
  userLabel: string | null
  getToken: () => Promise<string | null>
  openSignIn: () => void
  login: (password: string) => Promise<void>
  retry: () => Promise<void>
  signOut: () => Promise<void>
}

export const unavailableCloudAuth: CloudAuthValue = {
  status: 'unavailable',
  userId: null,
  userLabel: null,
  getToken: () => Promise.resolve(null),
  openSignIn: () => undefined,
  login: () => Promise.resolve(),
  retry: () => Promise.resolve(),
  signOut: () => Promise.resolve()
}

export const CloudAuthContext =
  createContext<CloudAuthValue>(unavailableCloudAuth)

export function useCloudAuth(): CloudAuthValue {
  return useContext(CloudAuthContext)
}
