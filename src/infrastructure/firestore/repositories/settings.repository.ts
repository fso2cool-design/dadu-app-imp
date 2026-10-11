import type { SettingsRepository } from '../../../application/ports/settingsRepository';
import * as S from '../../../services/firestore/settings';

export const DEFAULT_ATTENDANCE_SETTINGS = S.DEFAULT_ATTENDANCE_SETTINGS;

export const settingsRepository: SettingsRepository = {
  getSchoolSettings: S.getSchoolSettings,
  saveSchoolSettings: S.saveSchoolSettings,
  getDocumentSettings: S.getDocumentSettings,
  saveDocumentSettings: S.saveDocumentSettings,
  getUserPreferences: S.getUserPreferences,
  saveUserPreferences: S.saveUserPreferences,
  getAttendanceSettings: S.getAttendanceSettings,
  saveAttendanceSettings: S.saveAttendanceSettings,
};
