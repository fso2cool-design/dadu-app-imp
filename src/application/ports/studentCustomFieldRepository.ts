import type { StudentCustomFieldDefinition } from '../../types';

export interface StudentCustomFieldRepository {
  getAll(uid: string): Promise<StudentCustomFieldDefinition[]>;
  create(uid: string, data: Omit<StudentCustomFieldDefinition, 'id' | 'createdAt' | 'updatedAt'>): Promise<StudentCustomFieldDefinition>;
  update(uid: string, id: string, data: Partial<Omit<StudentCustomFieldDefinition, 'id' | 'createdAt' | 'updatedAt'>>): Promise<void>;
  delete(uid: string, id: string): Promise<void>;
}
