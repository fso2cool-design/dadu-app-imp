import type { Student, ClassItem, AcademicYear, TeachingAssignment } from '../../types';

export function createTestStudent(overrides?: Partial<Student>): Student {
  return {
    id: 'student-test-1',
    nis: '1001',
    nisn: '0012345678',
    fullName: 'Ahmad Dahlan',
    gender: 'L',
    status: 'ACTIVE',
    birthPlace: 'Yogyakarta',
    birthDate: '2010-01-01',
    religion: 'ISLAM',
    parentName: 'K.H. Abu Bakar',
    parentPhone: '081234567890',
    address: 'Kauman, Yogyakarta',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

export function createTestClass(overrides?: Partial<ClassItem>): ClassItem {
  return {
    id: 'class-test-1',
    name: 'Kelas 7A',
    academicYearId: 'ay-2024-2025',
    gradeLevel: '7',
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

export function createTestAcademicYear(overrides?: Partial<AcademicYear>): AcademicYear {
  return {
    id: 'ay-2024-2025',
    label: '2024/2025',
    startYear: 2024,
    endYear: 2025,
    currentSemester: 'GANJIL',
    isActive: true,
    isArchived: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

export function createTestTeachingAssignment(overrides?: Partial<TeachingAssignment>): TeachingAssignment {
  return {
    id: 'assignment-test-1',
    academicYearId: 'ay-2024-2025',
    semester: 'GANJIL',
    classId: 'class-test-1',
    subjectId: 'subject-test-1',
    teacherId: 'teacher-test-1',
    className: 'Kelas 7A',
    subjectName: 'Fikih',
    subjectCode: 'FIK-7',
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}
