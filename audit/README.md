# DADU Comprehensive Audit Report — 2026-09-30 (TERKUNCI)

> **Audited Target**: `c:/Users/Administrator/Documents/ai/dadu/dadu-app-imp`  
> **Application Version**: `2.3.0` (`ver. 2.3-JRA`)  
> **Audit Date**: 30 September 2026  
> **Auditor**: Antigravity Autonomous Multi-Layer Architecture & Security Team  
> **Audit Status**: **TERKUNCI (LOCKED)** — Read-Only Forensic Source Inspection  

---

## Executive Summary

This comprehensive audit synthesizes forensic findings from **8 specialized layer audit reports** conducted across the entire DADU (Digitalisasi Data Guru / Data Akademik & Database Utama) application.

- **Reports Generated**: 8 dedicated reports covering Layers 1 through 8 (`audit/layer1-code-quality.md` to `audit/layer8-ops.md`).
- **Build & Quality Pipeline Status**:
  - **TypeScript Compilation (`tsc --noEmit`)**: **PASS** (0 errors).
  - **Biome Linter (`biome lint src`)**: **PASS** (218 files checked, 0 errors).
  - **Architecture Boundaries (`depcruise src`)**: **PASS** (235 modules, 872 dependencies cruised, 0 boundary violations).
  - **Production Build (`vite build`)**: **PASS** (Built in 18.15s, 11 vendor & page chunks created).
  - **Automated Test Suite (`vitest run`)**: **PARTIALLY FAILED** (20 test suites passed, 1 failed; 109 tests passed, 2 failed in `src/services/firestore/users.test.ts` due to mock missing `getDoc.exists()`).
  - **CI Quality Pipeline (`npm run ci`)**: **BLOCKED** by the unit test failure in `users.test.ts`.
- **Architecture & Design System Integrity**:
  - The single source of truth rule (`.agents/rules/no-dual-source.md`) is successfully respected by `DesignSystemContext` and `firebase.json` (targeting named database `ai-studio-97dcf1e2-31b5-4f50-ac68-ea4891b875c7`).
  - However, critical gaps exist: **print isolation styling leaks** in Brutalism, **privilege escalation** risks in `firestore.rules`, **missing composite indexes** in Firestore, **unmanaged UI timers**, and **eager loading of SheetJS and Firestore** on public/unauthenticated routes.

---

## Layer Summary Table

