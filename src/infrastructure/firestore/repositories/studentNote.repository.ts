import type { StudentNoteRepository } from '../../../application/ports/studentNoteRepository';
import * as S from '../../../services/firestore/studentNotes';

export const studentNoteRepository: StudentNoteRepository = {
  getByStudent: (uid, studentId) => S.getStudentNotesByStudent(uid, studentId),
  getByClass: (uid, academicYearId, classId) => S.getStudentNotesByClass(uid, academicYearId, classId),
  create: (uid, data) => S.createStudentNote(uid, data),
  update: (uid, id, data) => S.updateStudentNote(uid, id, data),
  delete: (uid, id) => S.deleteStudentNote(uid, id),
};
