import type { StudentNote } from '../../types';
export interface StudentNoteRepository {
  getByStudent(uid: string, studentId: string): Promise<StudentNote[]>;
  create(uid: string, data: Omit<StudentNote, 'id' | 'createdAt' | 'updatedAt'>): Promise<StudentNote>;
}
