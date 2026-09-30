# DADU App — Layer 1 Code Quality Audit Report

**Audited Target**: `c:/Users/Administrator/Documents/ai/dadu/dadu-app-imp`  
**Application Version**: `2.3.0` (`ver. 2.3-JRA`)  
**Audit Scope**: Layer 1 — Code Quality, Static Typing, Linting, Architecture Boundaries, Anti-Slop, Token Conformance, and Dual-Source Invariants  
**Audit Mode**: Read-Only Source Inspection  
**Date**: 30 September 2026  

---

## 1. Executive Summary & Build Health

A full build, linting, and dependency architecture check was executed via `npm run check`:
```powershell
npm run check 2>&1 | Select-Object -Last 30
```
### Check Pipeline Output:
- **TypeScript (`tsc --noEmit`)**: **PASSED** (0 errors).
- **Biome Linter (`biome lint --diagnostic-level=error src`)**: **PASSED** (Checked 218 files, 0 errors).
- **Architecture Boundaries (`depcruise src --config .dependency-cruiser.cjs`)**: **PASSED** (235 modules, 872 dependencies cruised, 0 boundary violations).

> [!NOTE]
> While compiler and strict boundary linting pass without fatal errors, an in-depth code quality audit reveals significant technical debt across **any-casting**, **unmanaged timer lifecycles**, **duplicate domain/port types**, and **hardcoded design tokens** that bypass the new 3-tier design system (`brutalism`, `apple-glass`, `neo-skeuomorphic`).

---

## 2. Issues Summary Table

| Category | Total Count | Critical / P0 | Warning / P1 | Polish / P2 | Description |
| :--- | :---: | :---: | :---: | :---: | :--- |
| **Console Usage** | **137** | 3 | 134 | 0 | 0 `log`/`info`/`debug`, 137 `console.error` (3 silently swallowing errors). |
| **`any` Type Usage** | **430** | 0 | 430 | 0 | 60 in core types (timestamps/cursors), 147 in Firestore services, 180+ in UI components. |
| **TODO / FIXME / HACK / XXX** | **0** | 0 | 0 | 0 | Codebase is clean of pending markers. |
| **Hardcoded Hex Colors** | **583** | 0 | 77 | 506 | 506 arbitrary Tailwind hex classes (`bg-[#...]`, `text-[#...]`) bypassing design tokens; 77 inline hex styles. |
| **Timer Lifecycles (`setTimeout` / `setInterval`)** | **30** | 22 | 2 | 6 | 22 unmanaged `setTimeout` calls without cleanup (memory leak / unmounted state update risk). |
| **Hardcoded Limits & Magic Numbers** | **25** | 0 | 12 | 13 | Hardcoded batch limits (300/500), pagination page sizes (25), query limits. |
| **Duplicate Type Definitions** | **12 types** | 0 | 12 | 0 | 12 exported types/interfaces duplicated between domain, service, and repository port layers. |
| **Dual-Source & Context Invariants** | **4** | 2 | 2 | 0 | Dead `updateTheme` writing `themePreference`; un-guarded `localStorage.setItem` in `ChangeLogModal`; root container hardcoded bg. |
| **Hardcoded Tailwind Token Bypasses** | **100** | 0 | 100 | 0 | `bg-indigo-*`, `border-indigo-*`, `text-indigo-*`, `shadow-xl/2xl` overriding design system themes. |

---

## 3. Top 20 File Hotspots

Ranked by cumulative issue density (Console errors + `any` types + Hex hardcodes + Timer lifecycle issues + Token bypasses):

