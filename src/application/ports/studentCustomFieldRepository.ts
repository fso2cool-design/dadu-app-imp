export interface StudentCustomFieldRepository {
  getAll(uid: string): Promise<any[]>;
  saveAll(uid: string, fields: any[]): Promise<void>;
  create(uid: string, data:any): Promise<any>;
  update(uid: string, id:string, data:any): Promise<void>;
  delete(uid: string, id:string): Promise<void>;
}
