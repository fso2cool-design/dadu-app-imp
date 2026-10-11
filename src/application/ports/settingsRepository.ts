import type { AttendanceSettings, DocumentSettings, SchoolSettings, UserPreferences } from '../../types';

export interface SettingsRepository {
  getSchoolSettings(uid: string): Promise<SchoolSettings | null>;
  saveSchoolSettings(uid: string, data: SchoolSettings): Promise<void>;
  getDocumentSettings(uid: string): Promise<DocumentSettings | null>;
  saveDocumentSettings(uid: string, data: DocumentSettings): Promise<void>;
  getUserPreferences(uid: string): Promise<UserPreferences | null>;
  saveUserPreferences(uid: string, data: UserPreferences): Promise<void>;
  getAttendanceSettings(uid: string): Promise<AttendanceSettings>;
  saveAttendanceSettings(uid: string, data: AttendanceSettings): Promise<void>;
}
