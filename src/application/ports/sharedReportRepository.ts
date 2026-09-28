export interface SharedReportRepository {
  getAll(uid: string): Promise<any[]>;
  getById(uid: string, id: string): Promise<any | null>;
  create(uid: string, data: any): Promise<any>;
  update(uid: string, id: string, data: any): Promise<void>;
  delete(uid: string, id: string): Promise<void>;
}
