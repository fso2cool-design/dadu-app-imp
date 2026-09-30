# Layer 2 Architecture Audit Report: DADU Workspace

**Date:** 2026-09-30  
**Project:** DADU (Data Akademik & Database Utama) Workspace (`dadu-app-imp`)  
**Auditor:** Antigravity Autonomous Architecture Auditor  
**Audit Scope:** Layer 2 Architecture (Dependency Inversion, Ports & Adapters / Hexagonal Architecture, DI Container, Context Provider Order, Repository Boundary Enforcement)

---

## 1. Executive Summary

This read-only architecture audit evaluates the integrity of Layer 2 architecture within the DADU application. Specifically, it reviews compliance with:
- Hexagonal / Ports & Adapters architectural principles (Domain -> Application -> Infrastructure/Services separation)
- Manual DI Container (`src/application/ports/container.ts`) registration and usage
- Direct Firestore bypass detection across features and contexts
- Single Source of Truth design system principles (`no-dual-source.md`)
- Provider nesting order in `App.tsx`
- Circular dependencies and boundary cruiser enforcement (`.dependency-cruiser.cjs`)

### Key Metrics:
| Metric | Value | Status |
| :--- | :--- | :--- |
| **Modules Cruised** | 235 modules | Pass |
| **Dependencies Cruised** | 872 dependencies | Pass |
| **Depcruise Violations** | 0 violations | Pass |
| **Circular Dependencies** | 0 detected | Pass |
| **Direct Firestore Service Imports in Features** | 0 runtime (11 type-only) | Pass |
| **Direct Infrastructure Bypass in Features** | 1 instance (`DeduplicateStudentsModal.tsx`) | ⚠️ Warning (P1) |
| **Port vs Repository Implementation Drift** | 11 ports disconnected / drifted | ⚠️ Warning (P1) |
| **TypeScript Typecheck (`tsc --noEmit`)** | 0 errors | Pass |
| **Biome Lint (`biome lint`)** | 0 errors (218 files) | Pass |
| **Unit Test Suite (`vitest run`)** | 20 passed, 1 failed (2/111 tests fail in `users.test.ts`) | ⚠️ Attention (P1) |

---

## 2. Dependency Graph Summary

Running `depcruise src --config .dependency-cruiser.cjs --output-type err-long` yielded:
```text
✔ no dependency violations found (235 modules, 872 dependencies cruised)
```

### Configured Rules in `.dependency-cruiser.cjs`:
1. `features-no-direct-firestore-services` (severity: `error`): Features must not import `services/firestore` directly (must use `container.repos`). Allows `type-only` imports.
2. `hooks-no-direct-firestore-services` (severity: `error`): Hooks must not import `services/firestore` directly. Allows `type-only` imports.
3. `domain-no-infra` (severity: `error`): Domain must stay pure; cannot import `infrastructure`, `services`, or `firebase`.
4. `no-circular` (severity: `warn`): Circular dependencies are forbidden.

### Identified Boundary Enforcement Gap:
- `.dependency-cruiser.cjs` forbids `src/features` from importing `src/services/firestore`, but **does NOT** forbid `src/features` from importing `src/infrastructure/firestore/repositories`.
- Consequently, features can import directly from repository implementations in `src/infrastructure` without triggering depcruise errors, circumventing the DI container (`container.repos`).

---

## 3. Provider Order Verification in App.tsx

### Provider Hierarchy:
```tsx
<ErrorBoundary isRoot fallbackTitle="Terjadi Kendala Aplikasi">
  <BrowserRouter>
    <AuthProvider>
      <WorkspaceProvider>
        <DesignSystemProvider>
          <ThemeProvider>
            <ToastProvider>
              <MainApp />
            </ToastProvider>
          </ThemeProvider>
        </DesignSystemProvider>
      </WorkspaceProvider>
    </AuthProvider>
  </BrowserRouter>
</ErrorBoundary>
```

