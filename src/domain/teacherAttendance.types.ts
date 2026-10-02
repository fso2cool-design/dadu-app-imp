import { 
  SemesterType, TeacherAttendanceStatus, TeacherAttendanceEntryType
} from '../types';

export interface SaveTeacherAttendancePayload {
  academicYearId: string;
  academicYearLabel?: string;
  semester: SemesterType;
  classId: string;
  className?: string;
  date: string; // YYYY-MM-DD
  items: SaveTeacherAttendanceItem[];
}

export interface SaveTeacherAttendanceItem {
  teachingAssignmentId?: string; // Dapat kosong/manual jika di luar penugasan rutin
  teacherId: string;
  teacherName?: string;
  subjectId: string;
  subjectName?: string;
  subjectCode?: string;
  dayOfWeek?: number;
  status: TeacherAttendanceStatus;
  notes?: string;
  isManualEntry?: boolean;
  isSubstitute?: boolean;
  substituteForTeacherName?: string;
  entryType?: import('../types').TeacherAttendanceEntryType;
}