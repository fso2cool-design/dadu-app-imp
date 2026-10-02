import { 
  SemesterType, AttendanceStatus
} from '../types';

export interface SaveAttendanceItem {
  id?: string;
  studentId: string;
  rollNumber?: number;
  studentName?: string;
  gender?: 'L' | 'P';
  status: AttendanceStatus;
  note?: string;
}

export interface SaveSubjectAttendancePayload {
  academicYearId: string;
  semester: SemesterType;
  classId: string;
  teachingAssignmentId: string;
  subjectId?: string;
  date: string; // YYYY-MM-DD
  meetingId?: string | null;
  meetingNumber?: number | null;
  items: SaveAttendanceItem[];
}

