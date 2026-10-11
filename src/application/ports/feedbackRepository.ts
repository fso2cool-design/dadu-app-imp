import type { FeedbackItem, FeedbackStatus } from '../../types';

export interface FeedbackRepository {
  getAll(): Promise<FeedbackItem[]>;
  getUnreadCount(): Promise<number>;
  updateStatus(id: string, status: FeedbackStatus | string, reply?: string): Promise<void>;
  delete(id: string): Promise<void>;
  create(data: Partial<FeedbackItem>): Promise<string>;
}
