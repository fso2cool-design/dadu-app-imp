# DADU — Architecture Document

> **Version**: 2.4.0 | **Last Updated**: 2026-10-11 | **Baseline Commit**: `83e0b50` (main)

---

## 1. Application Overview

**Dadu** (Digitalisasi Data Guru) is a production SPA for Indonesian Madrasah teachers to manage:

- Academic years, semesters, classes, subjects, and teaching assignments
- Student enrollment, attendance (subject & daily/homeroom), grades/assessments
- Meeting journals, teacher attendance tracking, class schedules
- Reports (attendance, grades, legger/rapor), shared public reports with encryption
- Student notes/guidance, custom student fields, deduplication
- School & document settings, signature pads, official document generation
- Onboarding wizard, feedback/bug reporting, dark theme
- Resilient UI error boundaries, loading skeletons, and high-speed WebChannel streaming

**Production URL**: Deployed on Vercel (static SPA with `vercel.json` rewrites)

---

## 2. Technology Stack

| Layer | Technology | Version | Role |
|---|---|---|---|
| **UI Framework** | React | 19.0.1 | Modern declarative UI with StrictMode & concurrent features |
| **Language** | TypeScript | ~5.8.2 | Strict type safety (`strict`, `noUncheckedIndexedAccess`) |
| **Routing** | React Router | 7.13.0 | URL-driven navigation, browser history, bookmarking |
| **Build Tool** | Vite | 6.2.3+ | Sub-second HMR & dynamic code-splitting with vendor chunks |
| **CSS** | Tailwind CSS | 4.1.14 | Utility-first responsive design (native Vite plugin) |
| **Linter / Formatter** | Biome | 2.4.6 | Fast Rust-based linter and formatter |
| **Testing** | Vitest + RTL + JSDOM | 5.0.1 | Vite-native unit testing, React component testing, V8 coverage |
| **Icons** | lucide-react | 0.546.0 | Modern SVG icon system |
| **Animations** | motion (Framer Motion) | 12.23.24 | Smooth micro-animations and modal transitions |
| **Spreadsheets** | xlsx (SheetJS) | 0.18.5 | Client-side Excel import and export |
| **Backend/Auth** | Firebase Authentication | 12.18.0 | Email/Password auth with session tracking |
| **Database** | Cloud Firestore | 12.18.0 | Multi-tab persistent cache + WebChannel streaming |
| **Hosting & CI/CD** | Vercel & GitHub Actions | — | Continuous integration and preview deployments |

---

## 3. Project Structure

```text
dadu-app-imp/
├── .github/
│   └── workflows/ci.yml         # GitHub Actions CI workflow (lint, type-check, test, build)
├── docs/
│   ├── DADU-ARCHITECTURE.md     # Architecture & system design document
│   ├── DADU-ERD.md              # Visual Entity-Relationship Diagram (Mermaid)
│   └── GITHUB-WORKFLOW-GUIDE.md # Branch protection and preview deployment guide
├── public/                      # Static assets (favicons, manifest.json, logo)
├── src/
│   ├── main.tsx                 # React root mount (StrictMode)
│   ├── App.tsx                  # Root ErrorBoundary, Router, Providers, and AppLayout
│   ├── index.css                # Global styles + Tailwind v4
│   ├── types/index.ts           # Centralized TypeScript interfaces
│   ├── domain/                  # Domain policies & pure domain types (periodPolicy, attendancePolicy, etc.)
│   ├── application/             # Application Layer (ApplicationOperations, use-cases, repository ports)
│   │   ├── ApplicationContext.tsx # ApplicationProvider & useApplication React context
│   │   ├── types.ts             # ApplicationOperations interface definition
│   │   ├── ports/               # Hexagonal repository port contracts and container
│   │   ├── workspace/           # Workspace use-cases (loadWorkspace)
│   │   └── students/            # Student use-cases (importStudents)
│   ├── infrastructure/          # Infrastructure Layer (Firestore repository adapters)
│   │   └── firestore/
│   │       └── repositories/    # Concrete repository implementations conforming to ports
│   ├── design-system/
│   │   └── tokens.ts            # Design token contracts (DesignColorTokens, InvariantTokens) & APPEARANCE_PRESETS
│   ├── context/
│   │   ├── WorkspaceContext.tsx # Academic data loader (classes, subjects, etc.)
│   │   ├── AppearanceContext.tsx # Runtime appearance state (AppearanceProvider, useAppearance)
│   │   ├── appearanceDom.ts     # DOM & CSS variable synchronization (applyAppearanceToDom)
│   │   ├── legacyMappings.ts    # Default preset & legacy theme/preset fallback resolution
│   │   └── ToastContext.tsx     # Toast notification system
│   ├── features/
│   │   ├── admin/               # Admin user management, storage stats, feedback tab
│   │   ├── auth/                # AuthContext, LoginPage, WorkflowDemoModal
│   │   ├── dashboard/           # DashboardPage (with schedule skeletons)
│   │   ├── grades/              # Assessment items, score entry, paste Excel
│   │   ├── homeroom/            # Homeroom hub (daily attendance, class schedule, notes)
│   │   ├── master/              # Academic years, classes, subjects, assignments
│   │   ├── onboarding/          # 6-step onboarding wizard
│   │   ├── public/              # Public report viewer (shared reports)
│   │   ├── reports/             # Attendance, grades, legger skeletons, print
│   │   ├── settings/            # Settings page (school, document, preferences)
│   │   ├── students/            # Student CRUD, import, dedup, table skeletons
│   │   └── teacher/             # Teacher hub (meetings, attendance, schedule)
│   ├── components/
│   │   ├── common/              # Shared components (ErrorBoundary, Skeleton, Modal, etc.)
│   │   ├── layout/              # AppLayout, Sidebar, Header, BottomNav
│   │   └── ui/                  # Design system UI primitives (Button, Card, Input, Select)
│   ├── routes/
│   │   ├── paths.ts             # Route definitions & bidirectional legacy adapter
│   │   └── paths.test.ts        # Unit tests for routing adapter
│   ├── services/
│   │   ├── firebase/config.ts   # Firebase App, Auth, Firestore (WebChannel streaming)
│   │   └── firestore/           # 23 Firestore service modules with JSDoc
│   ├── test/                    # Vitest setup and browser polyfills
│   └── utils/                   # date, excel sanitizer, name formatter, crypto, sync events
├── firestore.indexes.json       # Firestore composite index definitions
├── firestore.rules              # Multi-tenant Firestore security rules
├── biome.json                   # Biome linter configuration
├── tsconfig.json                # TypeScript compiler configuration (strict)
├── vite.config.ts               # Vite build config with vendor chunks & visualizer
└── vitest.config.ts             # Vitest test runner configuration
```

