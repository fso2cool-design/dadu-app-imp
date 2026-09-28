import type { TeacherAttendanceRepository } from '../../../application/ports/teacherAttendanceRepository';
import * as T from '../../../services/firestore/teacherAttendance';
export const teacherAttendanceRepository: TeacherAttendanceRepository = {
  getHomeroomAssignments: (uid, ay, sem, cid, inc) => T.getHomeroomTeachingAssignments(uid, ay, sem, cid, inc),
  getForDate: (uid, ay, sem, cid, date) => T.getTeacherAttendanceRecordsForDate(uid, ay, sem, cid, date),
  getMonthly: (uid, ay, sem, cid, ym) => T.getMonthlyTeacherAttendanceRecords(uid, ay, sem, cid, ym),
  save: (uid, payload) => T.saveTeacherAttendanceRecords(uid, payload),
  deleteForDate: (uid, ay, sem, cid, date) => T.deleteTeacherAttendanceForDate(uid, ay, sem, cid, date),
  getMonthlyAttendance: (uid, cid, ay, sem, y, m) => T.getTeacherMonthlyAttendance(uid, cid, ay, sem, y, m),
  saveMonthlyAttendance: (uid, rec) => T.saveTeacherMonthlyAttendance(uid, rec),
};
