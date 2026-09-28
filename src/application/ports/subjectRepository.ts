import type { Subject } from '../../types';

export interface SubjectRepository {
  getAll(uid: string): Promise<Subject[]>;
  create(uid: string, data: Omit<Subject, 'id' | 'createdAt' | 'updatedAt'>): Promise<Subject>;
  update(uid: string, id: string, data: Partial<Subject>): Promise<void>;
  archive(uid: string, id: string): Promise<void>;
  unarchive(uid: string, id: string): Promise<void>;
  canDelete(uid: string, id: string): Promise<{ canDelete: boolean; reason?: string }>;
  delete(uid: string, id: string): Promise<void>;
}