---

### 3.1 Hexagonal Architecture & Architectural Layers

DADU enforces a Clean / Hexagonal (Ports & Adapters) architectural structure:

1. **Domain Layer (`src/domain/`)**:
   - Contains pure business policies and domain rules completely independent of UI, React, or Firebase.
   - Examples: `periodPolicy.ts` (resolving academic year label, semester boundary calculation, and year spans), `attendancePolicy.ts`, `assessmentPolicy.ts`.
   - Defines pure domain types such as `backup.types.ts`, `diagnostics.types.ts`, `deduplication.types.ts`, `relationshipRecovery.types.ts`.

2. **Application Layer (`src/application/`)**:
   - Defines the top-level application contract (`ApplicationOperations` in `src/application/types.ts`) exposed via `app.*` and DI root `container.app`.
   - Houses application use-cases (`loadWorkspace.usecase.ts`, `importStudents.usecase.ts`).
   - Defines strongly typed, hardened repository ports (`src/application/ports/*Repository.ts`).

3. **Infrastructure Layer (`src/infrastructure/`)**:
   - Implements repository ports via concrete Cloud Firestore adapters (`src/infrastructure/firestore/repositories/*`).
   - Adheres to repository port interfaces without leaking Firestore-specific SDK types into the domain.

4. **Presentation / Feature Layer (`src/features/`, `src/components/`, `src/context/`)**:
   - React 19 UI components consuming high-level application operations via `useApplication()` (`app.*`).
   - The Application Container (`src/application/ports/container.ts`) wires infrastructure repository adapters directly to `app` and application use-cases, keeping UI components strictly decoupled from persistence details.

---

### 3.2 Canonical Application Namespaces (Milestone B4 Decomposition)

The monolithic `app.settings` namespace has been decomposed into distinct, domain-aligned application boundaries. The canonical `ApplicationOperations` interface (`src/application/types.ts`) exposes 17 dedicated namespaces:

