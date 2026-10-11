import type { BackupRepository } from '../../../application/ports/backupRepository';
import type { ClassScheduleRepository } from '../../../application/ports/classScheduleRepository';
import type { DeduplicationRepository } from '../../../application/ports/deduplicationRepository';
import type { DiagnosticsRepository } from '../../../application/ports/diagnosticsRepository';
import type { OnboardingRepository } from '../../../application/ports/onboardingRepository';
import type { RelationshipRecoveryRepository } from '../../../application/ports/relationshipRecoveryRepository';
import * as B from '../../../services/firestore/backup';
import * as D from '../../../services/firestore/diagnostics';
import * as Dup from '../../../services/firestore/deduplication';
import * as R from '../../../services/firestore/relationshipRecovery';
import * as Sch from '../../../services/firestore/classSchedule';
import * as On from '../../../services/firestore/onboarding';

export const backupRepository: BackupRepository = {
  exportFullDatabase: B.exportFullDatabase,
  importFullDatabase: B.importFullDatabase,
  getDatabaseStatistics: B.getDatabaseStatistics,
  resetSemesterData: B.resetSemesterData,
  previewSemesterReset: B.previewSemesterReset,
};
export const diagnosticsRepository: DiagnosticsRepository = {
  runIntegrityAudit: D.runIntegrityAudit,
};
export const deduplicationRepository: DeduplicationRepository = {
  scanDuplicateStudents: Dup.scanDuplicateStudents,
  executeZeroResidueDeduplication: Dup.executeZeroResidueDeduplication,
};
export const relationshipRecoveryRepository: RelationshipRecoveryRepository = {
  findStudentCandidatesByNisn: R.findStudentCandidatesByNisn,
  relinkEnrollmentClass: R.relinkEnrollmentClass,
  relinkStudentRelationship: R.relinkStudentRelationship,
};
export const classScheduleRepository: ClassScheduleRepository = {
  getScheduleDocId: Sch.getScheduleDocId,
  getClassSchedule: Sch.getClassSchedule,
  saveClassSchedule: Sch.saveClassSchedule,
  deleteClassSchedule: Sch.deleteClassSchedule,
};
export const onboardingRepository: OnboardingRepository = {
  submitOnboarding: On.submitOnboarding,
};

// re-export for direct imports
export const scanDuplicateStudents = Dup.scanDuplicateStudents;
export const executeZeroResidueDeduplication = Dup.executeZeroResidueDeduplication;
export type DeduplicationScanResult = Dup.DeduplicationScanResult;
export type DeduplicationExecutionResult = Dup.DeduplicationExecutionResult;
export type DiagnosticResult = D.DiagnosticResult;
export type IntegrityIssue = D.IntegrityIssue;

export const miscRepositories = { backupRepository, diagnosticsRepository, deduplicationRepository, relationshipRecoveryRepository, classScheduleRepository, onboardingRepository };
