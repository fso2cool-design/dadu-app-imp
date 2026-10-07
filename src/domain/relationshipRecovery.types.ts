export interface RelinkClassParams {
  enrollmentId: string;
  targetClassId: string;
  performedBy: string;
  reason?: string;
}

export interface RelinkStudentParams {
  targetType: 'ENROLLMENT' | 'SCORE' | 'ATTENDANCE' | 'DAILY_ATTENDANCE' | 'STUDENT_NOTE';
  documentId: string;
  targetStudentId: string;
  performedBy: string;
  expectedNisn?: string;
  reason?: string;
}
