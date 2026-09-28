import * as F from '../../../services/firestore/feedbacks';
export const feedbackRepository = {
  getAll: () => F.getAllFeedbacks(),
  getUnreadCount: () => F.getUnreadFeedbackCount(),
  updateStatus: (id:string, status:any, reply?:string) => F.updateFeedbackStatus(id, status, reply),
  delete: (id:string) => F.deleteFeedback(id),
  create: (data:any) => F.createFeedback(data),
  // legacy aliases
  getAllFeedbacks: () => F.getAllFeedbacks(),
  updateFeedbackStatus: (id:string, s:any, r?:string) => F.updateFeedbackStatus(id,s,r),
  deleteFeedback: (id:string) => F.deleteFeedback(id),
};
