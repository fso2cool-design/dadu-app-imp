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