| Application Namespace | Responsibility | Operations |
|---|---|---|
| **`app.settings`** | Genuine school metadata & official document configuration | `getSchoolSettings`, `saveSchoolSettings`, `getDocumentSettings`, `saveDocumentSettings` |
| **`app.maintenance`** | Workspace backup/restore lifecycle & semester reset | `exportBackup`, `importBackup`, `getDatabaseStats`, `previewResetSemester`, `resetSemesterData` |
| **`app.diagnostics`** | System referential integrity audit & relation recovery | `runIntegrityAudit`, `findStudentCandidatesByNisn`, `relinkEnrollmentClass`, `relinkStudentRelationship` |
| **`app.classSchedule`** | Class timetable management (deterministic key: `{classId}_{ayId}_{sem}`) | `getClassSchedule`, `saveClassSchedule`, `deleteClassSchedule` |
| **`app.appearance`** | Appearance preset & color mode preference persistence | `updateAppearancePresetPreference`, `updateModePreference` |
| **`app.workspace`** | Academic workspace loader & settings | `loadWorkspace`, `getUserPreferences`, `saveUserPreferences`, `saveAttendanceSettings`, `checkHoliday` |
| **`app.auth`** | User authentication, profile lifecycle, session recording, admin claim verification | `getProfile`, `createProfile`, `recordLastLogin`, `updateProfile`, `login`, `signup`, `logout`, `resetPassword`, `onAuthStateChanged`, `getAdminClaimStatus` |
| **`app.students`** | Student master records, import, search, custom fields, notes, deduplication | `getAll`, `getPaginated`, `getById`, `create`, `update`, `delete`, `import`, `search`, `searchByExactIdentifier`, `searchByNameToken`, `checkUsage`, `canDelete`, `archive`, `unarchive`, `checkNisnAvailability`, `batchCreate`, `scanDuplicates`, `executeDeduplication`, `getCustomFields`, `saveCustomFields`, `createCustomField`, `updateCustomField`, `deleteCustomField`, `getStudentNotes`, `getStudentNotesByClass`, `createStudentNote`, `updateStudentNote`, `deleteStudentNote` |
| **`app.enrollment`** | Student class enrollments, transfers, roll numbers | `getByClass`, `getByAcademicYear`, `create`, `update`, `archive`, `canDelete`, `batchEnroll`, `batchReorderRollNumbers`, `transfer`, `delete` |
| **`app.master`** | Master academic data (years, classes, subjects, assignments) | `academicYears.*`, `classes.*`, `subjects.*`, `teachingAssignments.*` |
| **`app.meetings`** | Teaching journal & meeting agenda CRUD | `getAll`, `getById`, `create`, `update`, `delete` |
| **`app.attendance`** | Unified subject, homeroom daily roll-call, and teacher attendance | `saveSubjectAttendance`, `saveMeetingAttendance`, `getByMeeting`, `getByMeetingIds`, `getByAssignment`, `getByDate`, `getByClassAndPeriod`, `saveDailyAttendance`, `getDailySession`, `getDailyAttendanceRecords`, `getAllDailyForClass`, `getMonthlyDaily`, `getHomeroomAssignments`, `getTeacherAttendance`, `getMonthlyTeacherAttendance`, `getMonthlyAttendance`, `saveTeacherAttendance`, `saveMonthlyAttendance` |
| **`app.grades`** | Assessment items & grade score matrix | `getAssessmentItems`, `getAssessmentItemById`, `createAssessmentItem`, `updateAssessmentItem`, `deleteAssessmentItem`, `canDeleteAssessmentItem`, `getScoresByItemIds`, `saveScoresBatch`, `saveMatrixScores` |
| **`app.reports`** | Shared encrypted reports | `createSharedReport`, `getSharedReportByToken`, `getUserSharedReports`, `deleteSharedReport`, `revokeSharedReport`, `decrypt`, `incrementView` |
| **`app.admin`** | School administrator operations & user governance | `getAllUsers`, `setAccountStatus`, `setAccountRole`, `adminUpdateProfile`, `getStorageStats`, `purgeWorkspace`, `purgeOrphans`, `scanOrphans`, `getFeedbackList`, `updateFeedbackStatus`, `deleteFeedback` |
| **`app.onboarding`** | 6-step teacher onboarding wizard submission | `submitOnboarding` |
| **`app.feedback`** | Bug reporting & feature requests | `create`, `getUnreadCount` |

---

### 3.3 Application Operations vs. Repository Ports

A fundamental architectural distinction exists between **Application APIs** and **Repository Ports**:

- **Application APIs (`app.*` / `ApplicationOperations`)**:
  Provide user-facing, task-oriented entry points for features consumed via `useApplication()`. They orchestrate domain policies, trigger cross-cutting events (such as `trackSync`), and compose multiple repositories into cohesive application use-cases.
  *Example*: `app.maintenance.exportBackup(uid)` coordinates metadata assembly and returns a typed `DatabaseBackup` domain object.

- **Repository Ports (`*Repository` in `src/application/ports/`)**:
  Provide low-level, collection-specific persistence contracts implemented by concrete infrastructure adapters in `src/infrastructure/firestore/repositories/` and wired into `container.app` and `container.useCases`.
  *Example*: `backupRepository.exportFullDatabase(uid)` executes the physical batch reads across subcollections.

Similarly, for homeroom attendance:
- **Application API**: `app.attendance.getDailySession` and `app.attendance.getAllDailyForClass` coordinate presentation queries.
- **Repository Port**: `homeroomAttendanceRepository.getSession` and `homeroomAttendanceRepository.getAllForClass` execute the Firestore document queries.

---

### 3.4 Hardened Repository Ports & Adapters (Milestones B2 & B3)

Repository ports in `src/application/ports/` are strictly typed and explicitly implemented by infrastructure adapters in `src/infrastructure/firestore/repositories/`:

| Repository Port | Canonical Port Contract | Status / Alignment |
|---|---|---|
| **`BackupRepository`** | `exportFullDatabase`, `importFullDatabase`, `getDatabaseStatistics`, `resetSemesterData`, `previewSemesterReset` | Hardened. Obsolete generic `exportAll` / `importAll` purged. |
| **`DiagnosticsRepository`** | `runIntegrityAudit` | Hardened. Obsolete generic `run` purged. |
| **`ClassScheduleRepository`** | `getScheduleDocId`, `getClassSchedule`, `saveClassSchedule`, `deleteClassSchedule` | Hardened. Obsolete generic `getAll` / `save` purged. |
| **`DeduplicationRepository`** | `scanDuplicateStudents`, `executeZeroResidueDeduplication` | Hardened. Obsolete generic `findDuplicates` / `merge` purged. |
| **`RelationshipRecoveryRepository`** | `findStudentCandidatesByNisn`, `relinkEnrollmentClass`, `relinkStudentRelationship` | Hardened. Obsolete generic `scan` / `recover` purged. |
| **`OnboardingRepository`** | `submitOnboarding` | Hardened. Obsolete generic `getStatus` / `complete` purged. |
| **`SettingsRepository`** | `getSchoolSettings`, `saveSchoolSettings`, `getDocumentSettings`, `saveDocumentSettings`, `getUserPreferences`, `saveUserPreferences`, `getAttendanceSettings`, `saveAttendanceSettings` | Hardened. Obsolete generic `get` / `save` purged. |
| **`HomeroomAttendanceRepository`** | `getAllForClass`, `getByDate`, `getSession`, `getMonthly`, `saveDailyAttendance` | Hardened. Redundant adapter aliases (`getAllDailyForClass`, `getDailySession`) purged from adapter. |
| **`FeedbackRepository`** | `getAll`, `getUnreadCount`, `updateStatus`, `delete`, `create` | Hardened. Explicit domain typing for feedback item CRUD and unread count. |
| **`SharedReportRepository`** | `create`, `getByToken`, `decrypt`, `incrementView`, `getUserReports`, `revoke`, `delete`, `generateToken` | Hardened. Strongly typed parameter and payload contracts. |

