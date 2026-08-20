import { useCallback, useEffect, useState } from 'react'
import { useCloudAuth } from '../auth/cloud-auth-context'
import {
  CloudSyncClientError,
  cloudSyncClient,
  type CloudSyncClient,
  type CloudSyncInspection
} from '../sync/cloud-sync-client'

export type CloudInspectionStatus =
  'idle' | 'loading' | 'ready' | 'unauthorized' | 'error'

export interface CloudInspectionState {
  status: CloudInspectionStatus
  inspection: CloudSyncInspection | null
}

interface StoredCloudInspectionState extends CloudInspectionState {
  identityKey: string | null
  attempt: number
}

const initialState: StoredCloudInspectionState = {
  status: 'idle',
  inspection: null,
  identityKey: null,
  attempt: 0
}

export function useCloudSyncInspection(
  client: CloudSyncClient = cloudSyncClient
) {
  const auth = useCloudAuth()
  const [state, setState] = useState(initialState)
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    if (auth.status !== 'signed-in') return

    const controller = new AbortController()
    const identityKey = auth.userId
    void client
      .inspect(auth.getToken, controller.signal)
      .then((inspection) => {
        if (!controller.signal.aborted) {
          setState({
            status: 'ready',
            inspection,
            identityKey,
            attempt
          })
        }
      })
      .catch((cause: unknown) => {
        if (controller.signal.aborted) return
        setState({
          status:
            cause instanceof CloudSyncClientError &&
            cause.code === 'unauthorized'
              ? 'unauthorized'
              : 'error',
          inspection: null,
          identityKey,
          attempt
        })
      })

    return () => controller.abort()
  }, [attempt, auth.getToken, auth.status, auth.userId, client])

  const retry = useCallback(() => setAttempt((value) => value + 1), [])
  if (auth.status !== 'signed-in') return { ...initialState, retry }
  if (state.identityKey !== auth.userId || state.attempt !== attempt) {
    return { status: 'loading' as const, inspection: null, retry }
  }
  return { ...state, retry }
}