### Verification & Rationale:
1. **`ErrorBoundary (isRoot)`**: Positioned at root level. Safely intercepts runtime errors from routing, authentication, and child component render trees.
2. **`BrowserRouter`**: Top-level routing context. Provides URL and history hooks (`useNavigate`, `useLocation`, `useSearchParams`) required by downstream contexts and pages.
3. **`AuthProvider`**:
   - Manages Firebase Authentication state (`useAuth`).
   - Uses `container.repos.user` to fetch and initialize `UserProfile`.
   - Placed above `WorkspaceProvider` and `DesignSystemProvider`.
4. **`WorkspaceProvider`**:
   - Calls `useAuth()` to retrieve `user.uid` for loading academic years, classes, subjects, and assignments via `container.repos`.
   - Correctly nested inside `AuthProvider`.
5. **`DesignSystemProvider`**:
   - Calls `useAuth()` to synchronize `designSystemPreference` from the user's profile and `localStorage`.
   - Owns DOM attributes (`data-design-system`, `data-theme`) and `--ds-*` CSS tokens as the single source of truth.
   - Correctly nested inside `AuthProvider`.
6. **`ThemeProvider`**:
   - Acts as a pure shim/alias over `DesignSystemContext` in compliance with `no-dual-source.md`.
   - Calls `useDesignSystem()`. Holds no independent state and issues no localStorage or Firestore writes.
   - Correctly nested inside `DesignSystemProvider`.
7. **`ToastProvider`**:
   - Independent UI notification provider. Listens to window custom events (`dadu:toast`).
   - Nesting position is valid and does not depend on downstream state.

**Verdict:** The provider tree is strictly hierarchical, unidirectional, and free of parent-child inversion defects.

---

## 4. Direct Firestore & Infrastructure Bypass List

### Direct Runtime Firestore Imports:
- **`src/features`**: **None**. All 11 imports referencing `../../services/firestore/*` are strictly type-only (`import type { ... }`).
- **`src/context`**: **None**. No imports from `services/firestore`.
- **`src/components`**: **None**.
- **`src/routes`**: **None**.

### Type-Only Imports in Features (Acceptable, but can be decoupled):
- `src/features/onboarding/OnboardingWizard.tsx`: `import type { OnboardingData } from '../../services/firestore/onboarding'`
- `src/features/admin/AdminUserManagementPage.tsx`: `import type { OrphanResidualItem, UserStorageStats } from '../../services/firestore/users'`
- `src/features/homeroom/HomeroomDailyAttendancePage.tsx`: `import type { SaveDailyAttendanceItem } from '../../services/firestore/homeroomAttendance'`
- `src/features/master/ClassesPage.tsx`: `import type { ClassUsageSummary } from '../../services/firestore/classes'`
- `src/features/master/TeachingAssignmentsPage.tsx`: `import type { TeachingAssignmentUsageSummary } from '../../services/firestore/teachingAssignments'`
- `src/features/master/AcademicYearsPage.tsx`: `import type { AcademicYearUsageSummary } from '../../services/firestore/academicYears'`
- `src/features/teacher/SubjectAttendancePage.tsx`: `import type { SaveAttendanceItem } from '../../services/firestore/attendance'`
- `src/features/teacher/SubjectAttendanceModal.tsx`: `import type { SaveAttendanceItem } from '../../services/firestore/attendance'`
- `src/features/settings/SettingsPage.tsx`: `import type { DatabaseStatistics, DatabaseBackup, ResetSemesterScope, ResetSemesterSummary } from '../../services/firestore/backup'`
- `src/features/students/StudentFormModal.tsx`: `import type { StudentUsageSummary } from '../../services/firestore/students'`
- `src/features/settings/RelationshipRecoverySection.tsx`: `import type { DiagnosticResult, IntegrityIssue } from '../../services/firestore/diagnostics'`

