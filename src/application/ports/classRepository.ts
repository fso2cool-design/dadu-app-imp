import type { ClassItem } from '../../types';

export interface ClassUsageSummary {
  isUsed: boolean;
  canDelete: boolean;
  reasons: string[];
  counts: {
    enrollments: number;
    teachingAssignments: number;
    meetings: number;
    subjectAttendance?: number;
    dailyAttendance: number;
    assessmentItems: number;
    studentNotes: number;
  };
}

export interface ClassRepository {
  getAll(uid: string, academicYearId?: string): Promise<ClassItem[]>;
  create(uid: string, data: Omit<ClassItem, 'id' | 'createdAt' | 'updatedAt'>): Promise<ClassItem>;
  checkUsage(uid: string, classId: string): Promise<ClassUsageSummary>;
  canDelete(uid: string, classId: string): Promise<{ canDelete: boolean; reason?: string }>;
  update(uid: string, id: string, data: Partial<ClassItem>): Promise<void>;
  archive(uid: string, id: string): Promise<void>;
  unarchive(uid: string, id: string, activeAcademicYearId?: string): Promise<void>;
  delete(uid: string, id: string): Promise<void>;
}
