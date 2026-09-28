import * as S from '../../../services/firestore/settings';
export const DEFAULT_ATTENDANCE_SETTINGS = S.DEFAULT_ATTENDANCE_SETTINGS;
export const settingsRepository = {
  getSchoolSettings: S.getSchoolSettings,
  saveSchoolSettings: S.saveSchoolSettings,
  getDocumentSettings: S.getDocumentSettings,
  saveDocumentSettings: S.saveDocumentSettings,
  getUserPreferences: S.getUserPreferences,
  saveUserPreferences: S.saveUserPreferences,
  getAttendanceSettings: S.getAttendanceSettings,
  saveAttendanceSettings: S.saveAttendanceSettings,
  // legacy aliases for container compatibility
  get: S.getSchoolSettings,
  save: S.saveSchoolSettings,
};
