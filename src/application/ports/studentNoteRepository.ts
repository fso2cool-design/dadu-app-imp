import type { StudentNote } from '../../types';

export interface StudentNoteRepository {
  getByStudent(uid: string, studentId: string): Promise<StudentNote[]>;
  getByClass(uid: string, academicYearId: string, classId: string): Promise<StudentNote[]>;
  create(uid: string, data: Omit<StudentNote, 'id' | 'createdAt' | 'updatedAt'>): Promise<StudentNote>;
  update(uid: string, id: string, data: Partial<Omit<StudentNote, 'id' | 'createdAt' | 'updatedAt'>>): Promise<void>;
  delete(uid: string, id: string): Promise<void>;
}
