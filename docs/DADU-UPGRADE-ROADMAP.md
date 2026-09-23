# DADU — Upgrade Roadmap

> **Version**: 1.0.0 | **Last Updated**: 2026-09-23 | **Baseline Commit**: `9d73d97` (main)

---

## Priority Order (Immutable)

1. Preserve existing functionality
2. Preserve existing production data
3. Preserve Firebase Authentication and Firestore integrity
4. Preserve current deployment architecture unless technically justified
5. Improve maintainability, security, testing, performance, DX, and scalability
6. Make changes incrementally; verify every phase before continuing

---

## Phase 1: Dependency Audit & Cleanup

**Goal**: Remove unused packages, fix misplaced dependencies, reduce `node_modules` footprint.

| Task | Details | Risk |
|---|---|---|
| Remove `express` from dependencies | Not imported anywhere in `src/` | None |
| Remove `@google/genai` from dependencies | Not imported anywhere in `src/` | None |
| Remove `dotenv` from dependencies | Not imported anywhere in `src/` (Vite handles env natively) | None |
| Remove `@types/express` from devDependencies | No longer needed after `express` removal | None |
| Remove `esbuild` from devDependencies | Not referenced; Vite bundles its own esbuild | None |
| Remove `sharp` from devDependencies | Not imported anywhere in `src/` | None |
| Remove `tsx` from devDependencies | Not referenced in scripts or source | None |
| Remove `autoprefixer` from devDependencies | Tailwind v4 Vite plugin handles vendor prefixes | None |
| Remove duplicate `vite` from dependencies | Keep in devDependencies only | None |
| Move `@tailwindcss/vite` to devDependencies | Build-time plugin, not runtime | None |
| Move `@vitejs/plugin-react` to devDependencies | Build-time plugin, not runtime | None |

**Verification Gate**: `npm run build` succeeds, `npm run dev` works, no runtime regressions.

---

## Phase 2: TypeScript & Linting Hardening — ✅ COMPLETED

**Goal**: Enable strict type checking and add static analysis tooling.

| Task | Details | Status |
|---|---|---|
| Install `@types/react` & `@types/react-dom` | Unmasked React 19 JSX typing | ✅ Done |
| Add `@biomejs/biome` | Configured `biome.json` tailored for codebase | ✅ Done |
| Add `lint` script to `package.json` | `tsc --noEmit && biome lint --diagnostic-level=error src` | ✅ Done |
| Harden `tsconfig.json` | `strictFunctionTypes`, `strictBindCallApply`, `noImplicitThis` | ✅ Done |
| Fix type errors | Fixed ~25 genuine prop/type/schema mismatches | ✅ Done |

**Verification Gate**: `npm run lint` passes clean with 0 errors across 128 files in ~400ms.

---

## Phase 3: Security & Environment Hardening — ✅ COMPLETED

**Goal**: Remove hardcoded secrets, improve auth patterns, fix accessibility violations.

| Task | Details | Status |
|---|---|---|
| Review `firebase-applet-config.json` exposure | Added `storageBucket` env var precedence in `config.ts` and `.env.example` | ✅ Done |
| Audit Super Admin hardcoding pattern | Documented emails in `DADU-ARCHITECTURE.md` Section 8.1 with custom claims migration plan | ✅ Done |
| Remove `user-scalable=no` from viewport | Fixed in `index.html` (WCAG 2.2 mobile accessibility) | ✅ Done |
| Review Firestore rules for overly permissive paths | Audited `/settings/*` and `/feedbacks` in `DADU-ARCHITECTURE.md` Section 8.1 & 8.2 | ✅ Done |

**Verification Gate**: No runtime breaking changes; `.env.example` updated; security audit documented; WCAG viewport compliant; `npm run lint` passes.

---

## Phase 4: Build & Bundle Optimization — ✅ COMPLETED

**Goal**: Reduce 2.9MB bundle to under 1MB main chunk (target < 500KB).

