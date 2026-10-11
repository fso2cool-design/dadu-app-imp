import type { DeduplicationExecutionResult, DeduplicationScanResult } from '../../domain/deduplication.types';

export interface DeduplicationRepository {
  scanDuplicateStudents(
    uid: string,
    options?: { classId?: string; academicYearId?: string }
  ): Promise<DeduplicationScanResult>;
  executeZeroResidueDeduplication(
    uid: string,
    options?: { classId?: string; academicYearId?: string }
  ): Promise<DeduplicationExecutionResult>;
}