import type { AssessmentRepository } from '../../../application/ports/assessmentRepository';
import * as A from '../../../services/firestore/assessments';

export const assessmentRepository: AssessmentRepository = {
  getItems: (uid, opts) => A.getAssessmentItems(uid, opts),
  getItemById: (uid, id) => A.getAssessmentItemById(uid, id),
  createItem: (uid, data) => A.createAssessmentItem(uid, data),
  updateItem: (uid, id, data) => A.updateAssessmentItem(uid, id, data),
  canDeleteItem: (uid, id) => A.canDeleteAssessmentItem(uid, id),
  deleteItem: (uid, id) => A.deleteAssessmentItem(uid, id),
  getScoresByItemIds: (uid, ids) => A.getScoresByAssessmentItemIds(uid, ids),
  saveScoresBatch: (uid, aid, scores) => A.saveScoresBatch(uid, aid, scores),
  saveMatrixScores: (uid, scores) => A.saveMatrixScores(uid, scores),
};