| Lapis | Nama Lapisan | Status | P0 | P1 | P2 | Report File |
| :---: | :--- | :---: | :---: | :---: | :---: | :--- |
| **L1** | Kualitas Kode & Static Typing | Pass with Warnings | 4 | 4 | 4 | [`layer1-code-quality.md`](file:///c:/Users/Administrator/Documents/ai/dadu/dadu-app-imp/audit/layer1-code-quality.md) |
| **L2** | Arsitektur & Boundary Hexagonal | Pass with Warnings | 0 | 6 | 5 | [`layer2-architecture.md`](file:///c:/Users/Administrator/Documents/ai/dadu/dadu-app-imp/audit/layer2-architecture.md) |
| **L3** | Data, Database & Firestore | Pass with Warnings | 2 | 3 | 2 | [`layer3-data.md`](file:///c:/Users/Administrator/Documents/ai/dadu/dadu-app-imp/audit/layer3-data.md) |
| **L4** | Keamanan & Aturan Akses | Action Required | 2 | 3 | 2 | [`layer4-security.md`](file:///c:/Users/Administrator/Documents/ai/dadu/dadu-app-imp/audit/layer4-security.md) |
| **L5** | Performa & Bundle Loading | Action Required | 3 | 5 | 3 | [`layer5-performance.md`](file:///c:/Users/Administrator/Documents/ai/dadu/dadu-app-imp/audit/layer5-performance.md) |
| **L6** | UX, Aksesibilitas & Design System | Action Required | 2 | 4 | 4 | [`layer6-ux.md`](file:///c:/Users/Administrator/Documents/ai/dadu/dadu-app-imp/audit/layer6-ux.md) |
| **L7** | Pengujian & Quality Gate | Failing (CI Blocked) | 2 | 4 | 4 | [`layer7-test.md`](file:///c:/Users/Administrator/Documents/ai/dadu/dadu-app-imp/audit/layer7-test.md) |
| **L8** | Operasional & Deployment | Blocked (CI Gate) | 1 | 4 | 2 | [`layer8-ops.md`](file:///c:/Users/Administrator/Documents/ai/dadu/dadu-app-imp/audit/layer8-ops.md) |
| **TOTAL** | **8 Operational Layers** | **Action Required** | **16** | **33** | **26** | **75 Total Issues** |

---

## P0 Priority Backlog (Must Fix Before Next Release)

All 16 P0 issues must be resolved before cutting the next production release to prevent runtime crashes, security compromise, or deployment blockage.

1. **Un-guarded `localStorage.setItem` in ChangeLogModal**
   - **Source**: L1 — [`src/components/common/ChangeLogModal.tsx:21`](file:///c:/Users/Administrator/Documents/ai/dadu/dadu-app-imp/src/components/common/ChangeLogModal.tsx#L21)
   - **What is broken**: `localStorage.setItem(CHANGELOG_STORAGE_KEY, 'true')` executes directly without `try/catch`. This throws unhandled `DOMException: QuotaExceededError` or `SecurityError` on iOS Safari Private Browsing mode or embedded iframes, crashing the modal.
   - **Suggested fix**: Wrap in a `try { ... } catch {}` block identical to `AppLayout.tsx` and `MasterDataPage.tsx`.
   - **Effort estimate**: 10m

2. **Dual-Source Theme Preference Write Drift**
   - **Source**: L1 — [`src/services/firestore/users.ts:79`](file:///c:/Users/Administrator/Documents/ai/dadu/dadu-app-imp/src/services/firestore/users.ts#L79) & [`src/infrastructure/firestore/repositories/user.repository.ts:8`](file:///c:/Users/Administrator/Documents/ai/dadu/dadu-app-imp/src/infrastructure/firestore/repositories/user.repository.ts#L8)
   - **What is broken**: Unused functions `updateUserThemePreference` and `updateTheme` port write directly to `themePreference`, violating the single-source invariant (`no-dual-source.md`) which mandates writing only to `designSystemPreference`.
   - **Suggested fix**: Delete or deprecate `updateUserThemePreference` and remove `updateTheme` from `UserRepository` port to prevent accidental invocation.
   - **Effort estimate**: 15m

3. **Unmanaged `setTimeout` Lifecycles (22 UI Locations)**
   - **Source**: L1 — [`src/features/grades/GradesPage.tsx:286,386,702`](file:///c:/Users/Administrator/Documents/ai/dadu/dadu-app-imp/src/features/grades/GradesPage.tsx#L286), [`src/features/settings/SettingsPage.tsx:364,1768`](file:///c:/Users/Administrator/Documents/ai/dadu/dadu-app-imp/src/features/settings/SettingsPage.tsx#L364), [`src/features/teacher/SubjectAttendancePage.tsx:439`](file:///c:/Users/Administrator/Documents/ai/dadu/dadu-app-imp/src/features/teacher/SubjectAttendancePage.tsx#L439), [`src/features/reports/StudentReportsPage.tsx:345`](file:///c:/Users/Administrator/Documents/ai/dadu/dadu-app-imp/src/features/reports/StudentReportsPage.tsx#L345), [`src/features/students/ManageCustomFieldsModal.tsx:102,151`](file:///c:/Users/Administrator/Documents/ai/dadu/dadu-app-imp/src/features/students/ManageCustomFieldsModal.tsx#L102), [`src/features/students/StudentsMasterPage.tsx:1274,1291`](file:///c:/Users/Administrator/Documents/ai/dadu/dadu-app-imp/src/features/students/StudentsMasterPage.tsx#L1274), [`src/components/common/FeedbackModal.tsx:56`](file:///c:/Users/Administrator/Documents/ai/dadu/dadu-app-imp/src/components/common/FeedbackModal.tsx#L56), [`src/components/common/GlobalSearchModal.tsx:57`](file:///c:/Users/Administrator/Documents/ai/dadu/dadu-app-imp/src/components/common/GlobalSearchModal.tsx#L57), [`src/components/common/SignaturePadModal.tsx:44`](file:///c:/Users/Administrator/Documents/ai/dadu/dadu-app-imp/src/components/common/SignaturePadModal.tsx#L44), [`src/features/admin/AdminUserManagementPage.tsx:308`](file:///c:/Users/Administrator/Documents/ai/dadu/dadu-app-imp/src/features/admin/AdminUserManagementPage.tsx#L308), [`src/features/reports/ReportCenterPage.tsx:79`](file:///c:/Users/Administrator/Documents/ai/dadu/dadu-app-imp/src/features/reports/ReportCenterPage.tsx#L79), [`src/features/reports/ShareReportModal.tsx:122`](file:///c:/Users/Administrator/Documents/ai/dadu/dadu-app-imp/src/features/reports/ShareReportModal.tsx#L122), [`src/features/reports/StudentRaporModal.tsx:85`](file:///c:/Users/Administrator/Documents/ai/dadu/dadu-app-imp/src/features/reports/StudentRaporModal.tsx#L85), [`src/features/students/ImportStudentsModal.tsx:456`](file:///c:/Users/Administrator/Documents/ai/dadu/dadu-app-imp/src/features/students/ImportStudentsModal.tsx#L456), [`src/features/students/StudentIdCardModal.tsx:181`](file:///c:/Users/Administrator/Documents/ai/dadu/dadu-app-imp/src/features/students/StudentIdCardModal.tsx#L181), [`src/features/students/StudentProgressReportModal.tsx:172`](file:///c:/Users/Administrator/Documents/ai/dadu/dadu-app-imp/src/features/students/StudentProgressReportModal.tsx#L172), [`src/features/teacher/SubjectAttendanceModal.tsx:190`](file:///c:/Users/Administrator/Documents/ai/dadu/dadu-app-imp/src/features/teacher/SubjectAttendanceModal.tsx#L190), [`src/context/ToastContext.tsx:51`](file:///c:/Users/Administrator/Documents/ai/dadu/dadu-app-imp/src/context/ToastContext.tsx#L51)
   - **What is broken**: 22 `setTimeout` calls trigger `setState` without clearing the timer on unmount, risking memory leaks and updating state on unmounted components when navigating away.
   - **Suggested fix**: Wrap in a reusable `useAutoDismiss` hook or store timers in `useRef` and clear in `useEffect` cleanup.
   - **Effort estimate**: 45m

4. **Silent Error Swallowing in `useHomeroomStudents`**
   - **Source**: L1 — [`src/hooks/useHomeroomStudents.ts:20, 54`](file:///c:/Users/Administrator/Documents/ai/dadu/dadu-app-imp/src/hooks/useHomeroomStudents.ts#L20)
   - **What is broken**: `catch (e) { console.error(e); }` silently catches errors without resetting `loading: false` or setting error state, freezing the UI in a permanent loading skeleton.
   - **Suggested fix**: Add `error` state, ensure `isLoading: false` in `finally`, and trigger a toast error notification.
   - **Effort estimate**: 15m

5. **Missing Composite Index for `classes`**
   - **Source**: L3 — [`src/services/firestore/classes.ts:36`](file:///c:/Users/Administrator/Documents/ai/dadu/dadu-app-imp/src/services/firestore/classes.ts#L36)
   - **What is broken**: Query `where('academicYearId', '==', ...), orderBy('name', 'asc')` fails with `FirebaseError: The query requires an index` when switching academic years, blocking class data.
   - **Suggested fix**: Add composite index for `classes` (`academicYearId` ASC, `name` ASC) to `firestore.indexes.json` and deploy.
   - **Effort estimate**: 10m

6. **Missing Composite Index for `enrollments`**
   - **Source**: L3 — [`src/services/firestore/enrollments.ts:38-43`](file:///c:/Users/Administrator/Documents/ai/dadu/dadu-app-imp/src/services/firestore/enrollments.ts#L38-L43)
   - **What is broken**: Query `where('academicYearId', '==', ...), where('classId', '==', ...), orderBy('rollNumber', 'asc')` lacks an index, failing attendance sheets and gradebook rosters.
   - **Suggested fix**: Add composite index for `enrollments` (`academicYearId` ASC, `classId` ASC, `rollNumber` ASC) to `firestore.indexes.json` and deploy.
   - **Effort estimate**: 10m

7. **Privilege Escalation on User Profile Creation**
   - **Source**: L4 — [`firestore.rules:54`](file:///c:/Users/Administrator/Documents/ai/dadu/dadu-app-imp/firestore.rules#L54)
   - **What is broken**: `allow create: if request.auth != null && request.auth.uid == userId;` lacks field constraints, allowing newly registered users to set `role: 'ADMIN'` during onboarding and access the Admin panel.
   - **Suggested fix**: Enforce `request.resource.data.role == 'TEACHER'` and validate `accountStatus in ['ACTIVE', 'PENDING']` in `allow create`.
   - **Effort estimate**: 15m

8. **Unverified Email Check in `isSuperAdmin()`**
   - **Source**: L4 — [`firestore.rules:5-10`](file:///c:/Users/Administrator/Documents/ai/dadu/dadu-app-imp/firestore.rules#L5-L10)
   - **What is broken**: `isSuperAdmin()` checks `request.auth.token.email` without requiring `request.auth.token.email_verified == true`. An attacker registering with an unverified admin email could gain full SuperAdmin permissions.
   - **Suggested fix**: Add `&& request.auth.token.email_verified == true` to `isSuperAdmin()` in `firestore.rules`.
   - **Effort estimate**: 10m

9. **Dead `xlsx` Import in Settings Page**
   - **Source**: L5 — [`src/features/settings/SettingsPage.tsx:45`](file:///c:/Users/Administrator/Documents/ai/dadu/dadu-app-imp/src/features/settings/SettingsPage.tsx#L45)
   - **What is broken**: `import * as XLSX from 'xlsx';` is completely unreferenced across all 2,382 lines of `SettingsPage.tsx`, forcing a 424.7 kB download of `vendor-xlsx` on Settings navigation.
   - **Suggested fix**: Delete line 45 `import * as XLSX from 'xlsx';` from `SettingsPage.tsx`.
   - **Effort estimate**: 5m

10. **Static `xlsx` Imports across 19 Feature Modules**
    - **Source**: L5 — [`src/features/settings/SettingsPage.tsx:45`](file:///c:/Users/Administrator/Documents/ai/dadu/dadu-app-imp/src/features/settings/SettingsPage.tsx#L45), [`src/features/public/PublicReportViewerPage.tsx:25`](file:///c:/Users/Administrator/Documents/ai/dadu/dadu-app-imp/src/features/public/PublicReportViewerPage.tsx#L25), [`src/features/students/StudentsMasterPage.tsx:2`](file:///c:/Users/Administrator/Documents/ai/dadu/dadu-app-imp/src/features/students/StudentsMasterPage.tsx#L2), [`src/features/students/ImportStudentsModal.tsx:2`](file:///c:/Users/Administrator/Documents/ai/dadu/dadu-app-imp/src/features/students/ImportStudentsModal.tsx#L2), [`src/utils/studentExcelTemplate.ts:1`](file:///c:/Users/Administrator/Documents/ai/dadu/dadu-app-imp/src/utils/studentExcelTemplate.ts#L1), [`src/features/grades/GradesPage.tsx:22`](file:///c:/Users/Administrator/Documents/ai/dadu/dadu-app-imp/src/features/grades/GradesPage.tsx#L22), [`src/features/teacher/SubjectAttendancePage.tsx:15`](file:///c:/Users/Administrator/Documents/ai/dadu/dadu-app-imp/src/features/teacher/SubjectAttendancePage.tsx#L15), [`src/features/teacher/MeetingsJournalPage.tsx:10`](file:///c:/Users/Administrator/Documents/ai/dadu/dadu-app-imp/src/features/teacher/MeetingsJournalPage.tsx#L10), [`src/features/teacher/TeacherPersonalSchedulePage.tsx:6`](file:///c:/Users/Administrator/Documents/ai/dadu/dadu-app-imp/src/features/teacher/TeacherPersonalSchedulePage.tsx#L6), [`src/features/homeroom/HomeroomStudentsPage.tsx:34`](file:///c:/Users/Administrator/Documents/ai/dadu/dadu-app-imp/src/features/homeroom/HomeroomStudentsPage.tsx#L34), [`src/features/homeroom/HomeroomDailyAttendancePage.tsx:24`](file:///c:/Users/Administrator/Documents/ai/dadu/dadu-app-imp/src/features/homeroom/HomeroomDailyAttendancePage.tsx#L24), [`src/features/homeroom/HomeroomMonthlyAttendancePage.tsx:21`](file:///c:/Users/Administrator/Documents/ai/dadu/dadu-app-imp/src/features/homeroom/HomeroomMonthlyAttendancePage.tsx#L21), [`src/features/homeroom/HomeroomTeacherAttendancePage.tsx:36`](file:///c:/Users/Administrator/Documents/ai/dadu/dadu-app-imp/src/features/homeroom/HomeroomTeacherAttendancePage.tsx#L36), [`src/features/homeroom/HomeroomNotesPage.tsx:29`](file:///c:/Users/Administrator/Documents/ai/dadu/dadu-app-imp/src/features/homeroom/HomeroomNotesPage.tsx#L29), [`src/features/homeroom/HomeroomClassSchedulePage.tsx:14`](file:///c:/Users/Administrator/Documents/ai/dadu/dadu-app-imp/src/features/homeroom/HomeroomClassSchedulePage.tsx#L14), [`src/features/reports/GradesReportPage.tsx:10`](file:///c:/Users/Administrator/Documents/ai/dadu/dadu-app-imp/src/features/reports/GradesReportPage.tsx#L10), [`src/features/reports/AttendanceReportPage.tsx:9`](file:///c:/Users/Administrator/Documents/ai/dadu/dadu-app-imp/src/features/reports/AttendanceReportPage.tsx#L9), [`src/features/reports/LeggerReportPage.tsx:31`](file:///c:/Users/Administrator/Documents/ai/dadu/dadu-app-imp/src/features/reports/LeggerReportPage.tsx#L31), [`src/features/reports/JournalReportPage.tsx:10`](file:///c:/Users/Administrator/Documents/ai/dadu/dadu-app-imp/src/features/reports/JournalReportPage.tsx#L10)
    - **What is broken**: 19 files statically import SheetJS, bundling `vendor-xlsx` (424.7 kB) into initial page chunks and forcing external parents/students on `PublicReportViewerPage` to load Excel parsers.
    - **Suggested fix**: Replace top-level static imports with dynamic `const XLSX = await import('xlsx');` inside click handlers (`handleExportExcel`, `handleImportExcel`).
    - **Effort estimate**: 30m

11. **Eager Loading of WorkspaceProvider & Firestore on Unauthenticated Routes**
    - **Source**: L5 — [`src/App.tsx:200`](file:///c:/Users/Administrator/Documents/ai/dadu/dadu-app-imp/src/App.tsx#L200)
    - **What is broken**: `WorkspaceProvider` and `container.ts` statically import all 23 Firestore repositories at the root, forcing unauthenticated visitors at `/login` or `/share/:token` to download `vendor-firebase-firestore` (573.8 kB uncompressed / 143.5 kB gzip).
    - **Suggested fix**: Mount `<WorkspaceProvider>` conditionally only when `user` is non-null, serving a lightweight login view for unauthenticated users.
    - **Effort estimate**: 20m

12. **Print Boundary Isolation Leak (Brutalist 4px Borders & Shadows)**
    - **Source**: L6 — [`src/index.css:324-405`](file:///c:/Users/Administrator/Documents/ai/dadu/dadu-app-imp/src/index.css#L324-L405)
    - **What is broken**: `.printable-document`, `.print-sheet`, and `#printable-progress-report` only reset colors, failing to neutralize `border-width` and `box-shadow`. In Brutalism, heavy 4px solid black borders and `4px 4px 0px 0px` drop shadows leak directly into official printable report cards and ledgers.
    - **Suggested fix**: Enforce `border-radius: 0px !important; box-shadow: none !important;` on printable boundaries and set `border-width: 1px !important;` on child `[class*="border"]`.
    - **Effort estimate**: 15m

13. **Severe WCAG Contrast Failure for Brutalism Yellow Accent Text**
    - **Source**: L6 — [`src/index.css:170`](file:///c:/Users/Administrator/Documents/ai/dadu/dadu-app-imp/src/index.css#L170)
    - **What is broken**: Yellow accent `#FFE500` against white canvas has a 1.28:1 contrast ratio (failing WCAG 2.2 AA 4.5:1). In `.badge-accent`, yellow text is placed on `rgba(255, 229, 0, 0.1)`, rendering badges completely unreadable.
    - **Suggested fix**: In `src/index.css`, override `.badge-accent` for `[data-design-system="brutalism"]` with `color: #000000 !important; border: 2px solid #000000; font-weight: 700;`.
    - **Effort estimate**: 10m

14. **Broken Unit Tests in `users.test.ts`**
    - **Source**: L7 — [`src/services/firestore/users.test.ts:69-95`](file:///c:/Users/Administrator/Documents/ai/dadu/dadu-app-imp/src/services/firestore/users.test.ts#L69-L95)
    - **What is broken**: `createUserProfile` tests fail with `TypeError: Cannot read properties of undefined (reading 'exists')` because `mockGetDoc` was not configured to return `{ exists: () => false }` when the anti-overwrite guard was added.
    - **Suggested fix**: Update `src/services/firestore/users.test.ts` to mock `mockGetDoc.mockResolvedValueOnce({ exists: () => false })` for creation tests, and add an overwrite-prevention test case.
    - **Effort estimate**: 15m

15. **Missing Boundary Check in CI Quality Gate**
    - **Source**: L7 — [`.github/workflows/ci.yml:24-25`](file:///c:/Users/Administrator/Documents/ai/dadu/dadu-app-imp/.github/workflows/ci.yml#L24-L25) & [`package.json:169`](file:///c:/Users/Administrator/Documents/ai/dadu/dadu-app-imp/package.json#L169)
    - **What is broken**: GitHub Actions CI executes lint, type-check, test, and build, but omits `npm run check:boundaries`. Boundary violations can merge undetected via pull requests.
    - **Suggested fix**: Add `- name: Architecture Boundary Check \n run: npm run check:boundaries` to `.github/workflows/ci.yml` and include `npm run check` in `npm run ci`.
    - **Effort estimate**: 10m

16. **CI Pipeline and Pull Request Gate Blocked (OPS-P0-01)**
    - **Source**: L8 — [`src/services/firestore/users.test.ts:31`](file:///c:/Users/Administrator/Documents/ai/dadu/dadu-app-imp/src/services/firestore/users.ts#L31) & [`.github/workflows/ci.yml:24`](file:///c:/Users/Administrator/Documents/ai/dadu/dadu-app-imp/.github/workflows/ci.yml#L24)
    - **What is broken**: Due to test failures in `users.test.ts`, `npm test` and `npm run ci` exit with code 1, blocking all automated PR merges and deployment pipelines.
    - **Suggested fix**: Apply the `mockGetDoc` fix in `users.test.ts` to restore 100% green CI runs on GitHub Actions.
    - **Effort estimate**: 10m

---

## P1 Priority Backlog

All 33 P1 issues represent high-priority architectural debt, security improvements, query optimizations, and UI consistency gaps.

1. **Strong Typing for Timestamps & Cursors**  
   *Source*: L1 — [`src/types/index.ts:31-33, 307-309, 322-324, 349-351`](file:///c:/Users/Administrator/Documents/ai/dadu/dadu-app-imp/src/types/index.ts#L31)  
   *What is broken*: 60 instances of `: any` on `createdAt`, `updatedAt`, `lastLoginAt`, and pagination cursors strip compile-time validation.  
   *Suggested fix*: Replace with `Timestamp | Date | string` (or `FirestoreTimestamp`) and `QueryDocumentSnapshot`.  
   *Effort*: 30m

2. **Deduplicate Domain & Repository Port Interfaces**  
   *Source*: L1 — [`src/application/ports/*`](file:///c:/Users/Administrator/Documents/ai/dadu/dadu-app-imp/src/application/ports/) & [`src/domain/*`](file:///c:/Users/Administrator/Documents/ai/dadu/dadu-app-imp/src/domain/)  
   *What is broken*: 12 interfaces (`CalculationMethod`, `StudentUsageSummary`, `ImportStudentItem`, etc.) are duplicated across layers.  
   *Suggested fix*: Consolidate into canonical definitions in `src/domain/` or `src/types/index.ts` and import across ports.  
   *Effort*: 30m

3. **Migrate Hardcoded Tailwind Indigo / Shadow Styles to Design Tokens**  
   *Source*: L1 — `StudentCustomPrintModal.tsx`, `StudentsMasterPage.tsx`, `GradesReportPage.tsx`, `ImportStudentsModal.tsx`  
   *What is broken*: 100 instances of `bg-indigo-600`, `text-indigo-600`, and `bg-indigo-50` bypass the active design system palette.  
   *Suggested fix*: Replace with `var(--accent-primary)`, `var(--accent-primary-text)`, and `var(--accent-primary-soft)`.  
   *Effort*: 45m

4. **Standardize Application Error Logging**  
   *Source*: L1 — 137 `console.error` calls across UI components and services  
   *What is broken*: Direct un-sanitized `console.error` calls clutter browser logs without routing to an error monitoring boundary.  
   *Suggested fix*: Introduce `src/utils/logger.ts` to sanitize errors and gate development logs.  
   *Effort*: 30m

5. **Direct Infrastructure Bypass in DeduplicateStudentsModal**  
   *Source*: L2 — [`src/features/students/DeduplicateStudentsModal.tsx:16-21`](file:///c:/Users/Administrator/Documents/ai/dadu/dadu-app-imp/src/features/students/DeduplicateStudentsModal.tsx#L16-L21)  
   *What is broken*: Directly imports `scanDuplicateStudents` and `executeZeroResidueDeduplication` from infrastructure, bypassing `container.repos`.  
   *Suggested fix*: Dispatch through `container.repos.deduplication` and remove direct infrastructure import.  
   *Effort*: 15m

6. **Anti-Pattern Re-Exports in Misc Repository**  
   *Source*: L2 — [`src/infrastructure/firestore/repositories/misc.repository.ts:35-37`](file:///c:/Users/Administrator/Documents/ai/dadu/dadu-app-imp/src/infrastructure/firestore/repositories/misc.repository.ts#L35-L37)  
   *What is broken*: Lines 35-37 contain `// re-export for direct imports`, deliberately violating DI container encapsulation.  
   *Suggested fix*: Delete the standalone re-exports and require all callers to route through `container.repos`.  
   *Effort*: 10m

7. **Severe Port vs Implementation Divergence in Misc Repository**  
   *Source*: L2 — [`src/infrastructure/firestore/repositories/misc.repository.ts`](file:///c:/Users/Administrator/Documents/ai/dadu/dadu-app-imp/src/infrastructure/firestore/repositories/misc.repository.ts)  
   *What is broken*: 6 port interfaces (`BackupRepository`, `DiagnosticsRepository`, `DeduplicationRepository`, etc.) are completely disconnected from `misc.repository.ts`.  
   *Suggested fix*: Align port method names with actual repository implementations and bind types explicitly.  
   *Effort*: 45m

8. **Unbound Standalone Repository Implementations**  
   *Source*: L2 — `feedback`, `homeroomAttendance`, `settings`, `sharedReport`, `studentNote` repositories  
   *What is broken*: 5 repository files do not declare or type-check their exports against their port interfaces in `src/application/ports/`.  
   *Suggested fix*: Bind repositories to ports: `export const feedbackRepository: FeedbackRepository = { ... }`.  
   *Effort*: 45m

9. **Prevalence of `(container.repos as any)` Type Escapes in Features**  
   *Source*: L2 — `AdminUserManagementPage.tsx`, `AdminFeedbackTab.tsx`, `TeachingAssignmentsPage.tsx`, `SubjectsPage.tsx`, `AttendanceReportPage.tsx`  
   *What is broken*: Feature pages cast `container.repos as any` because port interfaces omit methods required by UI components.  
   *Suggested fix*: Update port contracts to include required methods and remove `as any` casts.  
   *Effort*: 30m

10. **Mock Snapshot Incompatibility in Service Unit Tests**  
    *Source*: L2 — [`src/services/firestore/users.test.ts:89`](file:///c:/Users/Administrator/Documents/ai/dadu/dadu-app-imp/src/services/firestore/users.test.ts#L89)  
    *What is broken*: Test mock lacks `exists: () => false` for `createUserProfile`, breaking unit tests.  
    *Suggested fix*: Configure mock snapshot in `users.test.ts` to return valid `exists()` method.  
    *Effort*: 15m

11. **Missing Composite Indexes for `dailyAttendanceRecords` Monthly Queries**  
    *Source*: L3 — [`src/services/firestore/homeroomAttendance.ts:80-92`](file:///c:/Users/Administrator/Documents/ai/dadu/dadu-app-imp/src/services/firestore/homeroomAttendance.ts#L80-L92)  
    *What is broken*: Monthly queries combining `classId` and `academicYearId` with date range inequalities fail without composite indexes.  
    *Suggested fix*: Add composite indexes for `dailyAttendanceRecords` (`academicYearId` ASC, `classId` ASC, `date` ASC) to `firestore.indexes.json`.  
    *Effort*: 15m

12. **Missing Composite Indexes for `students` Search by Token with Filters**  
    *Source*: L3 — [`src/services/firestore/students.ts:214-219, 243-248`](file:///c:/Users/Administrator/Documents/ai/dadu/dadu-app-imp/src/services/firestore/students.ts#L214-L219)  
    *What is broken*: Combining `searchTokens array-contains` with status and gender filters fails in Firestore without composite indexes.  
    *Suggested fix*: Add 3 composite indexes for `students` (`status` + `searchTokens`, `gender` + `searchTokens`, `status` + `gender` + `searchTokens`).  
    *Effort*: 15m

13. **Unit Test Mock Drift in `users.test.ts`**  
    *Source*: L3 — [`src/services/firestore/users.test.ts:69-95`](file:///c:/Users/Administrator/Documents/ai/dadu/dadu-app-imp/src/services/firestore/users.test.ts#L69-L95)  
    *What is broken*: Missing mock return value for `getDoc` prevents testing the anti-overwrite guard.  
    *Suggested fix*: Update `mockGetDoc` resolution in `users.test.ts`.  
    *Effort*: 15m

14. **Implement Firebase App Check for Abuse & Anti-Bot Defense**  
    *Source*: L4 — [`src/services/firebase/config.ts`](file:///c:/Users/Administrator/Documents/ai/dadu/dadu-app-imp/src/services/firebase/config.ts) & [`package.json`](file:///c:/Users/Administrator/Documents/ai/dadu/dadu-app-imp/package.json)  
    *What is broken*: App Check is not installed or configured, leaving Firestore REST/WebChannel APIs open to direct bot scraping and quota draining.  
    *Suggested fix*: Install `@firebase/app-check`, initialize with reCAPTCHA Enterprise, and enforce in Firebase Console.  
    *Effort*: 45m

15. **Strict Type & Rate Guard on `sharedReports` Public Updates**  
    *Source*: L4 — [`firestore.rules:150-156`](file:///c:/Users/Administrator/Documents/ai/dadu/dadu-app-imp/firestore.rules#L150-L156)  
    *What is broken*: Unauthenticated visitors can update `lastViewedAt` with arbitrary strings and spam `viewCount` increments.  
    *Suggested fix*: Require `request.resource.data.lastViewedAt is timestamp` and enforce exact increment `viewCount == resource.data.viewCount + 1`.  
    *Effort*: 15m

16. **Centralize and Migrate SuperAdmin Role to Custom Claims**  
    *Source*: L4 — `src/App.tsx:56`, `src/components/layout/Header.tsx:112`, `AdminUserManagementPage.tsx:599`, `EditUserModal.tsx:63`, `users.ts:35`  
    *What is broken*: SuperAdmin emails are hardcoded across 7 frontend and backend files, creating maintenance friction and bundle exposure.  
    *Suggested fix*: Centralize admin check in `src/domain/auth/authPolicy.ts` and migrate to Firebase Auth Custom Claims (`request.auth.token.role == 'ADMIN'`).  
    *Effort*: 45m

17. **Modularize `SettingsPage.tsx` into Lazy-Loaded Tabs**  
    *Source*: L5 — [`src/features/settings/SettingsPage.tsx`](file:///c:/Users/Administrator/Documents/ai/dadu/dadu-app-imp/src/features/settings/SettingsPage.tsx)  
    *What is broken*: 2,382-line monolith embeds 7 sub-apps into a single 106.6 kB chunk.  
    *Suggested fix*: Split into `src/features/settings/tabs/*` and lazy-load `BackupTab`, `StatsTab`, and `MaintenanceTab`.  
    *Effort*: 60m

18. **Parallelize Chunked Score Queries in `assessments.ts`**  
    *Source*: L5 — [`src/services/firestore/assessments.ts:299-306`](file:///c:/Users/Administrator/Documents/ai/dadu/dadu-app-imp/src/services/firestore/assessments.ts#L299-L306)  
    *What is broken*: Sequential `for ... of chunks` with `await getDocs` creates network waterfalls when loading student scores.  
    *Suggested fix*: Replace with `await Promise.all(chunks.map(chunk => getDocs(...)))`.  
    *Effort*: 15m

19. **Migrate `getDatabaseStatistics` to `getCountFromServer`**  
    *Source*: L5 — [`src/services/firestore/backup.ts:453-471`](file:///c:/Users/Administrator/Documents/ai/dadu/dadu-app-imp/src/services/firestore/backup.ts#L453-L471)  
    *What is broken*: Downloads all documents across 17 subcollections into memory just to count records for Settings > Stats.  
    *Suggested fix*: Replace `fetchCollectionData` with `getCountFromServer(collection(db, 'users', uid, colName))`.  
    *Effort*: 20m

20. **Eliminate Sequential Dashboard Page Waterfall**  
    *Source*: L5 — [`src/features/dashboard/DashboardPage.tsx:80-108`](file:///c:/Users/Administrator/Documents/ai/dadu/dadu-app-imp/src/features/dashboard/DashboardPage.tsx#L80-L108)  
    *What is broken*: `homeroomAttendance.getSession` awaits sequentially behind assessment scores even though it only depends on `homeroomClass`.  
    *Suggested fix*: Launch `homeroomAttendance.getSession` concurrently with the initial metrics `Promise.all`.  
    *Effort*: 15m

21. **Sub-Split Hub Pages (`MasterDataPage`, `TeacherHubPage`, etc.)**  
    *Source*: L5 — `MasterDataPage.tsx`, `HomeroomHubPage.tsx`, `TeacherHubPage.tsx`, `ReportsHubPage.tsx`  
    *What is broken*: Hub pages eagerly bundle all sub-tabs, generating ~180 kB chunks.  
    *Suggested fix*: Convert internal tab components (`GradesPage`, `SubjectAttendancePage`, `StudentsMasterPage`) to `React.lazy` imports.  
    *Effort*: 40m

22. **Migrate Hardcoded Indigo Modal Buttons to Semantic Tokens**  
    *Source*: L6 — [`TransferClassModal.tsx:171`](file:///c:/Users/Administrator/Documents/ai/dadu/dadu-app-imp/src/features/students/TransferClassModal.tsx#L171), [`StudentProgressReportModal.tsx:245`](file:///c:/Users/Administrator/Documents/ai/dadu/dadu-app-imp/src/features/students/StudentProgressReportModal.tsx#L245), [`StudentCustomPrintModal.tsx:574,876`](file:///c:/Users/Administrator/Documents/ai/dadu/dadu-app-imp/src/features/students/StudentCustomPrintModal.tsx#L574), [`ImportStudentsModal.tsx:899`](file:///c:/Users/Administrator/Documents/ai/dadu/dadu-app-imp/src/features/students/ImportStudentsModal.tsx#L899)  
    *What is broken*: Primary action buttons use hardcoded `bg-indigo-600 hover:bg-indigo-700 text-white`, ignoring active design system.  
    *Suggested fix*: Replace with semantic `.btn-primary` class.  
    *Effort*: 20m

23. **Harmonize Modal Z-Index Hierarchy and Backdrops**  
    *Source*: L6 — `ImportStudentsModal.tsx`, `StudentIdCardModal.tsx`, `SubjectAttendanceModal.tsx`  
    *What is broken*: Modal z-indexes fluctuate erratically from `z-10` to `z-[9990]`, and backdrops vary from none to heavy blur.  
    *Suggested fix*: Normalize standard modals to `z-50` with `bg-slate-900/60 backdrop-blur-xs` and keep confirm dialogs at `z-[9990]`.  
    *Effort*: 20m

24. **Connect F4 / Folio Setting to `@media print` Engine**  
    *Source*: L6 — [`src/features/reports/PrintDocumentLayout.tsx`](file:///c:/Users/Administrator/Documents/ai/dadu/dadu-app-imp/src/features/reports/PrintDocumentLayout.tsx) & [`src/index.css:438-440`](file:///c:/Users/Administrator/Documents/ai/dadu/dadu-app-imp/src/index.css#L438-L440)  
    *What is broken*: Print CSS uses static `size: auto;`, ignoring the user's F4/Folio selection and causing premature page overflow on printing.  
    *Suggested fix*: Inject dynamic print CSS: `@page { size: 215mm 330mm ${orientation}; margin: 10mm; }` when F4 is selected.  
    *Effort*: 25m

25. **Tune Apple Glass Accent Contrast for WCAG 2.2 AA**  
    *Source*: L6 — [`src/types/index.ts:167`](file:///c:/Users/Administrator/Documents/ai/dadu/dadu-app-imp/src/types/index.ts#L167) / [`src/index.css:42`](file:///c:/Users/Administrator/Documents/ai/dadu/dadu-app-imp/src/index.css#L42)  
    *What is broken*: White text on `#007AFF` buttons yields a 4.02:1 contrast ratio, failing the 4.5:1 AA threshold for normal text.  
    *Suggested fix*: Tune `apple-glass` accent color from `#007AFF` to `#0051D5` or `#005BD4`.  
    *Effort*: 10m

26. **Implement Application Layer Use Case Tests**  
    *Source*: L7 — `src/application/students/importStudents.usecase.ts`, `searchStudents.usecase.ts`, `checkHoliday.usecase.ts`, `loadWorkspace.usecase.ts`  
    *What is broken*: Core application use cases have 0% test coverage.  
    *Suggested fix*: Create unit tests with mocked repository ports for all 4 application use cases.  
    *Effort*: 60m

27. **Implement Design System & Single Source of Truth Contract Test**  
    *Source*: L7 — [`src/context/DesignSystemContext.tsx`](file:///c:/Users/Administrator/Documents/ai/dadu/dadu-app-imp/src/context/DesignSystemContext.tsx)  
    *What is broken*: No automated tests verify DOM attributes, token injection, or prevention of theme preference drift.  
    *Suggested fix*: Create `src/context/DesignSystemContext.test.tsx` testing attribute sync and `no-dual-source.md` rules.  
    *Effort*: 30m

28. **Implement Data Import Sanitizer Test Suite**  
    *Source*: L7 — [`src/utils/excelImportSanitizer.ts`](file:///c:/Users/Administrator/Documents/ai/dadu/dadu-app-imp/src/utils/excelImportSanitizer.ts)  
    *What is broken*: Critical sanitization logic for NISN, NIK, birth dates, and gender flags has 0% automated test coverage.  
    *Suggested fix*: Create `src/utils/excelImportSanitizer.test.ts` covering dirty Excel inputs and invalid data.  
    *Effort*: 30m

29. **Enforce Minimum CI Code Coverage Thresholds**  
    *Source*: L7 — [`vitest.config.ts`](file:///c:/Users/Administrator/Documents/ai/dadu/dadu-app-imp/vitest.config.ts)  
    *What is broken*: CI lacks coverage thresholds, allowing untested code to be merged without gate failure.  
    *Suggested fix*: Configure `test.coverage.thresholds` with 90% lines on `src/domain/**` and 80% on `src/utils/**`.  
    *Effort*: 15m

30. **Create Formal Annotated Git Release Tags for v2.2.0 and v2.3.0**  
    *Source*: L8 — Git Repository  
    *What is broken*: 0 Git release tags exist, complicating rollback targeting and automated releases.  
    *Suggested fix*: Run `git tag -a v2.2.0 fbd8bc0 -m "Release v2.2.0"` and `git tag -a v2.3.0 945d476 -m "Release v2.3.0"`.  
    *Effort*: 10m

31. **Add `check:boundaries` to GitHub Actions CI and `npm run ci`**  
    *Source*: L8 — [`.github/workflows/ci.yml:24-25`](file:///c:/Users/Administrator/Documents/ai/dadu/dadu-app-imp/.github/workflows/ci.yml#L24-L25) & [`package.json:169`](file:///c:/Users/Administrator/Documents/ai/dadu/dadu-app-imp/package.json#L169)  
    *What is broken*: Architecture boundary checks are missing from CI and `npm run ci`.  
    *Suggested fix*: Add `- name: Architecture Boundaries Check \n run: npm run check:boundaries` to `ci.yml` and include in `npm run ci`.  
    *Effort*: 10m

32. **Validate Vercel Production Environment Variables against Static Fallback**  
    *Source*: L8 — [`src/services/firebase/config.ts`](file:///c:/Users/Administrator/Documents/ai/dadu/dadu-app-imp/src/services/firebase/config.ts)  
    *What is broken*: App silently falls back to checked-in JSON config, obscuring missing Vercel environment variables.  
    *Suggested fix*: Add build-time assertion verifying `VITE_FIREBASE_*` presence in non-development builds.  
    *Effort*: 20m

33. **Add Missing Type Declaration for `VITE_FIRESTORE_FORCE_LONG_POLLING`**  
    *Source*: L8 — [`src/vite-env.d.ts`](file:///c:/Users/Administrator/Documents/ai/dadu/dadu-app-imp/src/vite-env.d.ts)  
    *What is broken*: `VITE_FIRESTORE_FORCE_LONG_POLLING` is missing from `ImportMetaEnv` interface.  
    *Suggested fix*: Add `readonly VITE_FIRESTORE_FORCE_LONG_POLLING?: string;` to `src/vite-env.d.ts`.  
    *Effort*: 5m

---

## P2 Priority Backlog

All 26 P2 issues represent code hygiene, polish, documentation, and long-term optimization items.

1. **Extract Magic Numbers & Limits into `src/constants/limits.ts`**  
   *Source*: L1 — `StudentsMasterPage.tsx:82`, `students.ts:47`, `backup.ts:328`  
   *What is broken*: Hardcoded query limits (`PAGE_SIZE = 25`, `limitPerToken = 100`, `maxBatchSize = 300`) scattered across files.  
   *Suggested fix*: Consolidate into `src/constants/limits.ts`.  
   *Effort*: 15m

2. **App Shell Root Background Conformance**  
   *Source*: L1 — [`src/components/layout/AppLayout.tsx:81`](file:///c:/Users/Administrator/Documents/ai/dadu/dadu-app-imp/src/components/layout/AppLayout.tsx#L81)  
   *What is broken*: Hardcoded `bg-[#f1f5f9] dark:bg-[#0C0E15]` overrides design system surface variable.  
   *Suggested fix*: Replace with `bg-[var(--ds-surface)]`.  
   *Effort*: 10m

3. **Clean Type Casts in ThemeContext**  
   *Source*: L1 — [`src/context/ThemeContext.tsx:107-108`](file:///c:/Users/Administrator/Documents/ai/dadu/dadu-app-imp/src/context/ThemeContext.tsx#L107-L108)  
   *What is broken*: `as unknown as any` casting used in theme setter shims.  
   *Suggested fix*: Align union types between `ThemeKey` and `DesignSystemKey`.  
   *Effort*: 10m

4. **Refactor 506 Arbitrary Hex Classes to Theme CSS Variables**  
   *Source*: L1 — Codebase-wide (506 instances)  
   *What is broken*: Raw hex classes (`bg-[#...]`, `text-[#...]`) bypass theme CSS variables.  
   *Suggested fix*: Gradually replace arbitrary hex values with theme semantic tokens.  
   *Effort*: 60m

5. **Expand Depcruise Boundaries to Disallow Direct Infrastructure Imports in Features**  
   *Source*: L2 — [`.dependency-cruiser.cjs`](file:///c:/Users/Administrator/Documents/ai/dadu/dadu-app-imp/.dependency-cruiser.cjs)  
   *What is broken*: Depcruise allows features to import repository implementations directly.  
   *Suggested fix*: Add `features-no-direct-infra` rule disallowing `src/features` from importing `src/infrastructure`.  
   *Effort*: 10m

6. **Decouple Inverted Type Dependencies in Ports**  
   *Source*: L2 — [`src/application/ports/*`](file:///c:/Users/Administrator/Documents/ai/dadu/dadu-app-imp/src/application/ports/)  
   *What is broken*: Ports import DTO types directly from `src/services/firestore/*`.  
   *Suggested fix*: Move DTO types to `src/types/` or `src/domain/`.  
   *Effort*: 25m

7. **Relocate Infrastructure Import in WorkspaceContext**  
   *Source*: L2 — [`src/context/WorkspaceContext.tsx:5`](file:///c:/Users/Administrator/Documents/ai/dadu/dadu-app-imp/src/context/WorkspaceContext.tsx#L5)  
   *What is broken*: Imports `DEFAULT_ATTENDANCE_SETTINGS` from infrastructure repository.  
   *Suggested fix*: Move constant to domain policy or types module.  
   *Effort*: 10m

8. **Eliminate Unsupported Method Stub in StudentCustomField Repository**  
   *Source*: L2 — [`studentCustomField.repository.ts`](file:///c:/Users/Administrator/Documents/ai/dadu/dadu-app-imp/src/infrastructure/firestore/repositories/studentCustomField.repository.ts)  
   *What is broken*: `saveAll` throws runtime exception to satisfy port interface.  
   *Suggested fix*: Implement Firestore batch save or remove method from port.  
   *Effort*: 15m

9. **Define Strongly Typed Container Interface Contract**  
   *Source*: L2 — [`src/application/ports/container.ts`](file:///c:/Users/Administrator/Documents/ai/dadu/dadu-app-imp/src/application/ports/container.ts)  
   *What is broken*: Container exports inferred literal rather than typed interface.  
   *Suggested fix*: Define and export `Container` interface contract.  
   *Effort*: 15m

10. **Deprecate Unused Repository Method `updateTheme`**  
    *Source*: L3 — `userRepository.ts` & `users.ts:79`  
    *What is broken*: Dead method creates confusion with single-source rules.  
    *Suggested fix*: Add `@deprecated` JSDoc annotations pointing to `updateDesignSystem`.  
    *Effort*: 5m

11. **Synchronize Package Versions across Package Manifests**  
    *Source*: L3 — `package.json` vs `package-lock.json`  
    *What is broken*: Potential version drift during manual dependency updates.  
    *Suggested fix*: Run `npm install --package-lock-only` on dependency bumps.  
    *Effort*: 5m

12. **Enforce Schema & Payload Size Constraints on Subcollections**  
    *Source*: L4 — [`firestore.rules:250-280`](file:///c:/Users/Administrator/Documents/ai/dadu/dadu-app-imp/firestore.rules#L250-L280)  
    *What is broken*: Subcollections like `settings` and `studentCustomFields` lack payload size limits.  
    *Suggested fix*: Add `request.resource.size() < 100 * 1024` guard in rules.  
    *Effort*: 15m

13. **Encourage Passcode Protection on Shared Reports**  
    *Source*: L4 — [`src/features/reports/ShareReportModal.tsx`](file:///c:/Users/Administrator/Documents/ai/dadu/dadu-app-imp/src/features/reports/ShareReportModal.tsx)  
    *What is broken*: Passcode-less shared reports store student records in plaintext.  
    *Suggested fix*: Display UI security recommendation urging passcode configuration.  
    *Effort*: 15m

14. **Implement In-Memory Client Query Cache / SWR**  
    *Source*: L5 — Data Layer  
    *What is broken*: Navigating between code-split tabs triggers redundant network queries.  
    *Suggested fix*: Implement lightweight query cache (5-minute stale time) for static master records.  
    *Effort*: 45m

15. **Optimize Google Font Loading in `index.html`**  
    *Source*: L5 — [`index.html:21-23`](file:///c:/Users/Administrator/Documents/ai/dadu/dadu-app-imp/index.html#L21-L23)  
    *What is broken*: Loads 5 Google Font families (16 variations) in render-blocking path.  
    *Suggested fix*: Self-host primary UI font via `@fontsource/plus-jakarta-sans` and load others asynchronously.  
    *Effort*: 25m

16. **Compress Public Images and Convert to WebP**  
    *Source*: L5 — `public/images/logo-kemenag.png`  
    *What is broken*: Uncompressed PNG images increase download footprint.  
    *Suggested fix*: Convert PNG to WebP and run SVGO on `logo-kemenag.svg`.  
    *Effort*: 15m

17. **Purge or Wire 21 Unused `--ds-*` Tokens**  
    *Source*: L6 — `DesignSystemContext.tsx` & `src/index.css`  
    *What is broken*: 21 injected tokens (spacing, font-scale, transitions) are unreferenced in CSS.  
    *Suggested fix*: Map tokens to Tailwind v4 theme variables or remove unneeded variables.  
    *Effort*: 25m

18. **Clean Up Dead `isSelectedDark` Checks in SettingsPage**  
    *Source*: L6 — [`src/features/settings/SettingsPage.tsx:1881-1951`](file:///c:/Users/Administrator/Documents/ai/dadu/dadu-app-imp/src/features/settings/SettingsPage.tsx#L1881-L1951)  
    *What is broken*: Live preview widget contains dead dark-mode ternary checks.  
    *Suggested fix*: Remove ternary operators and hardcoded hex values.  
    *Effort*: 15m

19. **Enforce `rounded-full` Token Override for Brutalism in `index.css`**  
    *Source*: L6 — [`src/index.css:88-120`](file:///c:/Users/Administrator/Documents/ai/dadu/dadu-app-imp/src/index.css#L88-L120)  
    *What is broken*: `rounded-full` pills escape Brutalism's 0px full-radius token.  
    *Suggested fix*: Add `[data-design-system="brutalism"] [class*="rounded-full"] { border-radius: var(--ds-radius-full) !important; }`.  
    *Effort*: 10m

20. **Add Horizontal Scroll Wrapper to Excel Import Preview Table**  
    *Source*: L6 — [`src/features/students/ImportStudentsModal.tsx`](file:///c:/Users/Administrator/Documents/ai/dadu/dadu-app-imp/src/features/students/ImportStudentsModal.tsx)  
    *What is broken*: Preview table clips columns on half-width window tiling.  
    *Suggested fix*: Wrap preview table in an `overflow-x-auto` container.  
    *Effort*: 10m

21. **Add Custom Hook Unit Tests**  
    *Source*: L7 — `src/hooks/` (9 hooks)  
    *What is broken*: Custom hooks (`useWorkspaceData`, `useStudents`, etc.) have 0% test coverage.  
    *Suggested fix*: Add tests using `@testing-library/react`'s `renderHook`.  
    *Effort*: 40m

22. **Add Component Unit Tests for Headless Primitives**  
    *Source*: L7 — `src/components/common/`  
    *What is broken*: Primitives like `Modal.tsx`, `ConfirmDialog.tsx`, and `TabNavigation.tsx` lack tests.  
    *Suggested fix*: Write unit tests verifying keyboard access and callbacks.  
    *Effort*: 40m

23. **Implement In-Memory Mock Repositories for Local Testing**  
    *Source*: L7 — `src/application/ports/`  
    *What is broken*: Testing features requires Firebase mocks or live instances.  
    *Suggested fix*: Create in-memory mock repositories conforming to port interfaces.  
    *Effort*: 45m

24. **Configure Playwright End-to-End (E2E) Test Suite**  
    *Source*: L7 — E2E Layer  
    *What is broken*: No automated tests verify full user journeys.  
    *Suggested fix*: Set up Playwright covering login, attendance taking, and report generation.  
    *Effort*: 60m

25. **Make `package.json` `"clean"` Script Cross-Platform**  
    *Source*: L8 — [`package.json:160`](file:///c:/Users/Administrator/Documents/ai/dadu/dadu-app-imp/package.json#L160)  
    *What is broken*: Script uses Unix `rm -rf dist server.js`, failing on Windows Command Prompt.  
    *Suggested fix*: Replace with cross-platform node script or rely on Vite's `emptyOutDir`.  
    *Effort*: 10m

26. **Add Deployment Architecture Documentation for Vercel CDN + Firebase BaaS**  
    *Source*: L8 — `README.md` & `docs/GITHUB-WORKFLOW-GUIDE.md`  
    *What is broken*: Absence of clear documentation explaining the multi-cloud separation.  
    *Suggested fix*: Add explicit deployment architecture section detailing Vercel vs Firebase CLI roles.  
    *Effort*: 15m

---

## G1-G13 Checklist (L6 UX)

Comprehensive evaluation of all 13 UX and Design System criteria:

| G | Feature | Status | Layer | Audit Findings & Verification |
| :---: | :--- | :---: | :---: | :--- |
| **G1** | Radius per system | ✅ Done / ⚠️ Partial | L6 UX | Coerced to `var(--ds-radius-*)`. *Gap:* `rounded-full` escapes Brutalism 0px override. |
| **G2** | Elevation per system | ✅ Done / ⚠️ Partial | L6 UX | Shadows coerced to `var(--ds-elevation-sm)`. *Gap:* Card depth hierarchy flatlined. |
| **G3** | Apple glass translucency `0.82` | ✅ Done | L6 UX | `backdrop-blur(24px)` and `rgba(255,255,255,0.82)` enforced on card surfaces. |
| **G4** | Neo text parity `[class*=text-slate-*]` | ✅ Done | L6 UX | Slate text mapped to `--text-main` / `--text-muted` in `index.css`. |
| **G5** | Font loading + serif headings | ✅ Done | L6 UX | Google Fonts loaded in `index.html`. Neo applies `var(--ds-font-serif)` to `h1, h2, h3`. |
| **G6** | `accent-glow` | ✅ Done | L6 UX | Injected in `src/index.css:305-307` and applied on `:focus` rings. |
| **G7** | Inline style leak scan | ⚠️ Issues Found | L6 UX | 17 occurrences found. No `!important` leaks, but `SettingsPage.tsx` has dead dark checks. |
| **G8** | Modal/toast/bottom-sheet per konteks | 🔴 Issues Found | L6 UX | **4 modals hardcoded `bg-indigo-600`.** Z-indexes range erratically from `z-10` to `z-[9990]`. |
| **G9** | Contextual styling inconsistency | ⚠️ Issues Found | L6 UX | 1,965 hardcoded matches. Coercions catch common classes but miss `bg-white/50` and `border-slate-300`. |
| **G10** | Print isolation verification (0 DS leak) | 🔴 Fail (P0) | L6 UX | `.printable-document` only resets colors. **Brutalist 4px borders and shadows leak into print sheets.** |
| **G11** | Contrast & a11y per system (WCAG 2.2 AA) | 🔴 Fail (P0) | L6 UX | **Brutalism `#FFE500` on white is 1.28:1 (severe failure).** Apple Glass button is 4.02:1 (< 4.5:1). |
| **G12** | Modal dialog pop-up responsif | ⚠️ Issues Found | L6 UX | Modals centered. *Gaps:* `ImportStudentsModal` lacks horizontal table scroll; short viewports clip actions. |
| **G13** | Responsiveness per device & screen size | ✅ Mostly Done | L6 UX | 17/20 tables implement `overflow-x-auto`. Mobile sidebar and bottom nav adapt cleanly. |

---

## G14 Rekomendasi Tema Baru (Backlog)

Mathematical contrast calculations and feasibility assessment for candidate design systems (read-only research, no source changes):

| Candidate Theme | Target Aesthetic & Philosophy | Proposed Palette Tokens | WCAG 2.2 AA Contrast Ratios | Implementation Effort | Grade & Status |
| :--- | :--- | :--- | :--- | :--- | :---: |
| **1. Material You M3 (Emerald Teal)** | Modern Android 15 / Material Design 3 Academic. Tonal surfaces, tactile pill buttons, soft container tinting. | `accent: #006A60`<br>`accentFg: #FFFFFF`<br>`surface: #F4FAF8`<br>`surfaceElevated: #FFFFFF`<br>`border: #CCE8E2`<br>`text: #0E1F1D`<br>`textMuted: #3F4947` | • Accent on Canvas: **6.15:1** (AA ✅)<br>• Text on Canvas: **16.13:1** (AAA ✅)<br>• Button Text: **6.50:1** (AA ✅)<br>• Muted Text: **8.81:1** (AAA ✅) | **Low** (Uses standard Inter font, tokens drop directly into `DESIGN_SYSTEMS`) | 🌟 **Grade A+** (Top Recommendation) |
| **2. Nord Frost Academic** | Arctic, north-bluish clean design based on Nord palette. Calm, soothing, reduces eye strain during long grading sessions. | `accent: #2E5B88`<br>`accentFg: #FFFFFF`<br>`surface: #F8FAFC`<br>`surfaceElevated: #FFFFFF`<br>`border: #D8DEE9`<br>`text: #2E3440`<br>`textMuted: #4C566A` | • Accent on Canvas: **6.76:1** (AA ✅)<br>• Text on Canvas: **11.94:1** (AAA ✅)<br>• Button Text: **7.08:1** (AAA ✅)<br>• Muted Text: **7.05:1** (AA ✅) | **Low** (Clean hex tokens, zero custom fonts needed) | 🌟 **Grade A+** (Highly Recommended) |
| **3. Shadcn Zinc Minimalist** | High-density monochrome design popular in modern developer tools. Maximum text crispness. | `accent: #18181B`<br>`accentFg: #FAFAFA`<br>`surface: #F4F4F5`<br>`surfaceElevated: #FFFFFF`<br>`border: #E4E4E7`<br>`text: #09090B`<br>`textMuted: #71717A` | • Accent on Canvas: **16.12:1** (AAA ✅)<br>• Text on Canvas: **18.10:1** (AAA ✅)<br>• Button Text: **16.97:1** (AAA ✅)<br>• Muted Text: **4.40:1** (⚠️ Marginal Fail) | **Low** (Standard Tailwind Zinc scale) | 🟡 **Grade A-** (Viable with `textMuted` tweak) |
| **4. Solarized Warm Scholar** | Classic Ethan Schoonover palette calibrated for reading long scholastic ledgers. Warm parchment tint. | `accent: #076678`<br>`accentFg: #FFFFFF`<br>`surface: #FDF6E3`<br>`surfaceElevated: #FFFFFF`<br>`border: #D5C4A1`<br>`text: #002B36`<br>`textMuted: #657B83` | • Accent on Canvas: **6.12:1** (AA ✅)<br>• Text on Canvas: **13.92:1** (AAA ✅)<br>• Button Text: **6.60:1** (AA ✅)<br>• Muted Text: **4.13:1** (⚠️ Fail < 4.5:1) | **Medium** (Requires careful border tuning on parchment) | 🟡 **Grade B+** (Viable as 5th Scholar Theme) |

---

## Metodologi — Linear Phase A→E Verification

The audit and remediation lifecycle follows a strict linear sequence where each phase must pass its verification criteria before advancing to downstream layers:

| Phase | Lapis yang Diaudit & Diremediasi | Estimasi Durasi | Dependensi & Prasyarat | Kriteria Lolos (Verification Gate) |
| :---: | :--- | :---: | :--- | :--- |
| **Phase A** | **L1 (Code Quality)** + **L2 (Architecture)** | ~25 min | Baseline / Clean git state | `npm run check` (0 errors), 0 direct infra bypasses, no unmanaged timer lifecycles |
| **Phase B** | **L3 (Data & DB)** + **L4 (Security)** | ~35 min | Phase A passed | `firestore.indexes.json` updated & deployed, `firestore.rules` hardened against privilege escalation |
| **Phase C** | **L5 (Performance)** | ~30 min | Phase B passed | Dead XLSX import removed, dynamic `import('xlsx')` applied, `WorkspaceProvider` guarded |
| **Phase D** | **L6 (UX & Design System)** | ~45 min | Phase C passed | Print boundary isolation verified (0 DS leak), Brutalism badge contrast fixed, modal buttons harmonized |
| **Phase E** | **L7 (Test & QA)** + **L8 (Ops & Deploy)** | ~35 min | Phase D passed | `users.test.ts` fixed, `npm test` 100% green, CI boundary check added, Git release tags created |

---

## Next Steps

1. **Immediate (Next 1-2 Days)**:
   - **Fix CI Blocker**: Patch `users.test.ts` mock to resolve `mockGetDoc` returning `undefined` for `createUserProfile` and restore 100% green tests in `npm test` and `npm run ci`.
   - **Harden Firestore Security Rules**: Patch `allow create` on `users/{userId}` to prevent `role: 'ADMIN'` privilege escalation, and add `email_verified == true` to `isSuperAdmin()`.
   - **Deploy Composite Indexes**: Add missing composite indexes for `classes` and `enrollments` to `firestore.indexes.json` and deploy via `firebase deploy --only firestore`.
   - **Neutralize Print Leaks**: Enforce `border-width: 1px !important;` and `box-shadow: none !important;` on `.printable-document` in `src/index.css`.
   - **Remove Dead XLSX Bundle**: Delete line 45 `import * as XLSX from 'xlsx';` in `SettingsPage.tsx` to save 424.7 kB instantly.

2. **Medium-Term (Sprint 1)**:
   - Convert all remaining 18 XLSX static imports to dynamic `import('xlsx')`.
   - Guard `<WorkspaceProvider>` in `App.tsx` behind authentication.
   - Modularize `SettingsPage.tsx` into tab subcomponents under `src/features/settings/tabs/`.
   - Synchronize repository port signatures with `misc.repository.ts` and eliminate `(container.repos as any)` casts.
   - Migrate hardcoded `bg-indigo-600` modal buttons to `.btn-primary`.
   - Create annotated Git release tags: `git tag -a v2.2.0 fbd8bc0 -m "Release v2.2.0"` and `git tag -a v2.3.0 945d476 -m "Release v2.3.0"`.

3. **Long-Term (Backlog & Polish)**:
   - Implement Firebase App Check with reCAPTCHA Enterprise.
   - Implement unit test suites for application use cases (`importStudents`, `searchStudents`, `checkHoliday`, `loadWorkspace`) and `excelImportSanitizer`.
   - Evaluate introducing **Material You M3 (Emerald Teal)** or **Nord Frost Academic** as the 4th official design system candidate per G14.
   - Set up Playwright end-to-end integration tests for the primary teacher golden path.
