import type { StudentRepository } from '../ports/studentRepository';
import type { Student } from '../../types';
import { buildStudentSearchTokens } from '../../domain/students/studentSearchTokens';

export interface SearchStudentsInput {
  uid: string;
  query: string; // raw user input
}

export async function searchStudentsUseCase(
  input: SearchStudentsInput,
  deps: { studentRepo: StudentRepository }
): Promise<Student[]> {
  const q = input.query.trim();
  if (!q) return [];

  // 1. Exact identifier first (NIS / NISN)
  const exact = await deps.studentRepo.searchByExactIdentifier(input.uid, q);
  if (exact && exact.length > 0) {
    return exact;
  }

  // 2. Token search for student name
  const tokens = buildStudentSearchTokens(q, '');
  const tok = tokens[0] || q.toLowerCase();
  return deps.studentRepo.searchByNameToken(input.uid, tok);
}
