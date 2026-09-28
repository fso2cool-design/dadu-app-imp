// Simple manual DI container for Phase 3 - no framework
import { studentRepository } from '../../infrastructure/firestore/repositories/student.repository';
import { academicYearRepository } from '../../infrastructure/firestore/repositories/academicYear.repository';
import { classRepository } from '../../infrastructure/firestore/repositories/class.repository';
import { subjectRepository } from '../../infrastructure/firestore/repositories/subject.repository';
import { teachingAssignmentRepository } from '../../infrastructure/firestore/repositories/teachingAssignment.repository';
import { enrollmentRepository } from '../../infrastructure/firestore/repositories/enrollment.repository';
import { meetingRepository } from '../../infrastructure/firestore/repositories/meeting.repository';
import { attendanceRepository } from '../../infrastructure/firestore/repositories/attendance.repository';
import { assessmentRepository } from '../../infrastructure/firestore/repositories/assessment.repository';
import { teacherAttendanceRepository } from '../../infrastructure/firestore/repositories/teacherAttendance.repository';
import { userRepository } from '../../infrastructure/firestore/repositories/user.repository';
import { settingsRepository } from '../../infrastructure/firestore/repositories/settings.repository';
import { homeroomAttendanceRepository } from '../../infrastructure/firestore/repositories/homeroomAttendance.repository';
import { studentNoteRepository } from '../../infrastructure/firestore/repositories/studentNote.repository';
import { sharedReportRepository } from '../../infrastructure/firestore/repositories/sharedReport.repository';
import { studentCustomFieldRepository } from '../../infrastructure/firestore/repositories/studentCustomField.repository';
import { feedbackRepository } from '../../infrastructure/firestore/repositories/feedback.repository';
import { backupRepository, diagnosticsRepository, deduplicationRepository, relationshipRecoveryRepository, classScheduleRepository, onboardingRepository } from '../../infrastructure/firestore/repositories/misc.repository';
import { getUserPreferences, getAttendanceSettings } from '../../services/firestore/settings';
import { loadWorkspaceUseCase } from '../workspace/loadWorkspace.usecase';
import { checkHolidayUseCase } from '../attendance/checkHoliday.usecase';
import { searchStudentsUseCase } from '../students/searchStudents.usecase';
import { importStudentsUseCase } from '../students/importStudents.usecase';

export const container = {
  repos: {
    student: studentRepository,
    academicYear: academicYearRepository,
    class: classRepository,
    subject: subjectRepository,
    teachingAssignment: teachingAssignmentRepository,
    enrollment: enrollmentRepository,
    meeting: meetingRepository,
    attendance: attendanceRepository,
    assessment: assessmentRepository,
    teacherAttendance: teacherAttendanceRepository,
    user: userRepository,
    settings: settingsRepository,
    homeroomAttendance: homeroomAttendanceRepository,
    studentNote: studentNoteRepository,
    sharedReport: sharedReportRepository,
    studentCustomField: studentCustomFieldRepository,
    feedback: feedbackRepository,
    backup: backupRepository,
    diagnostics: diagnosticsRepository,
    deduplication: deduplicationRepository,
    relationshipRecovery: relationshipRecoveryRepository,
    classSchedule: classScheduleRepository,
    onboarding: onboardingRepository,
  },
  useCases: {
    loadWorkspace: (uid: string, profileSemester?: any) => loadWorkspaceUseCase({ uid, profileDefaultSemester: profileSemester }, {
      academicYearRepo: academicYearRepository,
      classRepo: classRepository,
      subjectRepo: subjectRepository,
      teachingAssignmentRepo: teachingAssignmentRepository,
      getUserPreferences,
      getAttendanceSettings,
    }),
    checkHoliday: checkHolidayUseCase,
    searchStudents: (uid: string, query: string) => searchStudentsUseCase({ uid, query }, { studentRepo: studentRepository }),
    importStudents: (input: Parameters<typeof importStudentsUseCase>[0]) => importStudentsUseCase(input, { studentRepo: studentRepository, enrollmentRepo: enrollmentRepository }),
  },
};
