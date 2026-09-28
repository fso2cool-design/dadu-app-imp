import { getAllDailyAttendanceRecordsForClass, getDailyAttendanceRecords, getDailyAttendanceSession, getMonthlyDailyAttendanceRecords, saveDailyAttendance } from '../../../services/firestore/homeroomAttendance';
export const homeroomAttendanceRepository = {
  getAllForClass: (uid:string, classId:string, ayId:string) => getAllDailyAttendanceRecordsForClass(uid, classId, ayId),
  getByDate: (uid:string, ayId:string, classId:string, date:string) => getDailyAttendanceRecords(uid, ayId, classId, date),
  getAllDailyForClass: (uid:string, classId:string, ayId:string) => getAllDailyAttendanceRecordsForClass(uid, classId, ayId),
  getSession: (uid:string, ayId:string, classId:string, date:string) => getDailyAttendanceSession(uid, ayId, classId, date),
  getDailySession: (uid:string, ayId:string, classId:string, date:string) => getDailyAttendanceSession(uid, ayId, classId, date),
  getMonthly: (uid:string, ayId:string, classId:string, ym:string) => getMonthlyDailyAttendanceRecords(uid, ayId, classId, ym),
  saveDailyAttendance: (uid:string, ayId:string, classId:string, className:string, date:string, items:any[], notes?:string) => saveDailyAttendance(uid, ayId, classId, className, date, items, notes),
};
