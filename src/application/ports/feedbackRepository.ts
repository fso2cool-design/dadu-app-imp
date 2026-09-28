export interface FeedbackRepository {
  getAll(uid: string): Promise<any[]>;
  create(uid: string, data: any): Promise<any>;
  update(uid: string, id: string, data: any): Promise<void>;
  delete(uid: string, id: string): Promise<void>;
}