### Direct Infrastructure Bypasses (Anomalies):
1. **`src/features/students/DeduplicateStudentsModal.tsx` (Lines 16-21)**:
   ```ts
   import { 
     scanDuplicateStudents, 
     executeZeroResidueDeduplication, 
     DeduplicationScanResult, 
     DeduplicationExecutionResult 
   } from '../../infrastructure/firestore/repositories/misc.repository';
   ```
   *Violation:* Directly imports concrete repository functions from infrastructure instead of dispatching through `container.repos.deduplication`.
2. **`src/infrastructure/firestore/repositories/misc.repository.ts` (Lines 35-37)**:
   ```ts
   // re-export for direct imports
   export const scanDuplicateStudents = Dup.scanDuplicateStudents;
   export const executeZeroResidueDeduplication = Dup.executeZeroResidueDeduplication;
   ```
   *Violation:* Anti-pattern explicitly providing direct exports intended to bypass the DI container.
3. **`src/context/WorkspaceContext.tsx` (Line 5)**:
   ```ts
   import { DEFAULT_ATTENDANCE_SETTINGS } from '../infrastructure/firestore/repositories/settings.repository';
   ```
   *Violation:* Context imports constants directly from an infrastructure repository rather than from a domain policy or types module.

---

## 5. Port vs. Repository Implementation Drift

A comparison of all 23 port interfaces in `src/application/ports/` against their implementations in `src/infrastructure/firestore/repositories/` revealed significant architectural drift.

### 5.1 The "Misc Repository" Disconnect (Severe Drift)
The DI container groups 6 domains under `misc.repository.ts`:
- `backupRepository`
- `diagnosticsRepository`
- `deduplicationRepository`
- `relationshipRecoveryRepository`
- `classScheduleRepository`
- `onboardingRepository`

In `src/application/ports/`, each has an individual port file, but **none** of these ports are implemented or imported by `misc.repository.ts`:

| Port Interface | Defined in Port | Actual Impl in `misc.repository.ts` | Status |
| :--- | :--- | :--- | :--- |
| `BackupRepository` | `exportAll(uid)`, `importAll(uid, data)` | `exportFullDatabase`, `importFullDatabase`, `getDatabaseStatistics`, `resetSemesterData`, `previewSemesterReset` | **Mismatched** |
| `DiagnosticsRepository` | `run(uid)` | `runIntegrityAudit` | **Mismatched** |
| `DeduplicationRepository` | `findDuplicates(uid)`, `merge(uid, ids)` | `scanDuplicateStudents`, `executeZeroResidueDeduplication` | **Mismatched** |
| `RelationshipRecoveryRepository`| `scan(uid)`, `recover(uid, data)` | `findStudentCandidatesByNisn`, `relinkEnrollmentClass`, `relinkStudentRelationship` | **Mismatched** |
| `ClassScheduleRepository` | `getAll(uid, classId)`, `save(uid, data)` | `getScheduleDocId`, `getClassSchedule`, `saveClassSchedule`, `deleteClassSchedule` | **Mismatched** |
| `OnboardingRepository` | `getStatus(uid)`, `complete(uid)` | `submitOnboarding` | **Mismatched** |

### 5.2 Unbound Standalone Repositories
The following repositories do not declare or type-check their exported objects against their corresponding port interfaces:
1. **`feedback.repository.ts`**: Does not implement `FeedbackRepository`.
   - Port defines: `getAll(uid)`, `create(uid, data)`, `update(uid, id, data)`, `delete(uid, id)`
   - Impl defines: `getAll()` (no `uid`), `getUnreadCount()`, `updateStatus(id, status, reply)`, `delete(id)`, `create(data)`
2. **`homeroomAttendance.repository.ts`**: Does not implement `HomeroomAttendanceRepository`.
   - Port defines only: `getAllForClass(uid, classId, academicYearId)`
   - Impl defines: `getAllForClass`, `getByDate`, `getAllDailyForClass`, `getSession`, `getDailySession`, `getMonthly`, `saveDailyAttendance`
