import type { AcademicYearRepository } from '../ports/academicYearRepository';
import type { ClassRepository } from '../ports/classRepository';
import type { SubjectRepository } from '../ports/subjectRepository';
import type { TeachingAssignmentRepository } from '../ports/teachingAssignmentRepository';
import type { AcademicYear, ClassItem, Subject, TeachingAssignment, SemesterType, AttendanceSettings } from '../../types';
import { DEFAULT_ATTENDANCE_SETTINGS } from '../../services/firestore/settings';

export interface LoadWorkspaceDeps {
  academicYearRepo: AcademicYearRepository;
  classRepo: ClassRepository;
  subjectRepo: SubjectRepository;
  teachingAssignmentRepo: TeachingAssignmentRepository;
  // settings injected as functions to avoid circular port dep; optional
  getUserPreferences?: (uid: string) => Promise<any>;
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
  let prefs: any = null;
  if (deps.getAttendanceSettings) {
    try { attSettings = await deps.getAttendanceSettings(uid); } catch {}
  }
  if (deps.getUserPreferences) {
    try { prefs = await deps.getUserPreferences(uid); } catch {}
  }

  const sortedAssignments = [...assignmentsList].sort((a, b) =>
    (a.className || '').localeCompare(b.className || '', undefined, { numeric: true, sensitivity: 'base' })
  );

  let currentActiveYear: AcademicYear | null = yearsList.find(y => y.isActive) || yearsList[0] || null;
  if (prefs?.defaultAcademicYearId) {
    const found = yearsList.find(y => y.id === prefs.defaultAcademicYearId);
    if (found) currentActiveYear = found;
  }

  const sem: SemesterType = prefs?.defaultSemester || currentActiveYear?.currentSemester || profileDefaultSemester || 'GANJIL';

  let initialClassId = '';
  if (classesList.length > 0) {
    const activeClasses = classesList.filter(c => (!currentActiveYear || c.academicYearId === currentActiveYear.id) && !c.isArchived);
    const fallbackActive = classesList.filter(c => !c.isArchived);
    const prefClass = activeClasses.find(c => c.id === prefs?.defaultClassId);
    initialClassId = prefClass ? prefClass.id : (activeClasses[0]?.id || fallbackActive[0]?.id || classesList[0].id);
  }

  let selectedAssignment: TeachingAssignment | null = null;
  if (sortedAssignments.length > 0) {
    const activeAssignments = sortedAssignments.filter(a => (!currentActiveYear || a.academicYearId === currentActiveYear.id) && !a.isArchived && a.isActive !== false);
    const matchByClass = activeAssignments.find(a => a.classId === initialClassId);
    selectedAssignment = matchByClass || activeAssignments[0] || sortedAssignments[0] || null;
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
