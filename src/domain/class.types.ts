import { 
  // TODO: Add missing imports here
} from '../types';

export interface ClassUsageSummary {
  isUsed: boolean;
  canDelete: boolean;
  reasons: string[];
  counts: {
    enrollments: number;
    teachingAssignments: number;
    meetings: number;
    dailyAttendance: number;
    assessmentItems: number;
    studentNotes: number;
  };
}

