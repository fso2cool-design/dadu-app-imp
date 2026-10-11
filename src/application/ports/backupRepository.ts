import type { DatabaseBackup, DatabaseStatistics, ResetSemesterOptions, ResetSemesterSummary } from '../../domain/backup.types';
import type { SemesterType } from '../../types';

export interface ImportProgressInfo {
  message: string;
  percentage: number;
  collectionName?: string;
  collectionIndex?: number;
  totalCollections?: number;
  processedItems?: number;
  totalItems?: number;
}

export interface BackupRepository {
  exportFullDatabase(uid: string, teacherName?: string, schoolName?: string): Promise<DatabaseBackup>;
  importFullDatabase(
    uid: string,
    backup: DatabaseBackup,
    mode?: 'merge' | 'overwrite',
    onProgress?: (info: ImportProgressInfo) => void
  ): Promise<{ success: boolean; totalRestored: number }>;
  getDatabaseStatistics(uid: string): Promise<DatabaseStatistics>;
  resetSemesterData(
    uid: string,
    optionsOrYearId: string | ResetSemesterOptions,
    maybeSemester?: SemesterType | 'ALL'
  ): Promise<ResetSemesterSummary>;
  previewSemesterReset(uid: string, options: ResetSemesterOptions): Promise<ResetSemesterSummary>;
}