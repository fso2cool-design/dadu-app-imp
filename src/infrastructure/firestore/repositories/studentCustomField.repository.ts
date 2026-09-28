import type { StudentCustomFieldRepository } from '../../../application/ports/studentCustomFieldRepository';
import * as S from '../../../services/firestore/studentCustomFields';
export const studentCustomFieldRepository: StudentCustomFieldRepository = {
  getAll: (uid) => (S as any).getStudentCustomFields?.(uid) ?? [],
  saveAll: (uid,fields) => (S as any).saveStudentCustomFields?.(uid,fields) ?? (S as any).setStudentCustomFields?.(uid,fields),
};
