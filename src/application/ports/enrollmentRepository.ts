import type { Enrollment } from '../../types';

export interface GetEnrollmentsOptions {
  status?: 'ACTIVE' | 'TRANSFERRED' | 'INACTIVE' | 'GRADUATED' | 'ALL';
}

export interface BatchEnrollItem extends Omit<Enrollment, 'id' | 'createdAt' | 'updatedAt' | 'student'> {}

export interface EnrollmentRepository {
  getByClass(uid: string, academicYearId: string, classId: string, options?: GetEnrollmentsOptions): Promise<Enrollment[]>;
  getByAcademicYear(uid: string, academicYearId: string): Promise<Enrollment[]>;
  create(uid: string, data: Omit<Enrollment, 'id' | 'createdAt' | 'updatedAt' | 'student'>): Promise<Enrollment>;
  transfer(uid: string, currentEnrollmentId: string, targetClassId: string, targetClassName: string, newRollNumber: number, transferReason?: string): Promise<Enrollment>;
  update(uid: string, id: string, data: Partial<Enrollment>): Promise<void>;
  archive(uid: string, id: string, status?: 'INACTIVE' | 'TRANSFERRED' | 'GRADUATED'): Promise<void>;
  canDelete(uid: string, enrollmentId: string): Promise<{ canDelete: boolean; reason?: string }>;
  delete(uid: string, id: string): Promise<void>;
  batchEnroll(uid: string, items: BatchEnrollItem[]): Promise<void>;
  batchReorderRollNumbers(uid: string, orderedEnrollmentIds: string[]): Promise<void>;
}
