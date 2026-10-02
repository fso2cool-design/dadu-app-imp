import { 
  SemesterType
} from '../types';

export interface AssessmentFilterOptions {
  academicYearId?: string;
  semester?: SemesterType;
  teachingAssignmentId?: string;
  classId?: string;
  subjectId?: string;
}

export interface MatrixScoreInput {
  assessmentItemId: string;
  studentId: string;
  score: number | null;
  note?: string;
  isDeleted?: boolean;
}

