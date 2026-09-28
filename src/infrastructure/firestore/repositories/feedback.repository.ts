import type { FeedbackRepository } from '../../../application/ports/feedbackRepository';
import * as F from '../../../services/firestore/feedbacks';
export const feedbackRepository: FeedbackRepository = {
  getAll: (uid) => (F as any).getFeedbacks?.(uid) ?? [],
  create: (uid,d) => (F as any).createFeedback?.(uid,d),
  update: (uid,id,d) => (F as any).updateFeedback?.(uid,id,d),
  delete: (uid,id) => (F as any).deleteFeedback?.(uid,id),
};