---

### 3.5 Design System & Appearance Architecture

DADU separates its singular **Design System** (token contracts, `--ds-*` CSS custom property namespace, and reusable UI primitives in `src/components/ui/`) from **Appearance** (runtime user-preference orchestration combining an **Appearance Preset** with a **Color Mode**):

```text
DADU Design System
    │
    ├── token contracts (DesignColorTokens, InvariantTokens)
    ├── semantic CSS variables (--ds-*)
    └── reusable UI primitives (src/components/ui/)
             │
             ▼
      Appearance Presets (APPEARANCE_PRESETS: AppearancePreset[])
      ├── paper-craft
      ├── shadcn-ui
      └── neo-brutalism
             │
             +
         Color Mode (ColorMode)
       light | dark
             │
             ▼
      AppearanceProvider (src/context/AppearanceContext.tsx)
             │
             ▼
    applyAppearanceToDom() (src/context/appearanceDom.ts)
             │
             ▼
        DOM / CSS
```

- **Core Modules**:
  - `src/design-system/tokens.ts`: Defines `AppearancePresetKey`, `ColorMode`, `DesignColorTokens`, `InvariantTokens`, `AppearancePreset`, and the `APPEARANCE_PRESETS: AppearancePreset[]` registry.
  - `src/context/legacyMappings.ts`: Defines `DEFAULT_APPEARANCE_PRESET`, `LEGACY_PRESET_MAPPINGS`, `isValidAppearancePreset`, `resolveAppearancePreset`, and `mapLegacyThemeToAppearancePreset`.
  - `src/context/AppearanceContext.tsx`: Implements `AppearanceProvider`, `AppearanceContext`, and `useAppearance()`.
  - `src/context/appearanceDom.ts`: Implements `applyAppearanceToDom(root, { preset, mode, tokens, colors })`.

- **Canonical Appearance Presets & Color Modes**:
  ```typescript
  // src/design-system/tokens.ts
  export type AppearancePresetKey = 'paper-craft' | 'neo-brutalism' | 'shadcn-ui';
  export type ColorMode = 'light' | 'dark';
  export const APPEARANCE_PRESETS: AppearancePreset[] = [/* paper-craft, shadcn-ui, neo-brutalism */];

  // src/context/legacyMappings.ts
  export const DEFAULT_APPEARANCE_PRESET: AppearancePresetKey = 'shadcn-ui';
  ```
  - **Runtime Resolution**: `DEFAULT_APPEARANCE_PRESET = 'shadcn-ui'` is the semantic preset default, and `'light'` is the current default `ColorMode`. The active preset definition is resolved from `APPEARANCE_PRESETS` by ID. Current implementation defensively falls back to `APPEARANCE_PRESETS[1]`, which currently resolves to `shadcn-ui`; this is an ordering-dependent implementation detail rather than an architectural contract.
  - **`shadcn-ui` Clarification**: `shadcn-ui` is the identifier of a DADU appearance preset; it does not indicate that DADU's UI primitives are implemented using the external shadcn/ui component library.

- **Legacy Preset Mappings (`LEGACY_PRESET_MAPPINGS`)**:
  To preserve backward compatibility with previously persisted user configurations, 11 historical theme/preset keys are mapped on read to active presets via `resolveAppearancePreset` and `mapLegacyThemeToAppearancePreset`:
  - `'atelier'` ➔ `'neo-brutalism'`
  - `'minimalist'` ➔ `'shadcn-ui'`
  - `'brutalism'` ➔ `'paper-craft'`
  - `'neo-skeuomorphic'` ➔ `'shadcn-ui'`
  - `'apple-glass'` ➔ `'neo-brutalism'`
  - `'light'` ➔ `'shadcn-ui'`
  - `'dark-crimson'` ➔ `'neo-brutalism'`
  - `'obsidian-tactile'` ➔ `'neo-brutalism'`
  - `'swiss-manuscript'` ➔ `'shadcn-ui'`
  - `'solarized-comfort'` ➔ `'neo-brutalism'`
  - `'chalkboard-school'` ➔ `'paper-craft'`
  *Important*: These 11 keys are read-only compatibility aliases and are not selectable presets.

- **Persistence Precedence & Read Fallback**:
  - **Preset Read Precedence**:
    1. `profile.designSystemPreference` (from Firestore `users/{uid}`, resolved via `resolveAppearancePreset`)
    2. `profile.themePreference` (deprecated legacy read-fallback, mapped via `mapLegacyThemeToAppearancePreset`)
    3. `localStorage.getItem('app_design_system_${uid}')` (resolved via `resolveAppearancePreset`)
    4. Default: `DEFAULT_APPEARANCE_PRESET` (`'shadcn-ui'`)
  - **Mode Read Precedence**:
    1. `profile.designSystemModePreference` (`'light' | 'dark'`)
    2. `localStorage.getItem('app_design_system_mode_${uid}')` (`'dark'` if `'dark'`, else `'light'`)
    3. Default: `'light'`
  - **Canonical Writes**:
    - `applyAndSavePreset` persists the selected appearance preset to the user-scoped `localStorage` key (`app_design_system_${uid}`) and to `users/{uid}.designSystemPreference` through `app.appearance`. Current writes never update the legacy `themePreference` field.
    - `applyAndSaveMode` (`setMode` / `toggleMode`) persists the selected color mode to the user-scoped `localStorage` key (`app_design_system_mode_${uid}`) and to `users/{uid}.designSystemModePreference` through `app.appearance`.