| Task | Details | Status |
|---|---|---|
| Add code splitting via `React.lazy` + `Suspense` | Lazy-loaded feature pages (`DashboardPage`, `TeacherHubPage`, `HomeroomHubPage`, `ReportsHubPage`, `MasterDataPage`, `SettingsPage`, `AdminUserManagementPage`, `OnboardingWizard`, `PublicReportViewerPage`, `FeedbackModal`) | ✅ Done |
| Configure `manualChunks` in Vite rollup config | Splitting vendor dependencies into `vendor-firebase-firestore`, `vendor-firebase-auth`, `vendor-firebase-core`, `vendor-xlsx`, `vendor-motion`, `vendor-lucide`, and `vendor-react` | ✅ Done |
| Add bundle analysis (`rollup-plugin-visualizer`) | Installed and configured to output visual bundle composition to `dist/stats.html` | ✅ Done |
| Graceful loading fallback | Enhanced `LoadingScreen` with `fullScreen` prop for responsive layout-level loading states | ✅ Done |

**Verification Gate**:
- **Main JS entry chunk**: Dropped from **2,892.61 kB** to **143.62 kB** (38.02 kB gzipped) — a **95% reduction**.
- **Chunk warnings**: 0 Vite chunk size warnings.
- **Type & Lint safety**: `npm run lint` passes clean (128 files checked in 245ms).

---

## Phase 5: Router Migration — ✅ COMPLETED

**Goal**: Replace state-driven routing with URL-based routing.

| Task | Details | Status |
|---|---|---|
| Install `react-router-dom` v7 | Added `react-router-dom` v7 to dependencies and isolated via `vendor-router` chunk | ✅ Done |
| Map existing `currentRoute` cases to URL paths | Centralized bidirectional dictionary in `src/routes/paths.ts` (`resolveRoutePath`, `resolvePathToRouteKey`) | ✅ Done |
| Add `BrowserRouter` at root level | Wrapped root in `BrowserRouter` and derived active view from `location.pathname` | ✅ Done |
| Enable deep linking and browser back/forward | URLs update in browser bar, history back/forward functions properly, pages can be bookmarked | ✅ Done |
| Add 404 handling | Built `NotFoundPage` component with DADU themed styling and navigation recovery | ✅ Done |
| Keep `vercel.json` SPA rewrite | Verified `vercel.json` rewrite (`/(.*) -> /`) for seamless Vercel production routing | ✅ Done |

**Verification Gate**:
- **Backward Compatibility**: 100% intact; all legacy `onNavigate(route, state)` calls continue working without modification.
- **Type & Lint Safety**: `npm run lint` passes clean across 130 files in 266ms.
- **Build Performance**: `npm run build` compiles in ~20s with 0 warnings; dedicated `vendor-router` chunk is only 36.81 kB (13.46 kB gzipped).
- **Deep Linking**: Direct URL navigation to `/reports/legger`, `/teacher/grades`, `/master/classes`, etc. functional.

---

## Phase 6: Testing Infrastructure — ✅ COMPLETED

**Goal**: Establish test framework and add baseline test coverage.

| Task | Details | Status |
|---|---|---|
| Install Vitest + React Testing Library | Installed `vitest`, `@testing-library/react`, `@testing-library/jest-dom`, `@testing-library/user-event`, `jsdom`, `@vitest/coverage-v8` | ✅ Done |
| Add test scripts to `package.json` | Added `test` (`vitest run`), `test:watch` (`vitest`), and `test:coverage` (`vitest run --coverage`) | ✅ Done |
| Setup test runner & DOM environment | Configured `vitest.config.ts` and `src/test/setup.ts` with JSDOM, matchMedia polyfill, and DOM cleanup | ✅ Done |
| Smoke tests for critical services | `src/services/firebase/config.test.ts`, `src/services/firestore/users.test.ts` (with admin role escalation protection) | ✅ Done |
| Core utilities & routing tests | `src/routes/paths.test.ts` (100% coverage), `src/utils/date.test.ts`, `src/utils/formatOfficialName.test.ts`, `src/utils/reportCrypto.test.ts` (100% coverage), `src/utils/syncEvents.test.ts` (100% coverage) | ✅ Done |
| Component tests for UI & Context | `src/components/common/Badge.test.tsx`, `src/components/common/Alert.test.tsx`, `src/components/common/NotFoundPage.test.tsx`, `src/features/auth/AuthContext.test.tsx` | ✅ Done |

**Verification Gate**:
- **Test execution**: 11 test suites, 61 unit & component tests passing (100% success rate) in ~7.3s.
- **Coverage baseline**: `src/routes` (100%), `src/services/firebase` (70%), `src/utils` (~50%).
- **Type & Lint Safety**: `npm run lint` passes clean with 0 errors across 142 files in 268ms.
- **Build Integrity**: `npm run build` succeeds with zero errors/warnings in ~19s (entry chunk: 141.91 kB).

