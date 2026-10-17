import type { AcademicYearRepository } from '../ports/academicYearRepository';
import type { ClassRepository } from '../ports/classRepository';
import type { SubjectRepository } from '../ports/subjectRepository';
import type { TeachingAssignmentRepository } from '../ports/teachingAssignmentRepository';
import type { AcademicYear, ClassItem, Subject, TeachingAssignment, SemesterType, AttendanceSettings, UserPreferences } from '../../types';
import { filterAssignmentsForSemester } from '../../domain/academic/assignmentPolicy';

const DEFAULT_ATTENDANCE_SETTINGS: AttendanceSettings = { schoolDaysOption: 6, holidays: [] };

export interface LoadWorkspaceDeps {
  academicYearRepo: AcademicYearRepository;
  classRepo: ClassRepository;
  subjectRepo: SubjectRepository;
  teachingAssignmentRepo: TeachingAssignmentRepository;
  // settings injected as functions to avoid circular port dep; optional
  getUserPreferences?: (uid: string) => Promise<UserPreferences | null>;
  getAttendanceSettings?: (uid: string) => Promise<AttendanceSettings>;
}

export interface LoadWorkspaceInput {
  uid: string;
  profileDefaultSemester?: SemesterType;
}

export interface LoadWorkspaceResult {
  academicYears: AcademicYear[];
  activeAcademicYear: AcademicYear | null;
  activeSemester: SemesterType;
  classes: ClassItem[];
  subjects: Subject[];
  teachingAssignments: TeachingAssignment[];
  attendanceSettings: AttendanceSettings;
  selectedClassId: string;
  selectedAssignment: TeachingAssignment | null;
}

export async function loadWorkspaceUseCase(
  input: LoadWorkspaceInput,
  deps: LoadWorkspaceDeps
): Promise<LoadWorkspaceResult> {
  const { uid, profileDefaultSemester } = input;
  const { academicYearRepo, classRepo, subjectRepo, teachingAssignmentRepo } = deps;

  const [yearsList, classesList, subjectsList, assignmentsList] = await Promise.all([
    academicYearRepo.getAll(uid),
    classRepo.getAll(uid),
    subjectRepo.getAll(uid),
    teachingAssignmentRepo.getAll(uid),
  ]);

  let attSettings: AttendanceSettings = DEFAULT_ATTENDANCE_SETTINGS as AttendanceSettings;
  let prefs: UserPreferences | null = null;
  if (deps.getAttendanceSettings) {
    try { attSettings = await deps.getAttendanceSettings(uid); } catch {}
  }
  if (deps.getUserPreferences) {
    try { prefs = await deps.getUserPreferences(uid); } catch {}
  }

  const sortedAssignments = [...assignmentsList].sort((a, b) =>
    (a.className || '').localeCompare(b.className || '', undefined, { numeric: true, sensitivity: 'base' })
  );

  // 1. Master Academic Year with isActive === true is the Single Source of Truth
  const masterActiveYear = yearsList.find(y => y.isActive);
  let currentActiveYear: AcademicYear | null = masterActiveYear || null;

  // 2. Legacy fallback ONLY when no valid active master year exists
  if (!currentActiveYear && yearsList.length > 0) {
    if (prefs?.defaultAcademicYearId) {
      const found = yearsList.find(y => y.id === prefs.defaultAcademicYearId);
      if (found) currentActiveYear = found;
    }
    if (!currentActiveYear) {
      currentActiveYear = yearsList[0];
    }
  }

  // 3. Master currentSemester on the active year is the Single Source of Truth
  // Stale preferences or profile defaults MUST NOT override an active master year's semester
  const sem: SemesterType = currentActiveYear?.currentSemester || prefs?.defaultSemester || profileDefaultSemester || 'GANJIL';

  let initialClassId = '';
  if (classesList.length > 0) {
    const activeClasses = classesList.filter(c => (!currentActiveYear || c.academicYearId === currentActiveYear.id) && !c.isArchived);
    const fallbackActive = classesList.filter(c => !c.isArchived);
    const prefClass = activeClasses.find(c => c.id === prefs?.defaultClassId);
    initialClassId = prefClass ? prefClass.id : (activeClasses[0]?.id || fallbackActive[0]?.id || classesList[0].id);
  }

  let selectedAssignment: TeachingAssignment | null = null;
  if (sortedAssignments.length > 0) {
    const activeAssignments = filterAssignmentsForSemester(
      sortedAssignments,
      currentActiveYear?.id,
      sem
    );
    const matchByClass = activeAssignments.find(a => a.classId === initialClassId);
    selectedAssignment = matchByClass || activeAssignments[0] || null;
  }

  return {
    academicYears: yearsList,
    activeAcademicYear: currentActiveYear,
    activeSemester: sem,
    classes: classesList,
    subjects: subjectsList,
    teachingAssignments: sortedAssignments,
    attendanceSettings: attSettings,
    selectedClassId: initialClassId,
    selectedAssignment,
  };
}