- **Compatibility Contracts & Naming Classification**:
  Persisted/external compatibility contracts are distinguished from internal source-level APIs by their actual role:
  1. **Canonical but historically named persistence contracts**:
     - Persisted Firestore fields: `UserProfile.designSystemPreference` (stores active `AppearancePresetKey`) and `UserProfile.designSystemModePreference` (stores active `ColorMode`)
     - Browser storage keys: `app_design_system_${uid}` and `app_design_system_mode_${uid}` (per-user `localStorage` keys)
  2. **Explicit legacy compatibility fields & bridges**:
     - `UserProfile.themePreference` (read-only fallback field for pre-v2.3.0 user profiles; never written)
     - `LEGACY_PRESET_MAPPINGS` and `mapLegacyThemeToAppearancePreset` (one-way legacy preset/theme resolver)
     - Legacy CSS custom properties (`--accent-primary`, `--accent-primary-text`, `--app-bg`, `--card-bg`, `--card-border`, `--text-main`, `--text-muted`) mirrored by `applyAppearanceToDom` for legacy component and print compatibility
  3. **Stable DOM & CSS contracts**:
     - `--ds-*` (35 CSS custom properties injected on `:root` representing the foundational DADU Design System token namespace)
     - `data-design-system="<preset>"` (attribute on `<html>` targeted by preset-specific selector rules in `src/index.css`)
     - `.dark` (class toggled on `<html>` when `mode === 'dark'`, driving Tailwind v4 `@custom-variant dark`)
     - Canonical preset identifiers (`'paper-craft'`, `'shadcn-ui'`, `'neo-brutalism'`)
  4. **Internal appearance persistence APIs**:
     - `app.appearance.updateAppearancePresetPreference(uid, preset)`, `userRepository.updateAppearancePresetPreference(uid, preset)`, and `updateUserAppearancePresetPreference(uid, preset)` use canonical appearance preset naming in TypeScript while writing to the persisted Firestore field `designSystemPreference`. `app.appearance.updateModePreference(uid, mode)` writes to `designSystemModePreference`.

- **Print / Document Visual Isolation**:
  - Containers marked with `.printable-document`, `.print-sheet`, `#printable-progress-report` (and their descendants) isolate printed official reports from active visual presets:
    - Forces pure white background (`--ds-surface: #ffffff`, `--app-bg: #ffffff`)
    - Forces high-contrast slate text (`--ds-text: #0f172a`, `--text-main: #0f172a`) and border (`--ds-border: #e2e8f0`)
    - Locks `color-scheme: light`
    - Strips all design system shadow and border radius artifacts: `box-shadow: none !important`, `text-shadow: none !important`, `border-radius: 0 !important`
  - Guarantees formal madrasah reports (rapor, legger, student ID cards) render cleanly regardless of the user's active preset or dark mode.

- **Active Runtime Context vs. Legacy Theme Scope**:
  - Features consume `useAppearance()` from `src/context/AppearanceContext.tsx` and persistence operations on `app.appearance`. Earlier theme/system context symbols (`ThemeContext`, `ThemeProvider`, `useAppTheme`, `DesignSystemContext`, `DesignSystemProvider`, `useDesignSystem`, `activeSystem`, `setSystem`) are not part of the runtime architecture.
  - The term `theme` is deprecated only as active DADU appearance architecture vocabulary. Valid remaining uses include explicit legacy compatibility boundaries (`UserProfile.themePreference`, `mapLegacyThemeToAppearancePreset(...)`, legacy compatibility tests) and unrelated standards/platform terminology such as `<meta name="theme-color">`.

---

## 4. Routing Architecture

The application uses **React Router v7** (`react-router-dom`) with URL-driven navigation, browser history, and deep-link bookmarking.

### 4.1 Route Hierarchy & Page Resolution

Inside [`src/App.tsx`](../src/App.tsx):

```text
ErrorBoundary (Root, isRoot)
└── RouterProvider (router={appRouter})
    └── AppShell
        └── ApplicationProvider (app={container.app})
            └── AuthProvider
                └── AppearanceProvider
                    └── ToastProvider
                        └── MainApp
                            ├── publicShareToken? (URL /share/:token or ?share=:token) → PublicReportViewerPage (isolated, lightweight)
                            ├── authLoading? → LoadingScreen
                            ├── !user? → LoginPage (isolated, lightweight)
                            └── Authenticated User:
                                └── WorkspaceProvider (loads academic years, classes, subjects, etc.)
                                    └── AuthenticatedApp
                                        ├── !profile || workspaceLoading? → LoadingScreen
                                        ├── profile.accountStatus === 'SUSPENDED' → Suspended notice
                                        ├── isAdmin && location.pathname === '/admin' → AdminUserManagementPage
                                        ├── !profile.isOnboarded? → OnboardingWizard
                                        └── Authenticated Pages:
                                            └── AppLayout
                                                └── ErrorBoundary (Page Level)
                                                    └── Suspense (Lazy Page)
                                                        ├── / or /dashboard → DashboardPage
                                                        ├── /teacher/*      → TeacherHubPage
                                                        ├── /homeroom/*     → HomeroomHubPage
                                                        ├── /reports/*      → ReportsHubPage
                                                        ├── /master/*       → MasterDataPage
                                                        ├── /settings/*     → SettingsPage
                                                        └── *               → NotFoundPage (404)
```

