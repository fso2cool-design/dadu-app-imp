import type { AttendanceSummary, DailyAttendanceRecord, DailyAttendanceSession } from '../../types';
import type { SaveDailyAttendanceItem } from '../../domain/homeroomAttendance.types';

export interface HomeroomAttendanceRepository {
  getAllForClass(uid: string, classId: string, academicYearId?: string): Promise<DailyAttendanceRecord[]>;
  getByDate(uid: string, academicYearId: string, classId: string, date: string): Promise<DailyAttendanceRecord[]>;
  getSession(uid: string, academicYearId: string, classId: string, date: string): Promise<DailyAttendanceSession | null>;
  getMonthly(uid: string, academicYearId: string, classId: string, yearMonthPrefix: string): Promise<DailyAttendanceRecord[]>;
  saveDailyAttendance(
    uid: string,
    academicYearId: string,
    classId: string,
    className: string,
    date: string,
    items: SaveDailyAttendanceItem[],
    sessionNotes?: string
  ): Promise<AttendanceSummary>;
}
