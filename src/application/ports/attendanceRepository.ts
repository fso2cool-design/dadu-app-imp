import type { AttendanceRecord, AttendanceSummary, SemesterType } from '../../types';
import type { SaveAttendanceItem, SaveSubjectAttendancePayload } from '../../domain/attendance.types';

export interface AttendanceRepository {
  saveSubjectAttendance(uid: string, payload: SaveSubjectAttendancePayload): Promise<AttendanceSummary>;
  saveMeetingAttendance(uid: string, meetingId: string, items: SaveAttendanceItem[]): Promise<AttendanceSummary>;
  getByMeeting(uid: string, meetingId: string): Promise<AttendanceRecord[]>;
  getByMeetingIds(uid: string, meetingIds: string[]): Promise<AttendanceRecord[]>;
  getByAssignment(uid: string, teachingAssignmentId: string, date?: string): Promise<AttendanceRecord[]>;
  getByDate(uid: string, teachingAssignmentId: string, date: string): Promise<AttendanceRecord[]>;
  getByClassAndPeriod(uid: string, classId: string, academicYearId: string, semester?: SemesterType): Promise<AttendanceRecord[]>;
}
