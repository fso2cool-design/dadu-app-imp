# Architecture — Layered (dadu-app-imp)

## Layers
```
domain/                pure TS, no I/O, rules: student policy, attendance, grading, enrollment
application/
  ports/               interfaces (Repository, UseCase deps), container.ts DI
  */*.usecase.ts       orchestration, calls ports only
infrastructure/
  firestore/repositories/*.repository.ts  adapters → services/firestore/*
  (services/firestore → Firebase, to be phased behind ports)
hooks/                 thin DI consumers (useAttendance, useMeetingsDetailed, useSettings...)
features/              React pages/modals; import only container/hook/domain; never services/firestore
context/               WorkspaceContext, AuthContext — thin, delegate to container
```

## Rules
- `features/*` forbidden: `src/services/firestore` (enforced by `.dependency-cruiser.cjs`).
- `domain/*` forbidden: `infrastructure/services/firebase`.
- All Firestore access via `container.repos.*` or `container.useCases.*`.
- Remaining `// TODO port diagnostics/backup/deduplication` stubs exempt until ported; track in backlog.

## Container
`src/application/ports/container.ts` : `repos: student, academicYear, class, subject, teachingAssignment, enrollment, meeting, attendance, assessment, teacherAttendance, user, settings, homeroomAttendance, studentNote` + `useCases: loadWorkspace, checkHoliday, searchStudents, importStudents`.

## Status (2026-09-29)
- Thinned: ImportStudentsModal, LeggerReportPage, AttendanceReportPage, DashboardPage, Homeroom*, Grades*, TeachingClasses, Subjects/Classes, StudentProgressReportModal, SubjectAttendancePage, TransferClassModal (+ earlier batches: HomeroomStudentsPage, StudentsMasterPage partial, MeetingsJournalPage, SubjectAttendancePage, TeachingClassesPage, ImportStudentsModal, StudentFormModal, StudentReportsPage, SettingsPage)
- Pending heavy: StudentsMasterPage (1490 lines, partial), SettingsPage deep thin, RelationshipRecoverySection (diagnostics)
- TSC: green
- Depcruise: `features→services/firestore` error level

## Next
- Surgical thin StudentsMasterPage / SettingsPage one-method-at-a-time
- Port diagnostics/backup/customFields repos
- Add eslint boundaries as second fence