---

## Phase 7: CI/CD Pipeline — ✅ COMPLETED

**Goal**: Automate quality checks on every push/PR.

| Task | Details | Status |
|---|---|---|
| Add GitHub Actions workflow | Created `.github/workflows/ci.yml` running lint, type-check, test, and build on push/PR to `main` with concurrency control | ✅ Done |
| Add `type-check` & `ci` scripts | Added `npm run type-check` (`tsc --noEmit`) and `npm run ci` in `package.json` for one-command local/CI pipeline runs | ✅ Done |
| Document branch protection rules | Detailed rules in `docs/GITHUB-WORKFLOW-GUIDE.md` (mandatory CI status checks, require approvals, prevent force push) | ✅ Done |
| Document preview deployments | Documented Vercel automatic PR preview deployments and production zero-downtime rollouts | ✅ Done |

**Verification Gate**:
- **Local CI validation**: `npm run ci` successfully runs `lint` (281ms), `type-check`, `test` (61 tests passed in ~8.9s), and `build` (20.5s) with 0 errors.
- **Workflow syntax**: Validated `.github/workflows/ci.yml` against GitHub Actions schema.

---

## Phase 8: Performance & UX Improvements — ✅ COMPLETED

**Goal**: Optimize runtime performance and user experience.

| Task | Details | Status |
|---|---|---|
| Remove unconditional `experimentalForceLongPolling` | Replaced with environment-driven flag (`VITE_FIRESTORE_FORCE_LONG_POLLING`), enabling high-speed native WebChannel streaming with automatic fallback | ✅ Done |
| Add loading skeletons for data-heavy pages | Implemented `Skeleton`, `SkeletonTable`, and `SkeletonCardGrid` on Dashboard, Master Siswa, Siswa Binaan, and Legger Nilai to eliminate CLS | ✅ Done |
| Optimize Firestore queries & composite indexes | Created `firestore.indexes.json` defining composite indexes for `meetings`, `teacherAttendanceRecords`, `studentNotes`, `students`, `teachingAssignments`, and `assessmentItems` | ✅ Done |
| Add error boundaries | Created `ErrorBoundary` component with localized UI, retry, and diagnostic drawer; integrated at root and page route level in `App.tsx` | ✅ Done |
| Review `persistentLocalCache` strategy | Verified offline multi-tab persistence with graceful fallback to memory cache if storage access is restricted | ✅ Done |

**Verification Gate**:
- **Zero regressions**: All 12 test suites (67 tests) passed in Vitest.
- **Local CI pipeline**: `npm run ci` (Biome lint 349ms, `tsc --noEmit`, 67 tests in 9.92s, Vite build in 24.5s) completed with 0 errors and 0 chunk warnings.

---

## Phase 9: Documentation & Developer Experience — ✅ COMPLETED

**Goal**: Make the codebase self-documenting and welcoming to new developers.

