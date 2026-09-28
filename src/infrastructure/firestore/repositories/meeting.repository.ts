import type { MeetingRepository } from '../../../application/ports/meetingRepository';
import * as M from '../../../services/firestore/meetings';

export const meetingRepository: MeetingRepository = {
  getAll: (uid, opts) => M.getMeetings(uid, opts),
  getById: (uid, id) => M.getMeetingById(uid, id),
  create: (uid, data) => M.createMeeting(uid, data),
  update: (uid, id, data) => M.updateMeeting(uid, id, data),
  canDelete: (uid, id) => M.canDeleteMeeting(uid, id),
  delete: (uid, id) => M.deleteMeeting(uid, id),
  updateAttendanceSummary: (uid, mid, s) => M.updateMeetingAttendanceSummary(uid, mid, s),
};
