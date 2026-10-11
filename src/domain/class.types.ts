export interface ClassUsageSummary {
  isUsed: boolean;
  canDelete: boolean;
  reasons: string[];
  counts: {
    enrollments: number;
    teachingAssignments: number;
    meetings: number;
    subjectAttendance?: number;
    dailyAttendance: number;
    assessmentItems: number;
    studentNotes: number;
  };
}
