import { Student } from '../types';

export interface DuplicateStudentGroup {
  key: string;
  matchType: 'NIS' | 'NISN' | 'NAME';
  matchValue: string;
  masterStudent: Student;
  duplicateStudents: Student[];
  totalRecords: number;
}

export interface DeduplicationScanResult {
  hasDuplicates: boolean;
  totalDuplicateStudents: number;
  totalDuplicateEnrollments: number;
  groups: DuplicateStudentGroup[];
  orphanEnrollmentsCount: number;
}

export interface DeduplicationExecutionResult {
  mergedStudentsCount: number;
  deletedStudentsCount: number;
  deletedEnrollmentsCount: number;
  relinkedEnrollmentsCount: number;
  relinkedAcademicRecordsCount: number;
  details: string[];
}
