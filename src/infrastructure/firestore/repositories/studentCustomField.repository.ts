import type { StudentCustomFieldRepository } from '../../../application/ports/studentCustomFieldRepository';
import * as S from '../../../services/firestore/studentCustomFields';

export const studentCustomFieldRepository: StudentCustomFieldRepository = {
  getAll: (uid: string) => S.getStudentCustomFields(uid),
  create: (uid: string, data) => S.createStudentCustomField(uid, data),
  update: (uid: string, id: string, data) => S.updateStudentCustomField(uid, id, data),
  delete: (uid: string, id: string) => S.deleteStudentCustomField(uid, id),
};
