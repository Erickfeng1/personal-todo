import type { AppSettings } from './settings.types'

export interface SettingsRepository {
  get(): Promise<AppSettings | undefined>
  save(settings: AppSettings): Promise<void>
}