| # | File Path | Total Issues | Console | `any` | Hex Colors | Timers | Token Bypasses |
|---|:---|:---:|:---:|:---:|:---:|:---:|:---:|
| 1 | `src/features/teacher/SubjectAttendancePage.tsx` | **104** | 5 | 3 | 93 | 1 | 2 |
| 2 | `src/features/grades/GradesPage.tsx` | **92** | 6 | 13 | 70 | 3 | 0 |
| 3 | `src/types/index.ts` | **81** | 0 | 60 | 21 | 0 | 0 |
| 4 | `src/features/homeroom/HomeroomDailyAttendancePage.tsx` | **71** | 3 | 1 | 67 | 0 | 0 |
| 5 | `src/features/homeroom/HomeroomTeacherAttendancePage.tsx` | **62** | 3 | 3 | 56 | 0 | 0 |
| 6 | `src/features/settings/SettingsPage.tsx` | **50** | 8 | 18 | 22 | 2 | 0 |
| 7 | `src/features/students/StudentFormModal.tsx` | **50** | 2 | 3 | 45 | 0 | 0 |
| 8 | `src/features/homeroom/HomeroomClassSchedulePage.tsx` | **48** | 3 | 2 | 43 | 0 | 0 |
| 9 | `src/features/students/StudentCustomPrintModal.tsx` | **45** | 1 | 4 | 24 | 1 | 15 |
| 10 | `src/features/students/StudentsMasterPage.tsx` | **41** | 6 | 6 | 15 | 3 | 11 |
| 11 | `src/context/ThemeContext.tsx` | **37** | 0 | 2 | 35 | 0 | 0 |
| 12 | `src/features/teacher/MeetingsJournalPage.tsx` | **37** | 2 | 1 | 33 | 0 | 1 |
| 13 | `src/features/reports/ShareReportModal.tsx` | **33** | 2 | 4 | 26 | 1 | 0 |
| 14 | `src/features/homeroom/AddTeacherAttendanceModal.tsx` | **33** | 0 | 0 | 33 | 0 | 0 |
| 15 | `src/features/reports/LeggerReportPage.tsx` | **33** | 1 | 12 | 17 | 0 | 3 |
| 16 | `src/components/layout/Header.tsx` | **33** | 0 | 0 | 31 | 1 | 1 |
| 17 | `src/features/reports/GradesReportPage.tsx` | **31** | 1 | 5 | 14 | 0 | 10 |
| 18 | `src/features/students/ImportStudentsModal.tsx` | **30** | 3 | 3 | 14 | 1 | 9 |
| 19 | `src/features/homeroom/HomeroomDashboardPage.tsx` | **26** | 1 | 4 | 20 | 0 | 1 |
| 20 | `src/components/common/AttendanceHolidaysModal.tsx` | **26** | 1 | 0 | 25 | 0 | 0 |

---

## 4. Per-Category Findings & Line-by-Line Breakdown

### Category 1: Console Usage (`console.`)
- **Total Occurrences**: 137 (`console.error`: 137, `console.log`: 0, `console.info`: 0, `console.debug`: 0).
- **Pattern**: Direct `console.error` inside catch blocks across UI components and services without going through a central logging service or error-boundary report pipeline.

#### Critical Hotspots (Silent Swallowing or Bare Error Logs):
- `src/hooks/useHomeroomStudents.ts:20` — `} catch (e) { console.error(e); }` (silent swallowing, UI hangs in loading state)
- `src/hooks/useHomeroomStudents.ts:54` — `} catch (e) { console.error(e); }` (silent swallowing)
- `src/features/teacher/SubjectAttendancePage.tsx:510` — `} catch (e) { console.error(e); }`
- `src/features/settings/SettingsPage.tsx:282` — `} catch (e) { console.error(e); }`

#### Full Inventory of `console.error` Lines:
- **Admin**:
  - `src/features/admin/AdminUserManagementPage.tsx`: 164, 189, 208, 232, 258, 277, 289, 314, 327
  - `src/features/admin/AdminFeedbackTab.tsx`: 59, 83, 100
  - `src/features/admin/EditUserModal.tsx`: 91
- **Auth & Onboarding**:
  - `src/features/auth/AuthContext.tsx`: 64, 122
  - `src/features/auth/LoginPage.tsx`: 75
  - `src/features/onboarding/OnboardingWizard.tsx`: 103
- **Grades**:
  - `src/features/grades/GradesPage.tsx`: 195, 288, 319, 350, 366, 704
  - `src/features/grades/AssessmentItemModal.tsx`: 214
