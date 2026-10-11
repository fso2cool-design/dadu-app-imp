import type { Student } from '../../types';
import type { RelinkClassParams, RelinkStudentParams } from '../../domain/relationshipRecovery.types';

export interface RelationshipRecoveryRepository {
  findStudentCandidatesByNisn(uid: string, nisn: string): Promise<Student[]>;
  relinkEnrollmentClass(uid: string, params: RelinkClassParams): Promise<void>;
  relinkStudentRelationship(uid: string, params: RelinkStudentParams): Promise<void>;
}