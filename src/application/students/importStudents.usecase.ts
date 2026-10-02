import type { StudentRepository } from '../ports/studentRepository';
import type { EnrollmentRepository } from '../ports/enrollmentRepository';
import { buildStudentSearchTokens } from '../../domain/students/studentSearchTokens';

export interface ImportStudentItem {
  nis?: string;
  nisn?: string;
  fullName: string;
  gender?: 'L' | 'P';
  classId?: string;
  className?: string;
  rollNumber?: number;
  birthPlace?: string;
  birthDate?: string;
  address?: string;
  parentName?: string;
  parentPhone?: string;
  phone?: string;
  email?: string;
  religion?: string;
  nikSiswa?: string;
  nikIbu?: string;
  nkk?: string;
  status?: string;
  notes?: string;
  customAttributes?: Record<string, any>;
}

export interface ImportStudentsInput {
  uid: string;
  items: ImportStudentItem[];
  enrollmentConfig?: { academicYearId: string; classId?: string; className?: string; academicYearLabel?: string };
  shouldOverwrite?: boolean;
}

export interface ImportStudentsResult {
  createdCount: number;
  updatedCount: number;
  enrolledCount: number;
}

/**
 * Application use-case: orchestrates student import via repositories and domain rules.
 * Enriches search tokens and delegates atomic batch import to the student repository.
 */
export async function importStudentsUseCase(
  input: ImportStudentsInput,
  deps: { studentRepo: StudentRepository; enrollmentRepo?: EnrollmentRepository }
): Promise<ImportStudentsResult> {
  const { uid, items, enrollmentConfig, shouldOverwrite } = input;

  // Enrich with domain searchTokens before persistence
  const enriched = items.map(it => ({
    ...it,
    searchTokens: buildStudentSearchTokens(it.fullName, it.parentName),
  }));

  const res = await deps.studentRepo.atomicImport(
    uid,
    enriched as any,
    enrollmentConfig ? { ...enrollmentConfig, overwriteExisting: !!shouldOverwrite } : undefined
  );

  return {
    createdCount: res.createdCount,
    updatedCount: res.updatedCount,
    enrolledCount: res.enrolledCount,
  };
}
