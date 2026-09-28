import type { EnrollmentRepository } from '../../../application/ports/enrollmentRepository';
import * as E from '../../../services/firestore/enrollments';

export const enrollmentRepository: EnrollmentRepository = {
  getByClass: (uid, ay, cid, opts) => E.getEnrollmentsByClass(uid, ay, cid, opts),
  getByAcademicYear: (uid, ay) => E.getEnrollmentsByAcademicYear(uid, ay),
  create: (uid, data) => E.createEnrollment(uid, data),
  transfer: (uid, curId, targetCid, targetName, roll, reason) => E.transferStudentEnrollment(uid, curId, targetCid, targetName, roll, reason),
  update: (uid, id, data) => E.updateEnrollment(uid, id, data),
  archive: (uid, id, status) => E.archiveEnrollment(uid, id, status),
  canDelete: (uid, id) => E.canDeleteEnrollment(uid, id),
  delete: (uid, id) => E.deleteEnrollment(uid, id),
  batchEnroll: (uid, items) => E.batchEnrollStudents(uid, items as any),
  batchReorderRollNumbers: (uid, ids) => E.batchReorderRollNumbers(uid, ids),
};
