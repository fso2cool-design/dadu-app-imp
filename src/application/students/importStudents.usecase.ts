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
 * Currently delegates batch create to repository/batch logic; domain token generation is applied here.
 * Future: fully replace firestore/students atomicImport with this orchestration.
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

  // Delegate to existing service via repo if available (keeps behavior stable)
  
  if (deps.studentRepo.atomicImport) {
    return deps.studentRepo.atomicImport(uid, enriched as any, { ...(enrollmentConfig as any), overwriteExisting: !!shouldOverwrite });
  }
  if (deps.studentRepo.batchCreate) {
    // fallback simple batch without enrollment
    await deps.studentRepo.batchCreate(uid, enriched as any);
    return { createdCount: enriched.length, updatedCount: 0, enrolledCount: 0 };
  }
  // last resort: create one by one
  let created = 0;
  for (const it of enriched) {
    await deps.studentRepo.create(uid, it as any);
    created++;
  }
  return { createdCount: created, updatedCount: 0, enrolledCount: 0 };
}
