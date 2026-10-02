import { 
  // TODO: Add missing imports here
} from '../types';

export interface AcademicYearUsageSummary {
  isUsed: boolean;
  canDelete: boolean;
  reasons: string[];
  counts: {
    classes: number;
    enrollments: number;
    teachingAssignments: number;
    meetings: number;
    attendanceRecords: number;
    dailyAttendanceSessions: number;
    dailyAttendanceRecords: number;
    assessmentItems: number;
    studentNotes: number;
    teacherAttendanceRecords: number;
  };
}

