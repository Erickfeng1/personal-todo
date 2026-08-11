import type { UTCDateTime } from '../task/task.types'

export type ThemePreference = 'system' | 'light' | 'dark'
export type WeekStartsOn = 0 | 1

export interface AppSettings {
  id: 'singleton'
  theme: ThemePreference
  weekStartsOn: WeekStartsOn
  locale: string
  updatedAt: UTCDateTime
}

export interface UpdateSettingsInput {
  theme?: ThemePreference
  weekStartsOn?: WeekStartsOn
}
