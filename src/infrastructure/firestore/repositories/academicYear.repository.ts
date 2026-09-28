import type { AcademicYearRepository } from '../../../application/ports/academicYearRepository';
import * as A from '../../../services/firestore/academicYears';

export const academicYearRepository: AcademicYearRepository = {
  getAll: (uid) => A.getAcademicYears(uid),
  getActive: (uid) => A.getActiveAcademicYear(uid),
  create: (uid, data) => A.createAcademicYear(uid, data),
  checkUsage: (uid, id) => A.checkAcademicYearUsage(uid, id),
  update: (uid, id, data) => A.updateAcademicYear(uid, id, data),
  archive: (uid, id) => A.archiveAcademicYear(uid, id),
  unarchive: (uid, id) => A.unarchiveAcademicYear(uid, id),
  canDelete: (uid, id) => A.canDeleteAcademicYear(uid, id),
  delete: (uid, id) => A.deleteAcademicYear(uid, id),
};
