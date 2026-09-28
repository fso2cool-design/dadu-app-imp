import type { Meeting, SemesterType, AttendanceSummary } from '../../types';

export interface MeetingFilterOptions {
  academicYearId?: string;
  semester?: SemesterType;
  teachingAssignmentId?: string;
  classId?: string;
}

export interface MeetingRepository {
  getAll(uid: string, options?: MeetingFilterOptions): Promise<Meeting[]>;
  getById(uid: string, meetingId: string): Promise<Meeting | null>;
  create(uid: string, data: Omit<Meeting, 'id' | 'createdAt' | 'updatedAt'>): Promise<Meeting>;
  update(uid: string, id: string, data: Partial<Meeting>): Promise<void>;
  canDelete(uid: string, id: string): Promise<{ canDelete: boolean; reason?: string; hasAttendance: boolean; attendanceCount: number }>;
  delete(uid: string, id: string): Promise<void>;
  updateAttendanceSummary(uid: string, meetingId: string, summary: AttendanceSummary): Promise<void>;
}