- **Homeroom**:
  - `src/features/homeroom/HomeroomClassSchedulePage.tsx`: 176, 401, 421
  - `src/features/homeroom/HomeroomDailyAttendancePage.tsx`: 186, 298, 370
  - `src/features/homeroom/HomeroomDashboardPage.tsx`: 103
  - `src/features/homeroom/HomeroomMonthlyAttendancePage.tsx`: 143
  - `src/features/homeroom/HomeroomNotesPage.tsx`: 121, 235, 258
  - `src/features/homeroom/HomeroomStudentsPage.tsx`: 121, 145, 249
  - `src/features/homeroom/HomeroomTeacherAttendancePage.tsx`: 96, 190, 363
- **Master Data**:
  - `src/features/master/AcademicYearsPage.tsx`: 82, 120, 137, 209
  - `src/features/master/ClassesPage.tsx`: 71, 159, 179, 199, 219
  - `src/features/master/SubjectsPage.tsx`: 102, 124, 142, 170
  - `src/features/master/TeachingAssignmentsPage.tsx`: 74, 177, 196
- **Reports**:
  - `src/features/reports/AttendanceReportPage.tsx`: 67, 144, 188
  - `src/features/reports/GradesReportPage.tsx`: 115
  - `src/features/reports/JournalReportPage.tsx`: 45, 79
  - `src/features/reports/LeggerReportPage.tsx`: 186
  - `src/features/reports/PrintDocumentLayout.tsx`: 70
  - `src/features/reports/ReportCenterPage.tsx`: 66, 81
  - `src/features/reports/ShareReportModal.tsx`: 74, 109
  - `src/features/reports/StudentReportsPage.tsx`: 91, 160
- **Settings & Recovery**:
  - `src/features/settings/RelationshipRecoverySection.tsx`: 52, 88, 155
  - `src/features/settings/SettingsPage.tsx`: 230, 282, 320, 366, 482, 537, 585, 637
- **Students**:
  - `src/features/students/DeduplicateStudentsModal.tsx`: 58, 94
  - `src/features/students/ImportStudentsModal.tsx`: 160, 330, 461
  - `src/features/students/ManageCustomFieldsModal.tsx`: 86, 104, 153
  - `src/features/students/StudentCustomPrintModal.tsx`: 251
  - `src/features/students/StudentFormModal.tsx`: 69, 204
  - `src/features/students/StudentIdCardModal.tsx`: 147
  - `src/features/students/StudentProgressReportModal.tsx`: 79, 86, 94
  - `src/features/students/StudentsMasterPage.tsx`: 166, 224, 262, 405, 502, 525
  - `src/features/students/TransferClassModal.tsx`: 69
- **Teacher Journal & Attendance**:
  - `src/features/teacher/MeetingFormModal.tsx`: 76, 239
  - `src/features/teacher/MeetingsJournalPage.tsx`: 98, 174
  - `src/features/teacher/SubjectAttendanceModal.tsx`: 98, 196
  - `src/features/teacher/SubjectAttendancePage.tsx`: 139, 237, 314, 441, 510
  - `src/features/teacher/TeachingClassesPage.tsx`: 128
- **Services & Context**:
  - `src/context/WorkspaceContext.tsx`: 225
  - `src/components/common/AttendanceHolidaysModal.tsx`: 120
  - `src/components/common/ErrorBoundary.tsx`: 36
  - `src/components/common/FeedbackModal.tsx`: 61
  - `src/features/public/PublicReportViewerPage.tsx`: 67
  - `src/services/firestore/backup.ts`: 121
  - `src/services/firestore/settings.ts`: 108
  - `src/services/firestore/sharedReports.ts`: 143, 207
  - `src/services/firestore/users.ts`: 213, 256, 295
  - `src/features/dashboard/DashboardPage.tsx`: 111

---

### Category 2: `any` Type Usage
- **Total Occurrences**: 430.

