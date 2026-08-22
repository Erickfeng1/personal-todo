import { useEffect, useState, useSyncExternalStore } from 'react'
import { cloudStore } from '../cloud/cloud-store'

export function useCloudQuery<T>(
  query: () => Promise<T>,
  dependencies: unknown[]
): T | undefined {
  const version = useSyncExternalStore(
    cloudStore.subscribe,
    cloudStore.getVersion,
    cloudStore.getVersion
  )
  const queryKey = JSON.stringify([version, ...dependencies])
  const [result, setResult] = useState<{ key: string; value: T }>()

  useEffect(() => {
    let active = true
    void query().then((value) => {
      if (active) setResult({ key: queryKey, value })
    })
    return () => {
      active = false
    }
    // Callers provide the complete logical dependency list; version invalidates all repository queries.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [version, ...dependencies])

  return result?.key === queryKey ? result.value : undefined
}
