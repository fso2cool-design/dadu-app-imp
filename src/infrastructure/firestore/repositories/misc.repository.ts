import * as B from '../../../services/firestore/backup';
import * as D from '../../../services/firestore/diagnostics';
import * as Dup from '../../../services/firestore/deduplication';
import * as R from '../../../services/firestore/relationshipRecovery';
import * as Sch from '../../../services/firestore/classSchedule';
import * as On from '../../../services/firestore/onboarding';

export const backupRepository = {
  exportFullDatabase: B.exportFullDatabase,
  importFullDatabase: B.importFullDatabase,
  getDatabaseStatistics: B.getDatabaseStatistics,
  resetSemesterData: B.resetSemesterData,
  previewSemesterReset: B.previewSemesterReset,
};
export const diagnosticsRepository = { runIntegrityAudit: D.runIntegrityAudit };
export const deduplicationRepository = {
  scanDuplicateStudents: Dup.scanDuplicateStudents,
  executeZeroResidueDeduplication: Dup.executeZeroResidueDeduplication,
};
export const relationshipRecoveryRepository = {
  findStudentCandidatesByNisn: R.findStudentCandidatesByNisn,
  relinkEnrollmentClass: R.relinkEnrollmentClass,
  relinkStudentRelationship: R.relinkStudentRelationship,
};
export const classScheduleRepository = {
  getScheduleDocId: Sch.getScheduleDocId,
  getClassSchedule: Sch.getClassSchedule,
  saveClassSchedule: Sch.saveClassSchedule,
  deleteClassSchedule: Sch.deleteClassSchedule,
};
export const onboardingRepository = {
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
