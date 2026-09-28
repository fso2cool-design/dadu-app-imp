import type { TeacherAttendanceRecord, TeachingAssignment, SemesterType, TeacherMonthlyAttendanceRecord } from '../../types';
import type { SaveTeacherAttendancePayload } from '../../services/firestore/teacherAttendance';
export interface TeacherAttendanceRepository {
  getHomeroomAssignments(uid: string, academicYearId: string, semester: SemesterType, classId: string, includeArchived?: boolean): Promise<TeachingAssignment[]>;
  getForDate(uid: string, academicYearId: string, semester: SemesterType, classId: string, date: string): Promise<TeacherAttendanceRecord[]>;
  getMonthly(uid: string, academicYearId: string, semester: SemesterType, classId: string, yearMonthPrefix: string): Promise<TeacherAttendanceRecord[]>;
  save(uid: string, payload: SaveTeacherAttendancePayload): Promise<{ count: number }>;
  deleteForDate(uid: string, academicYearId: string, semester: SemesterType, classId: string, date: string): Promise<void>;
  getMonthlyAttendance(uid: string, classId: string, academicYearId: string, semester: SemesterType, year: number, month: number): Promise<TeacherMonthlyAttendanceRecord | null>;
  saveMonthlyAttendance(uid: string, record: Omit<TeacherMonthlyAttendanceRecord, 'updatedAt' | 'createdAt'>): Promise<void>;
}
