import type { AssessmentRepository } from '../../../application/ports/assessmentRepository';
import * as A from '../../../services/firestore/assessments';

export const assessmentRepository: AssessmentRepository = {
  getAssessmentItems: (uid, opts) => A.getAssessmentItems(uid, opts),
  getAssessmentItemById: (uid, id) => A.getAssessmentItemById(uid, id),
  createAssessmentItem: (uid, data) => A.createAssessmentItem(uid, data),
  updateAssessmentItem: (uid, id, data) => A.updateAssessmentItem(uid, id, data),
  canDeleteAssessmentItem: (uid, id) => A.canDeleteAssessmentItem(uid, id),
  deleteAssessmentItem: (uid, id) => A.deleteAssessmentItem(uid, id),
  getScoresByItemIds: (uid, ids) => A.getScoresByAssessmentItemIds(uid, ids),
  saveScoresBatch: (uid, aid, scores) => A.saveScoresBatch(uid, aid, scores),
  saveMatrixScores: (uid, scores) => A.saveMatrixScores(uid, scores),
};
