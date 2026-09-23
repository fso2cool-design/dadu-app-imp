# DADU — Architecture Document

> **Version**: 2.2.0 | **Last Updated**: 2026-09-23 | **Baseline Commit**: `9d73d97` (main)

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
│   ├── DADU-UPGRADE-ROADMAP.md  # Upgrade roadmap (Phases 1-9)
│   ├── DADU-ERD.md              # Visual Entity-Relationship Diagram (Mermaid)
│   └── GITHUB-WORKFLOW-GUIDE.md # Branch protection and preview deployment guide
├── public/                      # Static assets (favicons, manifest.json, logo)
├── src/
│   ├── main.tsx                 # React root mount (StrictMode)
│   ├── App.tsx                  # Root ErrorBoundary, Router, Providers, and AppLayout
│   ├── index.css                # Global styles + Tailwind v4
│   ├── types/index.ts           # Centralized TypeScript interfaces
│   ├── context/
│   │   ├── WorkspaceContext.tsx  # Academic data loader (classes, subjects, etc.)
│   │   ├── ThemeContext.tsx      # Light / dark-crimson theme
│   │   └── ToastContext.tsx      # Toast notification system
│   ├── features/
│   │   ├── admin/               # Admin user management, feedback tab
│   │   ├── auth/                # AuthContext, LoginPage, WorkflowDemoModal
│   │   ├── dashboard/           # DashboardPage (with schedule skeletons)
│   │   ├── grades/              # Assessment items, score entry, paste Excel
│   │   ├── homeroom/            # Homeroom hub (daily attendance, notes skeletons)
│   │   ├── master/              # Academic years, classes, subjects, assignments
│   │   ├── onboarding/          # 6-step onboarding wizard
│   │   ├── public/              # Public report viewer (shared reports)
│   │   ├── reports/             # Attendance, grades, legger skeletons, print
│   │   ├── settings/            # Settings page, relationship recovery
│   │   ├── students/            # Student CRUD, import, dedup, table skeletons
│   │   └── teacher/             # Teacher hub (meetings, attendance, schedule)
│   ├── components/
│   │   ├── common/              # Shared components (ErrorBoundary, Skeleton, Modal, etc.)
│   │   └── layout/              # AppLayout, Sidebar, Header, BottomNav
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

## 4. Routing Architecture

The application uses **React Router v7** (`react-router-dom`) with URL-driven navigation, browser history, and deep-link bookmarking.

### 4.1 Route Hierarchy & Page Resolution

Inside [`src/App.tsx`](file:///c:/Users/Administrator/Documents/ai/dadu/dadu-app-imp/src/App.tsx):

```text
ErrorBoundary (Root)
└── BrowserRouter
    └── AuthProvider
        └── WorkspaceProvider
            └── ThemeProvider
                └── ToastProvider
                    └── MainApp
                        ├── publicShareToken? (URL /share/:token or ?share=:token) → PublicReportViewerPage
                        ├── authLoading? → LoadingScreen
                        ├── !user? → LoginPage
                        ├── !profile || workspaceLoading? → LoadingScreen
                        ├── profile.accountStatus === 'SUSPENDED' → Suspended notice
                        ├── isAdmin && location.pathname === '/admin' → AdminUserManagementPage
                        ├── !profile.isOnboarded? → OnboardingWizard
                        └── Authenticated App:
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

### 4.2 Backward Compatibility with `paths.ts`

To maintain seamless interoperability with legacy internal navigation callbacks (`onNavigate(routeKey, state)`), [`src/routes/paths.ts`](file:///c:/Users/Administrator/Documents/ai/dadu/dadu-app-imp/src/routes/paths.ts) provides a bidirectional adapter:
- `resolveRoutePath(routeKey)`: Maps keys like `'dashboard'` ➔ `'/dashboard'`, `'teacher/meetings'` ➔ `'/teacher'`.
- `resolvePathToRouteKey(pathname)`: Maps browser URL path back to active tab identifier for Sidebar and Header active states.

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
| `academicYears` | `academicYears.ts` | `AcademicYear` |
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
| `classSchedules` | `classSchedule.ts` | `ClassSchedule` |
| `settings` | `settings.ts` | `SchoolSettings`, `DocumentSettings`, `AttendanceSettings` |
| `studentCustomFields` | `studentCustomFields.ts` | `StudentCustomFieldDefinition` |

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

### 7.2 Super Admin

Hardcoded in both source code AND Firestore rules:

- `johanrovian90@gmail.com`
- `fso2cool@gmail.com`

Super Admin check in `App.tsx`:
```typescript
const isAdmin = profile?.role === 'ADMIN' 
  || profile?.email === 'johanrovian90@gmail.com' 
  || profile?.email === 'fso2cool@gmail.com';
```

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
| **Hardcoded Super Admin Emails** | `firestore.rules:7-8`, `src/App.tsx:49`, `src/services/firestore/users.ts:31`, `src/components/layout/Header.tsx:111`, `src/features/admin/EditUserModal.tsx:63`, `src/features/admin/AdminUserManagementPage.tsx:600` | **High** | Hardcoding `johanrovian90@gmail.com` and `fso2cool@gmail.com` requires code modification and deployment whenever admin personnel changes. <br>**Target Fix**: Migrate to Firebase Auth Custom Claims (`request.auth.token.role == 'ADMIN'`) or a secured `system_admins` root collection. |
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
Every code push and pull request executes 4 automated gates in `.github/workflows/ci.yml`:
1. `npm run lint`: Biome linter runs across all files in `< 400ms`.
2. `npm run type-check`: `tsc --noEmit` validates complete type safety.
3. `npm test`: Executes 12 test suites (67 tests, 100% pass rate).
4. `npm run build`: Generates production assets with 0 chunk size warnings.

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
Vitest + React Testing Library + JSDOM installed with 12 suites / 67 tests passing (100%).

### 12.6 Performance & UX — ✅ RESOLVED (Phase 8)
Default native WebChannel streaming enabled, skeletons added across 4 heavy views, multi-tier ErrorBoundary deployed, and `firestore.indexes.json` composite indexes defined. See also [DADU-ERD.md](file:///c:/Users/Administrator/Documents/ai/dadu/dadu-app-imp/docs/DADU-ERD.md).

### 12.7 Accessibility — ✅ RESOLVED (Phase 3)
`user-scalable=no` removed from `index.html` viewport meta tag to comply with WCAG 2.2 mobile accessibility standards.

### 12.8 Post-Upgrade Technical Debt & Audit Findings — ✅ AUDITED (Phase 10)
- **Security & Authorization**: Hardcoded emails persist in `firestore.rules` and UI components. Missing server-side role validation on account creation permits client-driven privilege escalation attempts.
- **Testing Gaps**: Mission-critical business logic (`assessments.ts`, `attendance.ts`, `students.ts`) and Firestore security rules lack automated tests (0% coverage on calculation algorithms).
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

