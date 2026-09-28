import type { AcademicYear } from '../../types';

export interface AcademicYearUsageSummary {
  isUsed: boolean;
  canDelete: boolean;
  reasons: string[];
  counts: {
    classes: number;
    enrollments: number;
    teachingAssignments: number;
    meetings: number;
    attendanceRecords: number;
    dailyAttendanceSessions: number;
    dailyAttendanceRecords: number;
    assessmentItems: number;
    studentNotes: number;
    teacherAttendanceRecords: number;
  };
}

export interface AcademicYearRepository {
  getAll(uid: string): Promise<AcademicYear[]>;
  getActive(uid: string): Promise<AcademicYear | null>;
  create(uid: string, data: Omit<AcademicYear, 'id' | 'createdAt' | 'updatedAt'>): Promise<AcademicYear>;
  checkUsage(uid: string, yearId: string): Promise<AcademicYearUsageSummary>;
  update(uid: string, id: string, data: Partial<AcademicYear>): Promise<void>;
  archive(uid: string, id: string): Promise<void>;
  unarchive(uid: string, id: string): Promise<void>;
  canDelete(uid: string, yearId: string): Promise<{ canDelete: boolean; reason?: string; details?: AcademicYearUsageSummary }>;
  delete(uid: string, id: string): Promise<void>;
}