#### 1. Core Domain Types (`src/types/index.ts` — 60 occurrences):
All Firestore timestamps and query cursors are declared as `any`:
- Lines 31-33: `lastLoginAt?: any; createdAt: any; updatedAt: any;` (in `UserProfile`)
- Lines 307-309: `archivedAt?: any; createdAt: any; updatedAt: any;` (in `AcademicYear`)
- Lines 322-324: `archivedAt?: any; createdAt: any; updatedAt: any;` (in `ClassItem`)
- Lines 349-351: `archivedAt?: any; createdAt: any; updatedAt: any;` (in `Student`)
- Lines 363-364: `createdAt?: any; updatedAt?: any;` (in `StudentCustomFieldDefinition`)
- Lines 371, 378, 379: `cursorDoc?: any; firstDoc: any; lastDoc: any;` (in pagination result)
- Lines 393, 400, 407, 408: `transferredAt?: any; relinkedAt?: any; createdAt: any; updatedAt: any;` (in `Enrollment`)
- Lines 417-419: `archivedAt?: any; createdAt: any; updatedAt: any;` (in `Subject`)
- Line 431: `archivedAt?: any;` (in `TeachingAssignment`)
- Lines 442-443: `createdAt: any; updatedAt: any;` (in `AttendanceSummary`)
- Lines 480-481: `createdAt: any; updatedAt: any;` (in `Meeting`)
- Lines 490-491: `createdAt: any; updatedAt: any;` (in `AttendanceSession`)
- Lines 511-512: `createdAt: any; updatedAt: any;` (in `AttendanceRecord`)
- Lines 528-529: `createdAt: any; updatedAt: any;` (in `DailyAttendanceSession`)
- Lines 544-545: `createdAt: any; updatedAt: any;` (in `DailyAttendanceRecord`)
- Lines 562-563: `createdAt: any; updatedAt: any;` (in `AssessmentItem`)
- Lines 572-573: `createdAt: any; updatedAt: any;` (in `Score`)
- Lines 591-592: `createdAt: any; updatedAt: any;` (in `StudentNote`)
- Lines 623-624: `createdAt?: any; updatedAt?: any;` (in `SchoolSettings`)
- Lines 653, 659: `createdAt?: any; updatedAt?: any;` (in `AttendanceSettings`)
- Lines 679-681: `resolvedAt?: any; createdAt: any; updatedAt: any;` (in `FeedbackItem`)
- Lines 713-714: `createdAt: any; updatedAt: any;` (in `TeacherAttendanceRecord`)
- Lines 770-771: `createdAt?: any; updatedAt?: any;` (in `TeacherMonthlyAttendanceRecord`)
- Lines 796-797: `createdAt?: any; updatedAt?: any;` (in `ClassSchedule`)
- Lines 895, 898, 900, 901: `expiresAt: any; lastViewedAt?: any; createdAt: any; updatedAt: any;` (in `SharedReport`)

#### 2. Firestore Services & Batch Operations (147 occurrences):
Document snapshot casting `(d.data() as any)` instead of typed snapshots:
- `src/services/firestore/students.ts`: 33, 80, 95, 144, 149, 222, 258, 313, 441, 630, 681, 682
- `src/services/firestore/enrollments.ts`: 205, 518
- `src/services/firestore/assessments.ts`: 8 occurrences
- `src/services/firestore/deduplication.ts`: 7 occurrences
- `src/services/firestore/backup.ts`: 20 occurrences (raw JSON object parsing)
- `src/services/firestore/users.ts`: 112, 212, 235, 255, 275, 294 (untyped catch clauses `err: any`)
- `src/infrastructure/firestore/repositories/user.repository.ts`: 8, 9, 11, 12 (`t as any`, `s as any`, `r as any`)

#### 3. Shim & Component Casts:
- `src/context/ThemeContext.tsx:107-108`:
  `setTheme: (t: ThemeKey) => ds.setSystem(t as unknown as any),`
  `applyAndSaveTheme: (t: ThemeKey) => ds.applyAndSaveSystem(t as unknown as any),`

---

### Category 3: TODO / FIXME / HACK / XXX Scan
- **Total Occurrences**: **0**.
- Grep scan across all `.ts` and `.tsx` files revealed no pending TODO, FIXME, HACK, or XXX markers.

