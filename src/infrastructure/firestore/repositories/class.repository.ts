import type { ClassRepository } from '../../../application/ports/classRepository';
import * as C from '../../../services/firestore/classes';

export const classRepository: ClassRepository = {
  getAll: (uid, ay) => C.getClasses(uid, ay),
  create: (uid, data) => C.createClass(uid, data),
  checkUsage: (uid, id) => C.checkClassUsage(uid, id),
  canDelete: (uid, id) => C.canDeleteClass(uid, id),
  update: (uid, id, data) => C.updateClass(uid, id, data),
  archive: (uid, id) => C.archiveClass(uid, id),
  unarchive: (uid, id, aay) => C.unarchiveClass(uid, id, aay),
  delete: (uid, id) => C.deleteClass(uid, id),
};
