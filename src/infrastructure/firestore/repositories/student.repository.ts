import type { StudentRepository } from '../../../application/ports/studentRepository';
import * as S from '../../../services/firestore/students';

export const studentRepository: StudentRepository = {
  getAll: (uid, status) => S.getStudents(uid, status),
  getPaginated: (uid, opts) => S.getStudentsPaginated(uid, opts),
  getById: (uid, id) => S.getStudentById(uid, id),
  checkNisnAvailability: (uid, nisn, exc) => S.checkNisnAvailability(uid, nisn, exc),
  searchByExactIdentifier: (uid, q, opts) => S.searchStudentsByExactIdentifier(uid, q, opts as any),
  searchByNameToken: (uid, q, opts) => S.searchStudentsByNameToken(uid, q, opts as any),
  create: (uid, data) => S.createStudent(uid, data),
  update: (uid, id, data) => S.updateStudent(uid, id, data),
  checkUsage: (uid, id) => S.checkStudentUsage(uid, id),
  canDelete: (uid, id) => S.canDeleteStudent(uid, id),
  archive: (uid, id, status) => S.archiveStudent(uid, id, status),
  unarchive: (uid, id) => S.unarchiveStudent(uid, id),
  delete: (uid, id) => S.deleteStudent(uid, id),
  batchCreate: (uid, list) => S.batchCreateStudents(uid, list),
  atomicImport: (uid, list, cfg) => S.atomicImportStudentsWithEnrollment(uid, list as any, cfg as any),
};
 