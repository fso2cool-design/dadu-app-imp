import { describe, it, expect } from 'vitest';
import {
  isAssignmentForSemester,
  filterAssignmentsForSemester,
  findMatchingCounterpart,
  resolveAssignmentOnSemesterSwitch,
} from './assignmentPolicy';
import type { TeachingAssignment } from '../../types';

describe('Domain Academic — assignmentPolicy', () => {
  const sampleGanjil: TeachingAssignment = {
    id: 'ta-ganjil-1',
    academicYearId: 'ay-2025',
    semester: 'GANJIL',
    classId: 'cls-7a',
    subjectId: 'sub-mtk',
    teacherId: 'teacher-1',
    isActive: true,
    isArchived: false,
    className: '7A',
    subjectName: 'Matematika',
    createdAt: null,
    updatedAt: null,
  };

  const sampleGenap: TeachingAssignment = {
    id: 'ta-genap-1',
    academicYearId: 'ay-2025',
    semester: 'GENAP',
    classId: 'cls-7a',
    subjectId: 'sub-mtk',
    teacherId: 'teacher-1',
    isActive: true,
    isArchived: false,
    className: '7A',
    subjectName: 'Matematika',
    createdAt: null,
    updatedAt: null,
  };

  describe('isAssignmentForSemester', () => {
    it('returns true when assignment matches active year and semester', () => {
      expect(isAssignmentForSemester(sampleGanjil, 'ay-2025', 'GANJIL')).toBe(true);
    });

    it('returns false when semester does not match', () => {
      expect(isAssignmentForSemester(sampleGanjil, 'ay-2025', 'GENAP')).toBe(false);
    });

    it('returns false when academic year does not match', () => {
      expect(isAssignmentForSemester(sampleGanjil, 'ay-other', 'GANJIL')).toBe(false);
    });

    it('returns false when assignment is archived', () => {
      const archived = { ...sampleGanjil, isArchived: true };
      expect(isAssignmentForSemester(archived, 'ay-2025', 'GANJIL')).toBe(false);
    });

    it('returns false when assignment is inactive (isActive === false)', () => {
      const inactive = { ...sampleGanjil, isActive: false };
      expect(isAssignmentForSemester(inactive, 'ay-2025', 'GANJIL')).toBe(false);
    });

    it('fails closed when assignment has no semester or undefined semester (legacy)', () => {
      const legacyWithoutSemester = { ...sampleGanjil, semester: undefined as any };
      expect(isAssignmentForSemester(legacyWithoutSemester, 'ay-2025', 'GANJIL')).toBe(false);
      expect(isAssignmentForSemester(legacyWithoutSemester, 'ay-2025', 'GENAP')).toBe(false);
    });

    it('returns false for null or undefined assignment', () => {
      expect(isAssignmentForSemester(null, 'ay-2025', 'GANJIL')).toBe(false);
      expect(isAssignmentForSemester(undefined, 'ay-2025', 'GANJIL')).toBe(false);
    });
  });

  describe('filterAssignmentsForSemester', () => {
    it('filters assignments strictly by academicYearId and semester', () => {
      const list = [sampleGanjil, sampleGenap];
      const ganjilOnly = filterAssignmentsForSemester(list, 'ay-2025', 'GANJIL');
      expect(ganjilOnly).toHaveLength(1);
      expect(ganjilOnly[0].id).toBe('ta-ganjil-1');

      const genapOnly = filterAssignmentsForSemester(list, 'ay-2025', 'GENAP');
      expect(genapOnly).toHaveLength(1);
      expect(genapOnly[0].id).toBe('ta-genap-1');
    });

    it('excludes assignments with missing semester from filtered result', () => {
      const legacy = { ...sampleGanjil, id: 'ta-legacy', semester: undefined as any };
      const list = [sampleGanjil, legacy];
      const result = filterAssignmentsForSemester(list, 'ay-2025', 'GANJIL');
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('ta-ganjil-1');
    });
  });

  describe('findMatchingCounterpart', () => {
    it('finds unique counterpart matching classId and subjectId in target semester', () => {
      const list = [sampleGanjil, sampleGenap];
      const counterpart = findMatchingCounterpart(list, sampleGanjil, 'GENAP', 'ay-2025');
      expect(counterpart).not.toBeNull();
      expect(counterpart?.id).toBe('ta-genap-1');
      expect(counterpart?.semester).toBe('GENAP');
    });

    it('returns null if no counterpart exists in target semester', () => {
      const list = [sampleGanjil];
      const counterpart = findMatchingCounterpart(list, sampleGanjil, 'GENAP', 'ay-2025');
      expect(counterpart).toBeNull();
    });

    it('returns null if multiple ambiguous counterparts exist', () => {
      const duplicateGenap: TeachingAssignment = {
        ...sampleGenap,
        id: 'ta-genap-2',
      };
      const list = [sampleGanjil, sampleGenap, duplicateGenap];
      const counterpart = findMatchingCounterpart(list, sampleGanjil, 'GENAP', 'ay-2025');
      expect(counterpart).toBeNull();
    });

    it('ignores inactive or archived counterparts', () => {
      const archivedGenap = { ...sampleGenap, isArchived: true };
      const list = [sampleGanjil, archivedGenap];
      const counterpart = findMatchingCounterpart(list, sampleGanjil, 'GENAP', 'ay-2025');
      expect(counterpart).toBeNull();
    });
  });

  describe('resolveAssignmentOnSemesterSwitch', () => {
    it('maintains assignment if it already belongs to target semester', () => {
      const list = [sampleGanjil, sampleGenap];
      const resolved = resolveAssignmentOnSemesterSwitch(list, sampleGanjil, 'GANJIL', 'ay-2025');
      expect(resolved?.id).toBe('ta-ganjil-1');
    });

    it('switches to unique counterpart on Ganjil -> Genap transition', () => {
      const list = [sampleGanjil, sampleGenap];
      const resolved = resolveAssignmentOnSemesterSwitch(list, sampleGanjil, 'GENAP', 'ay-2025');
      expect(resolved?.id).toBe('ta-genap-1');
    });

    it('returns null when counterpart is ambiguous or missing, forcing user to pick', () => {
      const otherClassGenap: TeachingAssignment = {
        ...sampleGenap,
        id: 'ta-genap-diff-class',
        classId: 'cls-8b',
      };
      const list = [sampleGanjil, otherClassGenap];
      const resolved = resolveAssignmentOnSemesterSwitch(list, sampleGanjil, 'GENAP', 'ay-2025');
      expect(resolved).toBeNull();
    });
  });
});
