import * as S from '../../../services/firestore/studentNotes';
export const studentNoteRepository = {
  getByStudent: S.getStudentNotesByStudent,
  getByClass: S.getStudentNotesByClass,
  create: S.createStudentNote,
  update: S.updateStudentNote,
  delete: S.deleteStudentNote,
};
