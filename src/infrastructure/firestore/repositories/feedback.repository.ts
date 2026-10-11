import type { FeedbackRepository } from '../../../application/ports/feedbackRepository';
import type { FeedbackStatus } from '../../../types';
import * as F from '../../../services/firestore/feedbacks';

export const feedbackRepository: FeedbackRepository = {
  getAll: () => F.getAllFeedbacks(),
  getUnreadCount: () => F.getUnreadFeedbackCount(),
  updateStatus: (id, status, reply) => F.updateFeedbackStatus(id, status as FeedbackStatus, reply),
  delete: (id) => F.deleteFeedback(id),
  create: (data) => F.createFeedback(data as Parameters<typeof F.createFeedback>[0]),
};
