import type { HomeroomAttendanceRepository } from '../../../application/ports/homeroomAttendanceRepository';
import {
  getAllDailyAttendanceRecordsForClass,
  getDailyAttendanceRecords,
  getDailyAttendanceSession,
  getMonthlyDailyAttendanceRecords,
  saveDailyAttendance,
} from '../../../services/firestore/homeroomAttendance';

export const homeroomAttendanceRepository: HomeroomAttendanceRepository = {
  getAllForClass: (uid, classId, ayId) => getAllDailyAttendanceRecordsForClass(uid, classId, ayId),
  getByDate: (uid, ayId, classId, date) => getDailyAttendanceRecords(uid, ayId, classId, date),
  getSession: (uid, ayId, classId, date) => getDailyAttendanceSession(uid, ayId, classId, date),
  getMonthly: (uid, ayId, classId, ym) => getMonthlyDailyAttendanceRecords(uid, ayId, classId, ym),
  saveDailyAttendance: (uid, ayId, classId, className, date, items, notes) =>
    saveDailyAttendance(uid, ayId, classId, className, date, items, notes),
};
