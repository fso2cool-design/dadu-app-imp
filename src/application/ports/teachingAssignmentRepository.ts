import type { TeachingAssignment } from '../../types';
import type { TeachingAssignmentUsageSummary } from '../../domain/teachingAssignment.types';

export type { TeachingAssignmentUsageSummary } from '../../domain/teachingAssignment.types';

export interface TeachingAssignmentRepository {
  checkUsage(uid: string, assignmentId: string): Promise<TeachingAssignmentUsageSummary>;
  getAll(uid: string, academicYearId?: string): Promise<TeachingAssignment[]>;
  create(uid: string, data: Omit<TeachingAssignment, 'id' | 'createdAt' | 'updatedAt'>): Promise<TeachingAssignment>;
  update(uid: string, id: string, data: Partial<TeachingAssignment>): Promise<void>;
  archive(uid: string, id: string, activeAyId?: string): Promise<void>;
  unarchive(uid: string, id: string, activeAcademicYearId?: string): Promise<void>;
  canDelete(uid: string, id: string): Promise<{ canDelete: boolean; reason?: string }>;
  delete(uid: string, id: string): Promise<void>;
}