| Task | Details | Status |
|---|---|---|
| Add README.md with setup instructions | Created comprehensive [`README.md`](file:///c:/Users/Administrator/Documents/ai/dadu/dadu-app-imp/README.md) with quick start, env vars, scripts, CI/CD, and architecture links | ✅ Done |
| Add CONTRIBUTING.md | Created [`CONTRIBUTING.md`](file:///c:/Users/Administrator/Documents/ai/dadu/dadu-app-imp/CONTRIBUTING.md) detailing branching model, Conventional Commits, Biome & TypeScript standards, and PR quality gates | ✅ Done |
| Add JSDoc to critical service functions | Standardized JSDoc documentation across key Firestore services (`meetings.ts`, `assessments.ts`, `attendance.ts`) | ✅ Done |
| Document Firestore data model visually | Created visual Mermaid Entity-Relationship Diagram in [`docs/DADU-ERD.md`](file:///c:/Users/Administrator/Documents/ai/dadu/dadu-app-imp/docs/DADU-ERD.md) | ✅ Done |
| Add CHANGELOG.md | Created [`CHANGELOG.md`](file:///c:/Users/Administrator/Documents/ai/dadu/dadu-app-imp/CHANGELOG.md) covering full upgrade trajectory from v2.0.0 through v2.2.0 (Phases 1–8) | ✅ Done |
| Update Architecture Document | Brought [`docs/DADU-ARCHITECTURE.md`](file:///c:/Users/Administrator/Documents/ai/dadu/dadu-app-imp/docs/DADU-ARCHITECTURE.md) up to date with React Router v7, Vitest, CI/CD, and Phase 8 performance | ✅ Done |

**Verification Gate**:
- **Onboarding readiness**: Verified setup guide, scripts, environment variables, and quality assurance commands.
- **Local CI pipeline**: `npm run ci` runs cleanly with 100% test pass rate and 0 lint/type errors.

---

## Phase 10: Deep Architecture & Product Readiness Audit — ✅ COMPLETED

**Goal**: Comprehensive post-upgrade architectural, security, testing, performance, and data integrity audit.

| Task | Details | Status |
|---|---|---|
| Repository & Architecture Audit | Evaluated boundaries, monolithic hotspots (`SettingsPage`, `StudentsMasterPage`), and state coupling | ✅ Done |
| Security & Firestore Rules Audit | Analyzed rule paths, privilege escalation vector on signup, and collection group isolation | ✅ Done |
| Role & Authorization Flow Mapping | Verified 2-role model (`TEACHER` vs `ADMIN` / Super Admin level), hardcoded email dependency | ✅ Done |
| Testing Gap Map Formulation | Identified 0% coverage on core services (`assessments`, `attendance`, `students`) and security rules | ✅ Done |
| Performance & Asset Profiling | Evaluated entry chunk (145KB), static `xlsx` import overhead across 19 modules, and cache behavior | ✅ Done |
| Technical Debt Register & Roadmap | Produced structured register (12 key items) and sequenced Phases 11–15 | ✅ Done |

**Verification Gate**:
- Audit report completed with 15 core technical sections.
- Zero modifications to application source code, dependencies, Firestore rules, or production data.

---

## Future Roadmap (Phases 11+)

### Phase 11: Security & Authorization Hardening (Highest Priority)
- **Objective**: Eliminate hardcoded admin emails from source code and Firestore rules; close the account creation role-escalation vector.
- **Why Needed**: Modifying administrative personnel currently requires code edits; signup creates unvalidated `role` values.
- **Affected Systems**: `firestore.rules`, `src/services/firestore/users.ts`, `src/features/admin/*`, `src/App.tsx`.
- **Expected Benefit**: True multi-tenant RBAC, zero hardcoded credentials, immutable security posture.
- **Risk**: Potential lockout if admin authorization logic or rules are misconfigured; requires strict staging verification.
- **Dependencies**: None.
- **Verification Method**: Unit tests on role assignment, rules unit tests with Firebase emulator.

### Phase 12: Core Business Logic & Security Rules Testing
- **Objective**: Establish automated testing for core calculation engines (`assessments`, `attendance`, `students`) and write Firestore Security Rules unit tests.
- **Why Needed**: Currently 0 test coverage on mission-critical grading and attendance algorithms.
- **Affected Systems**: `src/services/firestore/*.test.ts`, `@firebase/rules-unit-testing`, Vitest.
- **Expected Benefit**: Regression prevention during grade, attendance, and rapor calculation changes.
- **Risk**: Low (test-only additions).
- **Dependencies**: None.
- **Verification Method**: Vitest suite with >80% coverage on calculation modules; emulator rules suite passing.

### Phase 13: Monolithic Component Decomposition & Hook Extraction
- **Objective**: Refactor oversized page components (`SettingsPage.tsx` 2,310 LOC, `StudentsMasterPage.tsx` 1,478 LOC, `GradesPage.tsx` 1,326 LOC) into modular subcomponents and focused custom hooks.
- **Why Needed**: Excessive cognitive load, large re-render boundaries, and fragile local state management.
- **Affected Systems**: `src/features/settings/*`, `src/features/students/*`, `src/features/grades/*`.
- **Expected Benefit**: Improved maintainability, localized re-renders, testable isolated UI pieces.
- **Risk**: UI regression during props and state lifting; mitigated by existing and Phase 12 tests.
- **Dependencies**: Phase 12 (tests provide safety net).
- **Verification Method**: Component tests, visual inspection, Biome linting, type-check.

### Phase 14: Dynamic Bundling & SheetJS (XLSX) Lazy-Loading
- **Objective**: Convert static `import * as XLSX from 'xlsx'` across 19 files into dynamic `await import('xlsx')` within dedicated export/import utilities.
- **Why Needed**: Eliminates immediate downloading of the 425 KB `vendor-xlsx` chunk on initial page views.
- **Affected Systems**: 19 feature pages and modal components importing `xlsx`.
- **Expected Benefit**: 425 KB saved on initial route loads for non-export operations; faster Time to Interactive (TTI).
- **Risk**: Low (async handling for download buttons).
- **Dependencies**: None.
- **Verification Method**: Rollup bundle analysis, verification of Excel export/import actions.

### Phase 15: Client-Side Telemetry & Observability
- **Objective**: Implement remote error logging and diagnostic aggregation (e.g. Sentry or lightweight error tracking) with user privacy compliance.
- **Why Needed**: Currently all runtime crashes stay in the user's browser console; zero production visibility into client errors.
- **Affected Systems**: `src/components/common/ErrorBoundary.tsx`, `src/main.tsx`.
- **Expected Benefit**: Proactive error detection and crash analytics.
- **Risk**: Performance overhead if unthrottled; must ensure no PII leakage.
- **Dependencies**: None.
- **Verification Method**: Simulated client exceptions verified in error monitoring dashboard.

---

## Phase Execution Rules

1. **One phase at a time**. Do not start Phase N+1 until Phase N passes its verification gate.
2. **No big-bang rewrites**. Each phase should be achievable in 1–3 incremental PRs.
3. **Test after every change**. Run `npm run build` and `npm run dev` after each modification.
4. **Document changes**. Update this roadmap and `DADU-ARCHITECTURE.md` as changes are made.
5. **No production data changes**. All Firestore data is treated as production. No writes, deletes, or schema changes without explicit approval.
6. **No `firebase deploy`**. Firestore rules changes require separate review and approval.
7. **No `vercel --prod`**. Production deployments happen via GitHub → Vercel auto-deploy only.

---

## Current Status

| Phase | Status | Notes |
|---|---|---|
| **Phase 1** | ✅ COMPLETE | 9 unused packages removed, 2 plugins moved to devDependencies, 119 packages pruned, build & dev verified. |
| **Phase 2** | ✅ COMPLETE | Missing React 19 types installed, tsconfig strictness flags enabled, Biome configured (sub-second linting), ~25 genuine type/prop mismatches fixed. |
| **Phase 3** | ✅ COMPLETE | Storage bucket env precedence added, viewport meta updated for WCAG 2.2 mobile accessibility, Super Admin hardcoding and Firestore security rules audited & documented. |
| **Phase 4** | ✅ COMPLETE | 95% entry chunk reduction (2.89MB → 143KB), React.lazy route code splitting, manualChunks vendor separation (Firebase, xlsx, motion, react), rollup visualizer. |
| **Phase 5** | ✅ COMPLETE | React Router v7 integrated, URL-driven routing, browser history & bookmarking, paths.ts bidirectional adapter, 404 page. |
| **Phase 6** | ✅ COMPLETE | Vitest + React Testing Library + JSDOM installed, 11 test suites / 61 tests passing (100%), coverage report generated, type & lint clean. |
| **Phase 7** | ✅ COMPLETE | GitHub Actions CI workflow created (`.github/workflows/ci.yml`), `npm run ci` verified, branch protection and Vercel preview deployment guide written. |
| **Phase 8** | ✅ COMPLETE | Native WebChannel streaming, loading skeletons across 4 heavy views, 2-layer ErrorBoundary with diagnostics & tests, firestore.indexes.json composite indexes. |
| **Phase 9** | ✅ COMPLETE | Comprehensive README, CONTRIBUTING, CHANGELOG, visual Mermaid ERD (docs/DADU-ERD.md), updated DADU-ARCHITECTURE.md, and JSDoc annotations. |
| **Phase 10** | ✅ COMPLETE | Deep Architecture & Readiness Audit: security rules, authorization flow, testing gap map, performance profiling, and Technical Debt Register. |
| **Phase 11** | 📋 PROPOSED | Security & Authorization Hardening (Role escalation fix, custom claims / serverless admin verification). |
| **Phase 12** | 📋 PROPOSED | Core Business Logic & Security Rules Testing (Assessments, Attendance, Rules emulator). |
| **Phase 13** | 📋 PROPOSED | Monolithic Component Decomposition & Custom Hooks (`SettingsPage`, `StudentsMasterPage`, `GradesPage`). |
| **Phase 14** | 📋 PROPOSED | Dynamic Bundling & SheetJS (`xlsx`) Lazy-Loading. |
| **Phase 15** | 📋 PROPOSED | Client-Side Telemetry & Observability (Sentry / remote error logging). |


