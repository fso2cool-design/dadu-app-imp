import type { SubjectRepository } from '../../../application/ports/subjectRepository';
import * as S from '../../../services/firestore/subjects';

export const subjectRepository: SubjectRepository = {
  getAll: (uid) => S.getSubjects(uid),
  create: (uid, data) => S.createSubject(uid, data),
  update: (uid, id, data) => S.updateSubject(uid, id, data),
  archive: (uid, id) => S.archiveSubject(uid, id),
  unarchive: (uid, id) => S.unarchiveSubject(uid, id),
  canDelete: (uid, id) => S.canDeleteSubject(uid, id),
  delete: (uid, id) => S.deleteSubject(uid, id),
};
