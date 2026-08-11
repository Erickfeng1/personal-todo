import { useEffect } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import {
  backupService,
  settingsRepository,
  settingsService
} from '../app/services'

export function useSettings() {
  useEffect(() => {
    void settingsService.get()
  }, [])
  return useLiveQuery(() => settingsRepository.get(), [])
}

export function useDataStatistics() {
  return useLiveQuery(() => backupService.getStatistics(), [])
}
