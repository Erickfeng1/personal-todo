import { useEffect } from 'react'
import {
  backupService,
  settingsRepository,
  settingsService
} from '../app/services'
import { useCloudQuery } from './useCloudQuery'

export function useSettings() {
  useEffect(() => {
    void settingsService.get()
  }, [])
  return useCloudQuery(() => settingsRepository.get(), [])
}

export function useDataStatistics() {
  return useCloudQuery(() => backupService.getStatistics(), [])
}
