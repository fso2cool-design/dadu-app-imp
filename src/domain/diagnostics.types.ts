import { 
  // TODO: Add missing imports here
} from '../types';

export interface DiagnosticResult {
  timestamp: string;
  totalIssues: number;
  criticalCount: number;
  warningsCount: number;
  infoCount: number;
  issues: IntegrityIssue[];
  summary: {
    totalStudents: number;
    totalClasses: number;
    totalEnrollments: number;
    totalAssignments: number;
    totalMeetings: number;
    totalAttendanceRecords: number;
    totalAssessmentItems: number;
    totalScores: number;
  };
}

export interface IntegrityIssue {
  type: 
    | 'ORPHAN_SCORE' 
    | 'ORPHAN_ATTENDANCE' 
    | 'ORPHAN_DAILY_ATTENDANCE' 
    | 'ORPHAN_ENROLLMENT'
    | 'ORPHAN_STUDENT_ENROLLMENT'
    | 'ORPHAN_CLASS_ENROLLMENT'
    | 'ORPHAN_CLASS'
    | 'ORPHAN_MEETING' 
    | 'ORPHAN_ASSESSMENT' 
    | 'DUPLICATE_ACTIVE_ENROLLMENT' 
    | 'DUPLICATE_NISN'
    | 'INVALID_SCORE_RANGE' 
    | 'ORPHAN_STUDENT_NOTE'
    | 'ORPHAN_TEACHER_ATTENDANCE';
  severity: 'CRITICAL' | 'WARNING' | 'INFO';
  description: string;
  documentId: string;
  collectionName: string;
  details?: any;
}

