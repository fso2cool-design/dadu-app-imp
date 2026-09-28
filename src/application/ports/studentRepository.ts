import type { Student, StudentPaginationOptions, PaginatedStudentsResult } from '../../types';
import type { StudentUsageSummary } from '../../services/firestore/students';

export type { StudentUsageSummary } from '../../services/firestore/students';

export interface StudentSearchFilterOptions {
  status?: string;
  gender?: string;
  maxResults?: number;
  limitPerToken?: number;
}

export interface StudentRepository {
  getAll(uid: string, status?: string): Promise<Student[]>;
  getPaginated(uid: string, options?: StudentPaginationOptions): Promise<PaginatedStudentsResult>;
  getById(uid: string, studentId: string): Promise<Student | null>;
  checkNisnAvailability(uid: string, nisn: string, excludeStudentId?: string): Promise<{ isAvailable: boolean; conflictingStudent?: Student }>;
  searchByExactIdentifier(uid: string, rawQuery: string, options?: StudentSearchFilterOptions): Promise<Student[]>;
  searchByNameToken(uid: string, rawQuery: string, options?: StudentSearchFilterOptions | number): Promise<Student[]>;
  create(uid: string, data: Omit<Student, 'id' | 'createdAt' | 'updatedAt'>): Promise<Student>;
  update(uid: string, id: string, data: Partial<Student>): Promise<void>;
  checkUsage(uid: string, studentId: string): Promise<StudentUsageSummary>;
  canDelete(uid: string, studentId: string): Promise<{ canDelete: boolean; reason?: string; details?: StudentUsageSummary }>;
  archive(uid: string, id: string, status?: 'INACTIVE' | 'GRADUATED' | 'TRANSFERRED'): Promise<void>;
  unarchive(uid: string, id: string): Promise<void>;
  delete(uid: string, id: string): Promise<void>;
  batchCreate(uid: string, list: Array<Omit<Student, 'id' | 'createdAt' | 'updatedAt'>>): Promise<Student[]>;
  atomicImport(uid: string, list: Array<Omit<Student, 'id' | 'createdAt' | 'updatedAt'> & { rollNumber?: number; classId?: string; className?: string }>, enrollmentConfig?: { academicYearId: string; classId?: string; className?: string; academicYearLabel?: string; overwriteExisting?: boolean }): Promise<{ count: number; enrolledCount: number; createdCount: number; updatedCount: number }>;
}
