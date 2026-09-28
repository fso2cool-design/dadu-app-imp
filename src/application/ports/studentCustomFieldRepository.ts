export interface StudentCustomFieldRepository {
  getAll(uid: string): Promise<any[]>;
  saveAll(uid: string, fields: any[]): Promise<void>;
}