> **Performance Isolation**: `WorkspaceProvider` is deliberately mounted inside `MainApp` only for authenticated sessions. Unauthenticated visitors accessing the login page (`LoginPage`) or shared report recipients accessing `PublicReportViewerPage` do not mount `WorkspaceProvider`, preventing premature Firestore queries and avoiding 573 KB of unnecessary workspace data fetching.

---

### 4.2 Backward Compatibility with `paths.ts`

To maintain seamless interoperability with legacy internal navigation callbacks (`onNavigate(routeKey, state)`), [`src/routes/paths.ts`](../src/routes/paths.ts) provides a bidirectional adapter:
- **`ROUTE_PATH_MAP`**: Dictionary mapping legacy route keys (e.g., `'dashboard'`, `'teacher'`, `'homeroom'`, `'reports'`, `'master'`, `'settings'`, `'admin'`, `'login'`) to canonical URL paths.
- **`resolveRoutePath(routeKey)`**: Maps route keys or legacy identifiers to canonical browser paths (e.g., `'dashboard'` ➔ `'/dashboard'`, `'teacher/meetings'` ➔ `'/teacher'`).
- **`resolvePathToRouteKey(pathname)`**: Maps browser URL path back to active tab identifier for Sidebar and Header active states.

---

## 5. Firebase Architecture

### 5.1 Configuration

Firebase config resolution chain in `src/services/firebase/config.ts`:

```
VITE_FIREBASE_* env vars → firebase-applet-config.json (fallback)
```

| Config Key | Env Var | Fallback Source |
|---|---|---|
| `apiKey` | `VITE_FIREBASE_API_KEY` | `firebase-applet-config.json` |
| `authDomain` | `VITE_FIREBASE_AUTH_DOMAIN` | `firebase-applet-config.json` |
| `projectId` | `VITE_FIREBASE_PROJECT_ID` | `firebase-applet-config.json` |
| `storageBucket` | — | `firebase-applet-config.json` only |
| `messagingSenderId` | `VITE_FIREBASE_MESSAGING_SENDER_ID` | `firebase-applet-config.json` |
| `appId` | `VITE_FIREBASE_APP_ID` | `firebase-applet-config.json` |
| `databaseId` | `VITE_FIREBASE_FIRESTORE_DATABASE_ID` | `firebase-applet-config.json` |

**Firebase Project ID**: `personal-teacher-app`

### 5.2 Authentication

- **Method**: Email/Password only (via `signInWithEmailAndPassword`, `createUserWithEmailAndPassword`)
- **Password Reset**: `sendPasswordResetEmail`
- **Session Tracking**: `sessionStorage` key `login_session_recorded`
- **On first login**: Auto-creates user profile in Firestore with role `TEACHER`

### 5.3 Firestore

- **Named Database**: `ai-studio-97dcf1e2-31b5-4f50-ac68-ea4891b875c7`
- **Persistence**: `persistentLocalCache` with `persistentMultipleTabManager`
- **Polling**: `experimentalForceLongPolling: true` (for compatibility)

---

## 6. Data Model (Firestore Collections)

All operational data lives under `/users/{userId}/` (workspace isolation):

| Subcollection | Service File | TypeScript Interface |
|---|---|---|
| `academicYears` | `academicYears.ts` / `academicYear.repository.ts` | `AcademicYear` (canonical: `label`, `startYear`, `endYear`, `currentSemester`, `isActive`) |
| `classes` | `classes.ts` | `ClassItem` |
| `students` | `students.ts` | `Student` |
| `subjects` | `subjects.ts` | `Subject` |
| `teachingAssignments` | `teachingAssignments.ts` | `TeachingAssignment` |
| `enrollments` | `enrollments.ts` | `Enrollment` |
| `meetings` | `meetings.ts` | `Meeting` |
| `attendanceRecords` | `attendance.ts` | `AttendanceRecord` |
| `dailyAttendanceSessions` | `attendance.ts` | `DailyAttendanceSession` |
| `dailyAttendanceRecords` | `attendance.ts` | `DailyAttendanceRecord` |
| `assessmentItems` | `assessments.ts` | `AssessmentItem` |
| `scores` | `assessments.ts` | `Score` |
| `studentNotes` | `studentNotes.ts` | `StudentNote` |
| `teacherAttendanceRecords` | `teacherAttendance.ts` | `TeacherAttendanceRecord` |
| `teacherMonthlyAttendance` | `teacherAttendance.ts` | `TeacherMonthlyAttendanceRecord` |
| `classSchedules` | `classSchedule.ts` / `misc.repository.ts` | `ClassSchedule` (deterministic id: `{classId}_{ayId}_{sem}`) |
| `settings` | `settings.ts` / `settings.repository.ts` | `SchoolSettings` (canonical: `schoolLogoUrl`; fallback: `logoUrl`), `DocumentSettings`, `AttendanceSettings`, `UserPreferences` |
| `studentCustomFields` | `studentCustomFields.ts` | `StudentCustomFieldDefinition` |

