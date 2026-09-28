import type { AttendanceRepository } from '../../../application/ports/attendanceRepository';
import * as A from '../../../services/firestore/attendance';

export const attendanceRepository: AttendanceRepository = {
  saveSubjectAttendance: (uid, payload) => A.saveSubjectAttendance(uid, payload),
  saveMeetingAttendance: (uid, mid, items) => A.saveMeetingAttendance(uid, mid, items),
  getByMeeting: (uid, mid) => A.getAttendanceRecordsByMeeting(uid, mid),
  getByMeetingIds: (uid, mids) => A.getAttendanceRecordsByMeetingIds(uid, mids),
  getByAssignment: (uid, ta, date) => A.getAttendanceRecordsByAssignment(uid, ta, date),
  getByDate: (uid, ta, date) => A.getAttendanceRecordsByDate(uid, ta, date),
  getByClassAndPeriod: (uid, cid, ay, sem) => A.getAttendanceRecordsByClassAndPeriod(uid, cid, ay, sem),
};
