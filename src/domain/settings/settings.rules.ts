import type {
  AppSettings,
  ThemePreference,
  UpdateSettingsInput,
  WeekStartsOn
} from './settings.types'

export const DEFAULT_LOCALE = 'zh-CN'

export function createDefaultSettings(
  locale: string,
  now: string
): AppSettings {
  return {
    id: 'singleton',
    theme: 'system',
    weekStartsOn: 1,
    locale: locale.trim() || DEFAULT_LOCALE,
    updatedAt: now
  }
}

export function updateSettings(
  settings: AppSettings,
  input: UpdateSettingsInput,
  now: string
): AppSettings {
  return {
    ...settings,
    ...input,
    updatedAt: now
  }
}

export function isThemePreference(value: unknown): value is ThemePreference {
  return value === 'system' || value === 'light' || value === 'dark'
}

export function isWeekStartsOn(value: unknown): value is WeekStartsOn {
  return value === 0 || value === 1
}
