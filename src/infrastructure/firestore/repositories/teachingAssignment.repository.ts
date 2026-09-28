import type { TeachingAssignmentRepository } from '../../../application/ports/teachingAssignmentRepository';
import * as T from '../../../services/firestore/teachingAssignments';

export const teachingAssignmentRepository: TeachingAssignmentRepository = {
  checkUsage: (uid, id) => T.checkTeachingAssignmentUsage(uid, id),
  getAll: (uid, ay) => T.getTeachingAssignments(uid, ay),
  create: (uid, data) => T.createTeachingAssignment(uid, data),
  update: (uid, id, data) => T.updateTeachingAssignment(uid, id, data),
  archive: (uid, id) => T.archiveTeachingAssignment(uid, id),
  unarchive: (uid, id, aay) => T.unarchiveTeachingAssignment(uid, id, aay),
  canDelete: (uid, id) => T.canDeleteTeachingAssignment(uid, id),
  delete: (uid, id) => T.deleteTeachingAssignment(uid, id),
};
