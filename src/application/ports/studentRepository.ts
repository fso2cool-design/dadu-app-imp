import type { Student, StudentPaginationOptions, PaginatedStudentsResult } from '../../types';
import type {
  StudentUsageSummary,
  StudentSearchFilterOptions,
  ImportStudentItem,
  ImportStudentResult,
  AtomicImportEnrollmentConfig,
} from '../../domain/student.types';

export type {
  StudentUsageSummary,
  StudentSearchFilterOptions,
  ImportStudentItem,
  ImportStudentResult,
  AtomicImportEnrollmentConfig,
} from '../../domain/student.types';

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
  atomicImport(uid: string, list: ImportStudentItem[], enrollmentConfig?: AtomicImportEnrollmentConfig): Promise<ImportStudentResult>;
}
