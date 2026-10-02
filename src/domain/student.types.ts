import { 
  // TODO: Add missing imports here
} from '../types';

export interface StudentUsageSummary {
  isUsed: boolean;
  canDelete: boolean;
  reasons: string[];
  counts: {
    enrollments: number;
    scores: number;
    attendanceRecords: number;
    dailyAttendanceRecords: number;
    studentNotes: number;
  };
}

