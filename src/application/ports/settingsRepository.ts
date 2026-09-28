export interface SettingsRepository {
  get(uid: string): Promise<any>;
  save(uid: string, data: any): Promise<void>;
}
