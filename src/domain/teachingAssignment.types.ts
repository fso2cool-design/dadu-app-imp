import { 
  // TODO: Add missing imports here
} from '../types';

export interface TeachingAssignmentUsageSummary {
  isUsed: boolean;
  canDelete: boolean;
  reasons: string[];
  counts: {
    meetings: number;
    attendanceRecords: number;
    assessmentItems: number;
    teacherAttendanceRecords: number;
  };
}