> **Compatibility Field Invariants**:
> - `AcademicYear`: `label` is canonical (`AcademicYear.name` is obsolete and purged).
> - `AttendanceSummary`: `permitted` is canonical (`permit` is an optional legacy alias retained for read compatibility).
> - `SchoolSettings`: `schoolLogoUrl` is canonical (`logoUrl` is an optional legacy alias retained for read compatibility).
> - `UserProfile`: `designSystemPreference` (persisted `AppearancePresetKey`) and `designSystemModePreference` (persisted `ColorMode`) are canonical persisted fields; `themePreference` is a deprecated read-only fallback.

Top-level collections (NOT under `/users/{userId}/`):

| Collection | Purpose |
|---|---|
| `users` | User profiles (`UserProfile`) |
| `feedbacks` | Bug reports and feature requests (`FeedbackItem`) |
| `sharedReports` | Publicly accessible shared reports (`SharedReport`) |

---

## 7. Authorization / Role Model

### 7.1 Roles

```
TEACHER  → Default role for all new users
ADMIN    → Set by Super Admin via AdminUserManagementPage
```

### 7.2 Super Admin & Admin Verification

Super Admin privileges are governed by:
- **Firestore Security Rules**: Hardcoded emails in `firestore.rules` (`johanrovian90@gmail.com` and `fso2cool@gmail.com`) guard administrative collection-group queries and elevated operations via `isSuperAdmin()`.
- **Application UI Verification**: In the React application, admin route gating and privileged actions are driven by `useAuth().isAdmin` (derived from `adminStatus === 'verified-admin'`). `AuthContext` verifies the Firebase Auth token claim asynchronously via `app.auth.getAdminClaimStatus()`.

---

### 7.3 Account Status

`ACTIVE` | `INACTIVE` | `SUSPENDED`

Suspended users see a blocked screen.

---

## 8. Security Rules Summary

`firestore.rules` (358 lines, `rules_version = '2'`):

- **Workspace isolation**: All subcollections under `/users/{userId}` require `request.auth.uid == userId` OR `isSuperAdmin()`
- **Immutability guards**: Academic year IDs, class IDs, subject IDs are immutable on update for historical integrity
- **Score validation**: Scores must be 0–100
- **Enrollment re-link**: `studentId` can only change if `relinkedAt` is supplied (governed recovery)
- **Feedback**: Users can create with own UID; only Super Admin can update/delete
- **Shared Reports**: Public GET allowed if not revoked/expired; view count increment allowed by anyone; CRUD restricted to owner/Super Admin
- **Collection Group queries**: 14 collection groups readable by Super Admin only (for diagnostics/deduplication)

### 8.1 Security Audit Findings & Vulnerabilities

| Item | Location | Risk Level | Description & Remediation |
|---|---|---|---|
| **Hardcoded Super Admin Emails** | `firestore.rules:7-8`, `src/features/admin/EditUserModal.tsx:51`, `src/features/admin/AdminUserManagementPage.tsx` (UI route gating and header affordances now use token claims via `useAuth().isAdmin`) | **High** | Hardcoding `johanrovian90@gmail.com` and `fso2cool@gmail.com` requires code modification and deployment whenever admin personnel changes. <br>**Target Fix**: Migrate to Firebase Auth Custom Claims (`request.auth.token.role == 'ADMIN'`) or a secured `system_admins` root collection. |
| **Unvalidated Settings Write** | `firestore.rules:256-258` | **Medium** | `match /settings/{settingId} { allow read, write, delete: if request.auth != null && (request.auth.uid == userId || isSuperAdmin()); }` permits arbitrary schema mutations without checking data types or size limits. <br>**Target Fix**: Introduce granular schema constraints for `school`, `document`, `preferences`, and `attendance` setting documents. |
| **Feedback Spam Vector** | `firestore.rules:268-270` | **Low-Medium** | `allow create: if request.auth != null && request.resource.data.userId == request.auth.uid;` lacks rate limiting or payload length validation, allowing malicious authenticated users to flood the collection. |

### 8.2 Recommended Hardened Security Rules (For Future Staged Deployment)

```javascript
// Proposed hardening for /settings/{settingId}
match /settings/{settingId} {
  allow read, delete: if request.auth != null && (request.auth.uid == userId || isSuperAdmin());
  allow create, update: if request.auth != null && (request.auth.uid == userId || isSuperAdmin())
    && settingId in ['school', 'document', 'preferences', 'attendance']
    && request.resource.data.size() < 50; // Payload size guard
}

// Proposed hardening for Super Admin check using custom claims
function isSuperAdmin() {
  return request.auth != null && (
    request.auth.token.admin == true ||
    request.auth.token.email in ['johanrovian90@gmail.com', 'fso2cool@gmail.com']
  );
}
```
*(Note: As per safety constraints, `firestore.rules` will NOT be deployed to production during current refactoring phases).*

---

## 9. Deployment Architecture

```
GitHub (main branch) ──push──> Vercel (auto-deploy)
                                 │
                                 ├─ Build: vite build
                                 ├─ Output: dist/
                                 └─ Rewrites: /* → / (SPA)
```

- **No server-side rendering** — pure static SPA
- **No API routes** — all data flows through Firebase Client SDK
- **No Cloud Functions** — no server-side Firebase logic

---

## 10. Testing & CI/CD Architecture

