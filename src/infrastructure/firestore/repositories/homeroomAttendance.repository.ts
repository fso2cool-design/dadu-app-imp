import type { HomeroomAttendanceRepository } from '../../../application/ports/homeroomAttendanceRepository';
import { getAllDailyAttendanceRecordsForClass } from '../../../services/firestore/homeroomAttendance';
export const homeroomAttendanceRepository: HomeroomAttendanceRepository = {
  getAllForClass: (uid, classId, ayId) => getAllDailyAttendanceRecordsForClass(uid, classId, ayId),
};
