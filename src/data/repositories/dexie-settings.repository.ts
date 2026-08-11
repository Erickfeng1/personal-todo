import type { SettingsRepository } from '../../domain/settings/settings.repository'
import type { AppSettings } from '../../domain/settings/settings.types'
import type { TodoDatabase } from '../db'

export class DexieSettingsRepository implements SettingsRepository {
  constructor(private readonly database: TodoDatabase) {}

  get(): Promise<AppSettings | undefined> {
    return this.database.settings.get('singleton')
  }

  async save(settings: AppSettings): Promise<void> {
    await this.database.settings.put(settings)
  }
}
