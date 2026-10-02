import type { SchoolSettings, DocumentSettings, UserPreferences, AcademicYear, AttendanceSettings } from '../../../types';
import type { DatabaseStatistics, DatabaseBackup, ResetSemesterScope, ResetSemesterSummary } from '../../../services/firestore/backup';

export type TabType = 'profile' | 'school' | 'document' | 'preferences' | 'backup' | 'stats' | 'maintenance';

export interface ProfileFormData {
  displayName: string;
  nip: string;
  nuptk: string;
  nik: string;
  phone: string;
  employmentStatus: 'PNS' | 'PPPK' | 'GTT' | 'TETAP_YAYASAN' | 'HONORER';
  mainSubject: string;
  signatureUrl: string;
}

export interface SettingsTabProps {
  saving: boolean;
  onSubmit?: (e?: React.FormEvent) => void;
  onSuccess: (msg: string) => void;
  onError: (msg: string) => void;
}

export interface ProfileTabProps extends SettingsTabProps {
  profileData: ProfileFormData;
  setProfileData: React.Dispatch<React.SetStateAction<ProfileFormData>>;
  isTeacherSigModalOpen: boolean;
  setIsTeacherSigModalOpen: (open: boolean) => void;
}

export interface SchoolTabProps extends SettingsTabProps {
  schoolData: SchoolSettings;
  setSchoolData: React.Dispatch<React.SetStateAction<SchoolSettings>>;
  isHeadmasterSigModalOpen: boolean;
  setIsHeadmasterSigModalOpen: (open: boolean) => void;
  isStampModalOpen: boolean;
  setIsStampModalOpen: (open: boolean) => void;
  onKemenagLogoChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onSchoolLogoChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export interface DocumentTabProps extends SettingsTabProps {
  documentData: DocumentSettings;
  setDocumentData: React.Dispatch<React.SetStateAction<DocumentSettings>>;
  schoolData: SchoolSettings;
}

export interface PreferencesTabProps extends SettingsTabProps {
  preferencesData: UserPreferences;
  setPreferencesData: React.Dispatch<React.SetStateAction<UserPreferences>>;
  attendanceSettings: AttendanceSettings;
  isHolidayModalOpen: boolean;
  setIsHolidayModalOpen: (open: boolean) => void;
  isChangeLogModalOpen: boolean;
  setIsChangeLogModalOpen: (open: boolean) => void;
}

export interface BackupTabProps extends SettingsTabProps {
  isExporting: boolean;
  setIsExporting: (v: boolean) => void;
  backupFileContent: DatabaseBackup | null;
  setBackupFileContent: (v: DatabaseBackup | null) => void;
  importMode: 'merge' | 'overwrite';
  setImportMode: (v: 'merge' | 'overwrite') => void;
  isImporting: boolean;
  setIsImporting: (v: boolean) => void;
  importProgressText: string | null;
  setImportProgressText: (v: string | null) => void;
  onExportFullBackup: () => void;
  onBackupFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onExecuteRestore: () => void;
}

export interface StatsTabProps {
  dbStats: DatabaseStatistics | null;
  statsLoading: boolean;
  setStatsLoading: (v: boolean) => void;
  onRefreshStats: () => void;
}

export interface MaintenanceTabProps extends SettingsTabProps {
  academicYears: AcademicYear[];
  resetAcademicYearId: string;
  setResetAcademicYearId: (v: string) => void;
  resetSemester: 'ALL' | '1' | '2';
  setResetSemester: (v: 'ALL' | '1' | '2') => void;
  resetScope: ResetSemesterScope;
  setResetScope: React.Dispatch<React.SetStateAction<ResetSemesterScope>>;
  resetPreview: ResetSemesterSummary | null;
  setResetPreview: (v: ResetSemesterSummary | null) => void;
  isPreviewLoading: boolean;
  setIsPreviewLoading: (v: boolean) => void;
  lastResetSummary: ResetSemesterSummary | null;
  confirmResetText: string;
  setConfirmResetText: (v: string) => void;
  isResetting: boolean;
  setIsResetting: (v: boolean) => void;
  isExporting: boolean;
  setIsExporting: (v: boolean) => void;
  onPreviewReset: () => void;
  onResetSemester: () => void;
  onQuickSafetyBackup: () => void;
}
