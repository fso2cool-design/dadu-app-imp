import type { StudentRepository } from '../ports/studentRepository';
import { buildStudentSearchTokens } from '../../domain/students/studentSearchTokens';

export interface SearchStudentsInput {
  uid: string;
  query: string; // raw user input
}

export async function searchStudentsUseCase(
  input: SearchStudentsInput,
  deps: { studentRepo: StudentRepository }
) {
  const q = input.query.trim();
  if (!q) return [];
  // exact identifier first (nis/nisn), then token
  // repo exposes searchByExactIdentifier and searchByNameToken via underlying service;
  // we delegate via any to keep port minimal for now
  const repo: any = deps.studentRepo;
  if (repo.searchByExactIdentifier) {
    const exact = await repo.searchByExactIdentifier(input.uid, q);
    if (exact && exact.length) return exact;
  }
  if (repo.searchByNameToken) {
    // build token to normalize
    const tokens = buildStudentSearchTokens(q, '');
    const tok = tokens[0] || q.toLowerCase();
    return repo.searchByNameToken(input.uid, tok);
  }
  // fallback: get all and filter in memory (dev)
  const all = await deps.studentRepo.getAll(input.uid);
  const lower = q.toLowerCase();
  return all.filter(s => s.fullName.toLowerCase().includes(lower) || s.nis?.toLowerCase().includes(lower) || s.nisn?.toLowerCase().includes(lower));
}
