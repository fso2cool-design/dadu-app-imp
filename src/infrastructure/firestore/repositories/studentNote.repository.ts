import type { StudentNoteRepository } from '../../../application/ports/studentNoteRepository';
import { getStudentNotesByStudent, createStudentNote } from '../../../services/firestore/studentNotes';
export const studentNoteRepository: StudentNoteRepository = {
  getByStudent: (uid, sid) => getStudentNotesByStudent(uid, sid),
  create: (uid, data) => createStudentNote(uid, data as any),
};