---

### Category 4: Hardcoded Values & Magic Numbers

#### 1. Hex Colors (`#[0-9a-fA-F]{6}`):
- **Total Occurrences**: 583 (506 within arbitrary Tailwind classes `bg-[#...]`, `text-[#...]`, `border-[#...]`).
- **Primary Hotspots**:
  - `SubjectAttendancePage.tsx`: 63 lines (93 instances)
  - `HomeroomDailyAttendancePage.tsx`: 39 lines (67 instances)
  - `GradesPage.tsx`: 39 lines (70 instances)
  - `HomeroomTeacherAttendancePage.tsx`: 30 lines (56 instances)
  - `StudentFormModal.tsx`: 24 lines (45 instances)
  - `HomeroomClassSchedulePage.tsx`: 22 lines (43 instances)
  - `AddTeacherAttendanceModal.tsx`: 21 lines (33 instances)
  - `Header.tsx`: 19 lines (31 instances)
  - `MeetingsJournalPage.tsx`: 18 lines (33 instances)
  - `ShareReportModal.tsx`: 17 lines (26 instances)
  - `AttendanceHolidaysModal.tsx`: 15 lines (25 instances)

#### 2. Timer Lifecycles (`setTimeout` / `setInterval`):
- **Total Occurrences**: 30.
- **Managed with Clear on Unmount (Safe)**: 6 occurrences
  - `Tooltip.tsx:28, 61` (cleared via `timeoutRef.current`)
  - `AppLayout.tsx:38` (cleared via `return () => clearTimeout(timer)`)
  - `Header.tsx:138` (cleared via `return () => clearInterval(interval)`)
  - `WorkspaceContext.tsx:90` (cleared via `clearTimeout(revertTimerRef.current)`)
  - `WorkflowDemoModal.tsx:166` (cleared via `return () => clearInterval(interval)`)
  - `StudentsMasterPage.tsx:196` (cleared via `searchTimeoutRef.current`)
- **Unmanaged Timers (P0 / Risk of setState on Unmounted Component)**: 24 occurrences
  - `FeedbackModal.tsx:56`
  - `GlobalSearchModal.tsx:57`
  - `SignaturePadModal.tsx:44`
  - `AdminUserManagementPage.tsx:308`
  - `GradesPage.tsx:286` (`setTimeout(() => setSaveSuccessMessage(null), 3500)`)
  - `GradesPage.tsx:386` (`setTimeout(() => setSaveSuccessMessage(null), 4000)`)
  - `GradesPage.tsx:702` (`setTimeout(() => setSaveSuccessMessage(null), 4000)`)
  - `ReportCenterPage.tsx:79` (`setTimeout(() => setSaveSuccess(false), 3000)`)
  - `ShareReportModal.tsx:122` (`setTimeout(() => setCopied(false), 3000)`)
  - `StudentRaporModal.tsx:85` (`setTimeout(() => setCopiedWA(false), 3000)`)
  - `StudentReportsPage.tsx:345` (`setTimeout(() => setCopiedWA(false), 3000)`)
  - `SettingsPage.tsx:364` (`setTimeout(() => setSuccessMsg(null), 3500)`)
  - `SettingsPage.tsx:1768` (`setTimeout(() => setSuccessMsg(null), 3500)`)
  - `ImportStudentsModal.tsx:456` (`setTimeout(() => { onSuccess(); onClose(); }, ...)`)
  - `ManageCustomFieldsModal.tsx:102` (`setTimeout(() => setSuccessMsg(null), 3000)`)
  - `ManageCustomFieldsModal.tsx:151` (`setTimeout(() => setSuccessMsg(null), 3500)`)
  - `StudentIdCardModal.tsx:181` (`setTimeout(() => setCopiedToken(null), 2000)`)
  - `StudentProgressReportModal.tsx:172` (`setTimeout(() => setCopiedWA(false), 3000)`)
  - `StudentsMasterPage.tsx:1274` (`setTimeout(() => setActionSuccessMsg(null), 3000)`)
  - `StudentsMasterPage.tsx:1291` (`setTimeout(() => setActionSuccessMsg(null), 3000)`)
  - `SubjectAttendanceModal.tsx:190` (`setTimeout(() => { onSuccess(meeting.id); }, ...)`)
  - `SubjectAttendancePage.tsx:439` (`setTimeout(() => setFeedbackMsg(null), 3500)`)
  - `ToastContext.tsx:51`

