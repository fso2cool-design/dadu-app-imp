import type { SettingsRepository } from '../../../application/ports/settingsRepository';
import * as S from '../../../services/firestore/settings';
export const settingsRepository: SettingsRepository = {
  get: (uid) => (S as any).getSettings?.(uid) ?? (S as any).getUserSettings?.(uid),
  save: (uid,d) => (S as any).saveSettings?.(uid,d) ?? (S as any).updateSettings?.(uid,d),
};