### 10.1 Automated Testing Stack
- **Framework**: Vitest 5.0.1 running natively in Vite with isolated worker threads.
- **DOM Simulation**: JSDOM 30.1.1 with window polyfills (`matchMedia`, `scrollTo`).
- **Component Testing**: `@testing-library/react` 16.3.3 and `@testing-library/jest-dom` 6.9.1.
- **Coverage Provider**: `@vitest/coverage-v8` generating text summaries and lcov reports.

### 10.2 Quality Gates Pipeline
Every code push and pull request executes 5 automated gates in `.github/workflows/ci.yml`:
1. `npm run lint`: Biome linter runs across all files in `< 400ms`.
2. `npm run type-check`: `tsc --noEmit` validates complete TypeScript type safety.
3. `npm run check:boundaries`: `depcruise` enforces architectural boundary and layer isolation constraints.
4. `npm test`: Executes 37 test suites (277 tests, 100% pass rate).
5. `npm run build`: Generates optimized production assets with 0 chunk size warnings.

---

## 11. Environment Variables

Required (in `.env.local` or Vercel dashboard):

```text
VITE_FIREBASE_API_KEY
VITE_FIREBASE_APP_ID
VITE_FIREBASE_AUTH_DOMAIN
VITE_FIREBASE_FIRESTORE_DATABASE_ID
VITE_FIREBASE_MESSAGING_SENDER_ID
VITE_FIREBASE_PROJECT_ID
VITE_FIREBASE_STORAGE_BUCKET
VITE_FIRESTORE_FORCE_LONG_POLLING=false
```

**Note**: If env vars are missing, `firebase-applet-config.json` provides hardcoded fallback values for development. Production environments should supply all `VITE_FIREBASE_*` variables.

---

## 12. Technical Debt & Modernization Status

### 12.1 Unused Dependencies — ✅ RESOLVED (Phase 1)
Pruned 119 unused packages (e.g. `express`, `recharts`, `jspdf`, `canvas-confetti`, `@google/genai`) without breaking functionality.

### 12.2 Bundle Size & Code Splitting — ✅ RESOLVED (Phase 4)
Split vendor chunks (`vendor-firebase-firestore`, `vendor-react`, `vendor-xlsx`, etc.) and route-level code splitting via `React.lazy`. Entry chunk reduced by **95%** (from 2.89MB to 145KB).

### 12.3 Hardcoded Secrets & Access Control — ⚠️ AUDITED (Phase 3)
Super Admin emails documented; env variable precedence established for storage bucket and API keys.

### 12.4 Developer Tooling & Linting — ✅ RESOLVED (Phase 2 & 7)
Biome sub-second linter configured, `tsconfig.json` strictness enabled, GitHub Actions CI workflow automated.

### 12.5 Testing Infrastructure — ✅ RESOLVED (Phase 6)
Vitest + React Testing Library + JSDOM installed with 37 suites / 277 tests passing (100%).

### 12.6 Performance & UX — ✅ RESOLVED (Phase 8)
Default native WebChannel streaming enabled, skeletons added across 4 heavy views, multi-tier ErrorBoundary deployed, and `firestore.indexes.json` composite indexes defined. See also [DADU-ERD.md](file:///c:/Users/Administrator/Documents/ai/dadu/dadu-app-imp/docs/DADU-ERD.md).

### 12.7 Accessibility — ✅ RESOLVED (Phase 3)
`user-scalable=no` removed from `index.html` viewport meta tag to comply with WCAG 2.2 mobile accessibility standards.

### 12.8 Post-Upgrade Technical Debt & Audit Findings — ✅ AUDITED (Phase 10)
- **Security & Authorization**: Hardcoded emails persist in `firestore.rules` and UI components. Missing server-side role validation on account creation permits client-driven privilege escalation attempts.
- **Testing Status**: Mission-critical business logic (`attendance.ts`, `attendancePolicy.ts`, `periodPolicy.ts`, `studentPolicy.ts`, `grading.service.ts`) is now covered by automated tests (37 suites, 277 tests). Firestore security rules continue to be verified via manual audit.
- **Component Complexity**: Monolithic views (`SettingsPage` 2,310 LOC, `StudentsMasterPage` 1,478 LOC, `GradesPage` 1,326 LOC) create excessive re-render scopes and maintainability friction.
- **Dynamic Bundling**: Static `xlsx` imports across 19 modules eagerly download 425 KB of parsing code on pages where export is rarely triggered.
- **Observability**: Zero remote crash analytics; runtime failures are isolated to the end-user's local console.

---

## 13. Architecture Decision Record (Phase 10)

### 13.1 Stack Preservation Decision
**Decision**: **REMAIN** on React 19 + Vite 6 + Firebase Firestore BaaS + Vercel Static SPA.
**Rationale**:
1. **Proven Performance**: 145 KB entry chunk, sub-second HMR, sub-second Biome linting, 20-second production builds.
2. **Offline Resilience**: Built-in `persistentLocalCache` multi-tab manager natively supports offline-first operations for classroom environments with spotty internet connectivity.
3. **Zero Maintenance Backend**: Serverless BaaS architecture requires 0 database patch maintenance, zero server provisioning costs, and scales gracefully within free/low-tier quotas.
4. **No Framework Rewrite Justified**: Next.js App Router, PostgreSQL, or full custom backends would introduce severe architectural churn, invalidate offline client cache, and create unnecessary financial/operational overhead.

