import type { StudentCustomFieldRepository } from '../../../application/ports/studentCustomFieldRepository';
import * as S from '../../../services/firestore/studentCustomFields';
export const studentCustomFieldRepository: StudentCustomFieldRepository = {
  getAll: (uid:string) => S.getStudentCustomFields(uid),
  saveAll: async (_uid:string,_fields:any[])=>{ throw new Error('saveAll not supported'); },
  create: (uid:string, data:any) => S.createStudentCustomField(uid, data),
  update: (uid:string, id:string, data:any) => S.updateStudentCustomField(uid, id, data),
  delete: (uid:string, id:string) => S.deleteStudentCustomField(uid, id),
} as any;
