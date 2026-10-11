import type { Student } from '../types';

export interface StudentUsageSummary {
  isUsed: boolean;
  canDelete: boolean;
  reasons: string[];
  counts: {
    enrollments: number;
    attendanceRecords: number;
    scores: number;
    studentNotes: number;
  };
}

export interface StudentSearchFilterOptions {
  status?: string;
  gender?: string;
  maxResults?: number;
  limitPerToken?: number;
}

export interface ImportStudentItem extends Partial<Omit<Student, 'id' | 'createdAt' | 'updatedAt' | 'fullName'>> {
  fullName: string;
  rollNumber?: number;
  classId?: string;
  className?: string;
}

export interface ImportStudentResult {
  count: number;
  enrolledCount: number;
  createdCount: number;
  updatedCount: number;
}

export interface AtomicImportEnrollmentConfig {
  academicYearId: string;
  classId?: string;
  className?: string;
  academicYearLabel?: string;
  overwriteExisting?: boolean;
}
