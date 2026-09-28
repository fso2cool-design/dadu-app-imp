import type { DailyAttendanceRecord } from '../../types';
export interface HomeroomAttendanceRepository {
  getAllForClass(uid: string, classId: string, academicYearId: string): Promise<DailyAttendanceRecord[]>;
}