3. **`settings.repository.ts`**: Does not implement `SettingsRepository`.
   - Port defines: `get(uid)`, `save(uid, data)`
   - Impl defines granular methods: `getSchoolSettings`, `saveSchoolSettings`, `getDocumentSettings`, `saveDocumentSettings`, `getUserPreferences`, `saveUserPreferences`, `getAttendanceSettings`, `saveAttendanceSettings`, plus aliases
4. **`sharedReport.repository.ts`**: Does not implement `SharedReportRepository`.
   - Port defines generic CRUD (`getAll`, `getById`, `create`, `update`, `delete`)
   - Impl defines token/share methods (`create`, `getByToken`, `decrypt`, `incrementView`, `getUserReports`, `revoke`, `delete`, `generateToken`)
5. **`studentNote.repository.ts`**: Does not implement `StudentNoteRepository`.
   - Port defines: `getByStudent`, `create`
   - Impl defines: `getByStudent`, `getByClass`, `create`, `update`, `delete`

### 5.3 Inverted Type Dependencies in Ports (Inward Leak)
In Clean Architecture, ports must not depend on lower-level infrastructure or service implementations. However, several ports import types directly from `src/services/firestore/*`:
- `src/application/ports/attendanceRepository.ts` -> imports `SaveAttendanceItem`, `SaveSubjectAttendancePayload` from `../../services/firestore/attendance`
- `src/application/ports/assessmentRepository.ts` -> imports `AssessmentFilterOptions`, `MatrixScoreInput` from `../../services/firestore/assessments`
- `src/application/ports/studentRepository.ts` -> imports & re-exports `StudentUsageSummary` from `../../services/firestore/students`
- `src/application/ports/teacherAttendanceRepository.ts` -> imports `SaveTeacherAttendancePayload` from `../../services/firestore/teacherAttendance`

### 5.4 High Incidence of `(container.repos as any)` Casting
Because port contracts drifted from repository implementations, multiple feature components bypass TypeScript type checks via `as any`:
- `src/features/admin/AdminUserManagementPage.tsx`: `const _user = (container.repos as any).user;`
- `src/features/admin/AdminUserManagementPage.tsx`: `(container.repos as any).feedback.getUnreadCount...`
- `src/features/admin/AdminFeedbackTab.tsx`: `const _fb = (container.repos as any).feedback;`
- `src/features/master/TeachingAssignmentsPage.tsx`: `const taRepo = container.repos.teachingAssignment as any;`
- `src/features/master/SubjectsPage.tsx`: `container.repos.subject as any`
- `src/features/reports/AttendanceReportPage.tsx`: `(container.repos.attendance as any).getByMeetingIds`
- `src/infrastructure/firestore/repositories/studentCustomField.repository.ts`: Exported with `} as any;` and defines stub `saveAll: async () => { throw new Error('saveAll not supported'); }`

---

## 6. Circular Dependencies

- **Depcruise Check**: Checked with `{ name: 'no-circular', severity: 'warn', from: {}, to: { circular: true } }`. **0 circular dependencies detected**.
- **AST / Grep Check**: Checked for cross-boundary loops across `context`, `features`, and `services`. **0 cycles found**.

---

## 7. Issue Classification (P0 / P1 / P2)

### P0 (Critical / Blockers)
*None*. The application builds cleanly, typecheck passes (`tsc --noEmit`), biome linter passes, and depcruise boundary checks pass with 0 errors.

---

### P1 (High Priority / Architectural Integrity Risks)
1. **Direct Infrastructure Bypass in `DeduplicateStudentsModal.tsx`**:
   - Imports concrete functions `scanDuplicateStudents` and `executeZeroResidueDeduplication` directly from `src/infrastructure/firestore/repositories/misc.repository` instead of using `container.repos.deduplication`.