#### 3. Magic Numbers & Hardcoded Query Limits:
- `src/features/students/StudentsMasterPage.tsx:82` — `const PAGE_SIZE = 25;`
- `src/features/students/StudentsMasterPage.tsx:202` — `limitPerToken: 100`
- `src/services/firestore/students.ts:47` — `const pageSize = options?.pageSize || 25;`
- `src/services/firestore/students.ts:182` — `const limitPerToken = typeof options === 'object' && options.limitPerToken ? options.limitPerToken : 100;`
- `src/services/firestore/backup.ts:328` — `const maxBatchSize = 300;`
- `src/services/firestore/classes.ts:79-86` — 8 calls with hardcoded `limit(1)` in existence checks
- `src/services/firestore/enrollments.ts:401, 417, 432, 447` — 4 calls with hardcoded `limit(1)`

---

### Category 5: Duplicate Type & Interface Definitions

Across the architectural layers (Domain vs Service vs Repository Ports), 12 types/interfaces are defined multiple times with identical or slightly diverging signatures:

1. **`CalculationMethod`**:
   - Defined in: `src/domain/grading/grading.service.ts:2` (`'SIMPLE_AVERAGE' | 'WEIGHTED_AVERAGE'`)
   - Defined in: `src/types/index.ts:10` (`'SIMPLE_AVERAGE' | 'WEIGHTED_AVERAGE'`)
2. **`StudentUsageSummary`**:
   - Defined in: `src/domain/students/studentUsage.ts:3`
   - Defined in: `src/services/firestore/students.ts:366`
3. **`ImportStudentItem`**:
   - Defined in: `src/application/students/importStudents.usecase.ts:5`
   - Defined in: `src/services/firestore/students.ts:558`
4. **`AcademicYearUsageSummary`**:
   - Defined in: `src/application/ports/academicYearRepository.ts:3`
   - Defined in: `src/services/firestore/academicYears.ts:73`
5. **`ClassUsageSummary`**:
   - Defined in: `src/application/ports/classRepository.ts:3`
   - Defined in: `src/services/firestore/classes.ts:18`
6. **`GetEnrollmentsOptions`**:
   - Defined in: `src/application/ports/enrollmentRepository.ts:3`
   - Defined in: `src/services/firestore/enrollments.ts:22`
7. **`MeetingFilterOptions`**:
   - Defined in: `src/application/ports/meetingRepository.ts:3`
   - Defined in: `src/services/firestore/meetings.ts:24`
8. **`StudentSearchFilterOptions`**:
   - Defined in: `src/application/ports/studentRepository.ts:6`
   - Defined in: `src/services/firestore/students.ts:100`
9. **`DeduplicationScanResult`**:
   - Re-exported in: `src/infrastructure/firestore/repositories/misc.repository.ts:38`
   - Defined in: `src/services/firestore/deduplication.ts:26`
10. **`DeduplicationExecutionResult`**:
    - Re-exported in: `src/infrastructure/firestore/repositories/misc.repository.ts:39`
    - Defined in: `src/services/firestore/deduplication.ts:34`
11. **`DiagnosticResult`**:
    - Re-exported in: `src/infrastructure/firestore/repositories/misc.repository.ts:40`
    - Defined in: `src/services/firestore/diagnostics.ts:32`
12. **`IntegrityIssue`**:
    - Re-exported in: `src/infrastructure/firestore/repositories/misc.repository.ts:41`
    - Defined in: `src/services/firestore/diagnostics.ts:9`

---

### Category 6: Dual-Source & Context Invariants Audit

Checking adherence to `.agents/rules/no-dual-source.md`:

