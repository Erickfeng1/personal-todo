import type { SettingsRepository } from './settings.repository'
import {
  createDefaultSettings,
  DEFAULT_LOCALE,
  updateSettings
} from './settings.rules'
import type { AppSettings, UpdateSettingsInput } from './settings.types'

interface SettingsServiceDependencies {
  repository: SettingsRepository
  getLocale?: () => string
  now?: () => string
}

export class SettingsService {
  private readonly repository: SettingsRepository
  private readonly getLocale: () => string
  private readonly now: () => string

  constructor({
    repository,
    getLocale = () => navigator.language || DEFAULT_LOCALE,
    now = () => new Date().toISOString()
  }: SettingsServiceDependencies) {
    this.repository = repository
    this.getLocale = getLocale
    this.now = now
  }

  async get(): Promise<AppSettings> {
    const existing = await this.repository.get()
    if (existing) return existing

    const settings = createDefaultSettings(this.getLocale(), this.now())
    await this.repository.save(settings)
    return settings
  }

  async update(input: UpdateSettingsInput): Promise<AppSettings> {
    const settings = updateSettings(await this.get(), input, this.now())
    await this.repository.save(settings)
    return settings
  }
}