2. **`misc.repository.ts` Anti-Pattern Re-Exports**:
   - Lines 35-37 contain `// re-export for direct imports`, undermining the DI container pattern.
3. **Severe Port vs. Implementation Divergence in `misc.repository.ts`**:
   - 6 port interfaces (`BackupRepository`, `DiagnosticsRepository`, `DeduplicationRepository`, `RelationshipRecoveryRepository`, `ClassScheduleRepository`, `OnboardingRepository`) are completely disconnected from `misc.repository.ts`.
4. **Unbound Repository Implementations**:
   - 5 repositories (`feedback`, `homeroomAttendance`, `settings`, `sharedReport`, `studentNote`) do not implement their corresponding port interfaces in `src/application/ports/`.
5. **Prevalence of `(container.repos as any)` Type Escapes in Features**:
   - Components in `admin`, `master`, and `reports` bypass container types with `as any` because the port signatures do not expose the methods used by the UI.
6. **Unit Test Failure in `users.test.ts`**:
   - Vitest test `createUserProfile` fails (`Cannot read properties of undefined (reading 'exists')`) due to a mismatch between mock Firestore document snapshot and the new `existing.exists()` guard introduced for `no-dual-source.md`.

---

### P2 (Medium Priority / Clean Architecture Debt)
1. **Incomplete Depcruise Boundaries**:
   - `.dependency-cruiser.cjs` only forbids `src/services/firestore` from being imported by features. It should also forbid imports from `src/infrastructure/**` to prevent direct repository bypasses.
2. **Inverted Type Dependencies in Ports**:
   - Ports in `src/application/ports/` import types directly from `src/services/firestore/*`. Types and DTOs should reside in `src/types/` or `src/domain/`.
3. **Infrastructure Import in `WorkspaceContext.tsx`**:
   - `DEFAULT_ATTENDANCE_SETTINGS` is imported from `infrastructure/firestore/repositories/settings.repository` rather than from `src/domain/attendance/` or `src/types/`.
4. **Unsupported Method Stub in `studentCustomField.repository.ts`**:
   - `saveAll` throws runtime exception `throw new Error('saveAll not supported')` to satisfy the port interface.
5. **Absence of Strongly Typed `Container` Interface**:
   - `src/application/ports/container.ts` exports an inferred object literal rather than implementing a typed `Container` interface contract.

---

## 8. Recommended Remediation Roadmap

1. **Step 1 (Depcruise Guard)**:
   Update `.dependency-cruiser.cjs` to add:
   ```javascript
   {
     name: 'features-no-direct-infra',
     severity: 'error',
     comment: 'features must not import infrastructure directly (use container.repos)',
     from: { path: '^src/features' },
     to: { path: '^src/infrastructure' }
   }
   ```
2. **Step 2 (Fix Direct Bypass)**:
   Refactor `src/features/students/DeduplicateStudentsModal.tsx` to use `container.repos.deduplication.scanDuplicateStudents` and `container.repos.deduplication.executeZeroResidueDeduplication`. Remove the re-exports from `misc.repository.ts`.
3. **Step 3 (Align Ports & Repositories)**:
   - Synchronize method signatures in `src/application/ports/` with the actual methods required by the application.
   - Bind repositories to their port interfaces (`export const feedbackRepository: FeedbackRepository = ...`).
   - Move shared DTO types out of `services/firestore` into `src/types` so ports do not depend on lower-level service files.
4. **Step 4 (Eliminate `as any` Casts)**:
   With updated port definitions, remove `(container.repos as any)` casts across `AdminUserManagementPage`, `AdminFeedbackTab`, `TeachingAssignmentsPage`, `SubjectsPage`, and `AttendanceReportPage`.
5. **Step 5 (Fix `users.test.ts` Mock)**:
   Update the unit test mock in `src/services/firestore/users.test.ts` so `getDoc` returns a mock snapshot with `exists: () => false` when user does not exist.