| Rule Invariant | Status | Evidence / Location |
| :--- | :---: | :--- |
| **1. Design System Single Source** | **COMPLIANT** | `DesignSystemContext.tsx` strictly owns DOM attributes (`data-design-system` and `data-theme`) and `--ds-*` CSS variables. `ThemeContext.tsx` is a pure read-only shim. |
| **2. User Profile Field Drift** | **WARNING (P0 Risk)** | `updateUserThemePreference` in `src/services/firestore/users.ts:79` and `user.repository.ts:8` still write to `themePreference`. Although UI calls `container.repos.user.updateDesignSystem`, leaving this live endpoint introduces dual-source write drift risk. |
| **3. Firestore `users/{uid}` Overwrite Guard** | **COMPLIANT** | `createUserProfile` guards with `existing.exists()`. `AuthContext.tsx:41-44` catches `unavailable`/`offline` and avoids overwriting with `isOnboarded:false`. Unset `isOnboarded` defaults to `true`. |
| **4. Named Database in `firebase.json`** | **COMPLIANT** | `firebase.json:5` explicitly sets `"database": "ai-studio-97dcf1e2-31b5-4f50-ac68-ea4891b875c7"`. |
| **5. Storage Access Robustness** | **RISK (P0)** | `src/components/common/ChangeLogModal.tsx:21` executes `localStorage.setItem(CHANGELOG_STORAGE_KEY, 'true')` directly without `try/catch`. Can crash on iOS Safari private mode or iframes. |
| **6. App Root Background Conformance** | **DEFECT (P2)** | `src/components/layout/AppLayout.tsx:81` hardcodes `bg-[#f1f5f9] dark:bg-[#0C0E15]` on the root app shell instead of `var(--ds-surface)` or `var(--app-bg)`. |

---

### Category 7: Hardcoded Tailwind Styles Bypassing Design Tokens
- **Total Occurrences**: 100 in `.tsx` files.
- **Patterns**: `bg-indigo-*`, `border-indigo-*`, `text-indigo-*`, `shadow-xl`, `shadow-2xl`.
- **Impact**: In Brutalism mode, buttons and cards should render stark borders with yellow accent (`#FFE500`); in Apple Glass mode, blurred white acrylic with iOS Blue (`#007AFF`); in Neo-Skeuomorphic, warm paper with Emerald (`#047857`). Using hardcoded Indigo colors locks the component to an outdated indigo theme that ignores the active design system.

#### Key Hotspots:
- `src/features/students/StudentCustomPrintModal.tsx`: 15 instances (buttons with `bg-indigo-600 hover:bg-indigo-700`, badges with `bg-indigo-50/70 border-indigo-200`)
- `src/features/students/StudentsMasterPage.tsx`: 11 instances (`hover:bg-indigo-50`, `text-indigo-600`)
- `src/features/reports/GradesReportPage.tsx`: 10 instances (`bg-indigo-50`, `bg-indigo-100`, `text-indigo-950` on table cells and headers)
- `src/features/students/ImportStudentsModal.tsx`: 9 instances (`bg-indigo-600`, `border-indigo-200`, `bg-indigo-50/40`)
- `src/features/auth/WorkflowDemoModal.tsx`: 6 instances (`bg-indigo-950`, `border-indigo-800`, `shadow-2xl`)
- `src/features/students/StudentDetailModal.tsx`: 5 instances (`bg-indigo-600`, `text-indigo-600`)
- `src/features/students/TransferClassModal.tsx`: 5 instances (`bg-indigo-600`, `bg-indigo-50`)
- `src/features/students/StudentProgressReportModal.tsx`: 4 instances (`bg-indigo-600`, `bg-indigo-50`)
- `src/features/reports/JournalReportPage.tsx`: 4 instances (`bg-indigo-600`, `text-indigo-600`)
- `src/features/reports/LeggerReportPage.tsx`: 3 instances (`bg-indigo-100`, `bg-indigo-50/60`, `text-indigo-950`)

---

## 5. Prioritization Matrix

### P0 (Must Fix Before Deploy — High Production / Stability Risk)
1. **Un-guarded `localStorage.setItem` in `ChangeLogModal.tsx:21`**:
   - Wrap in `try/catch` block like in `AppLayout.tsx` and `MasterDataPage.tsx` to prevent hard crashes on iOS Safari Private Browsing or restricted WebView environments.
2. **Dual-Source Write Risk in `users.ts:79` and `user.repository.ts:8`**:
   - Deprecate or remove `updateUserThemePreference` and `updateTheme` port method. Ensure only `updateUserDesignSystemPreference` (`updateDesignSystem`) can write to Firestore, avoiding schema drift on `users/{uid}`.
3. **Unmanaged `setTimeout` Lifecycles (22 UI locations)**:
   - Components like `GradesPage.tsx`, `SettingsPage.tsx`, `SubjectAttendancePage.tsx`, `StudentReportsPage.tsx`, and `ManageCustomFieldsModal.tsx` trigger `setTimeout(() => setState(...))` without storing the timer in a `useRef` or clearing it on component unmount. Convert to a reusable `useAutoDismiss` hook or manage via `useEffect` cleanup.
4. **Silent Error Swallowing in `useHomeroomStudents.ts:20, 54`**:
   - `catch (e) { console.error(e); }` leaves the hook in a permanent loading state without notifying the user or recovering state. Add error state and trigger toast feedback.

---

### P1 (Fix Soon — Architecture Health & Technical Debt)
1. **Strong Typing for Timestamps & Cursors in `src/types/index.ts`**:
   - Replace 60 instances of `: any` on `createdAt`, `updatedAt`, `lastLoginAt`, `archivedAt`, and pagination cursors with `Timestamp | Date | string` (or `FirestoreTimestamp`) and `QueryDocumentSnapshot`.
2. **Deduplicate Domain & Repository Port Interfaces**:
   - Consolidate `CalculationMethod`, `StudentUsageSummary`, and `ImportStudentItem`.
   - Make repository ports (`academicYearRepository.ts`, `classRepository.ts`, `studentRepository.ts`, etc.) import usage summary types from a shared domain location (`src/domain/...` or `src/types/index.ts`) instead of redefining identical interfaces.
3. **Migrate Hardcoded Tailwind Indigo / Shadow Styles to Design Tokens (100 instances)**:
   - Replace `bg-indigo-600`, `text-indigo-600`, and `bg-indigo-50` in `StudentCustomPrintModal.tsx`, `StudentsMasterPage.tsx`, `GradesReportPage.tsx`, and `ImportStudentsModal.tsx` with semantic design system tokens: `bg-[var(--accent-primary)]`, `text-[var(--accent-primary-text)]`, `bg-[var(--accent-primary-soft)]`, and `border-[var(--accent-primary-border)]`.
4. **Standardize Error Logging**:
   - Introduce an application logging utility (`src/utils/logger.ts`) to wrap `console.error` and sanitize error payloads before logging in production.

---

### P2 (Nice to Have — Polish & Consistency)
1. **Extract Magic Numbers & Limits**:
   - Consolidate pagination limits (`PAGE_SIZE = 25`, `limitPerToken = 100`) and Firestore batch chunk thresholds (`maxBatchSize = 300`) into a centralized constant file `src/constants/limits.ts`.
2. **App Shell Root Styling**:
   - In `src/components/layout/AppLayout.tsx:81`, replace `bg-[#f1f5f9] dark:bg-[#0C0E15]` with `bg-[var(--ds-surface)]` so the background immediately synchronizes with the active design system (`#FFFFFF` for brutalism, `#FFFFFF` for apple-glass, `#FAF9F6` for neo-skeuomorphic).
3. **Clean Type Casts in `ThemeContext.tsx:107-108`**:
   - Eliminate `as unknown as any` casting by aligning the union types between `ThemeKey` and `DesignSystemKey`.
4. **Refactor 506 Arbitrary Hex Classes**:
   - Gradually replace direct `bg-[#...]` classes with theme CSS variables to enhance customizability and dark/light system adaptation.
