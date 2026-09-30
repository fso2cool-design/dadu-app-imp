# Layer 8 Ops & Deploy Audit Report: DADU Workspace

**Date:** 2026-09-30  
**Project:** DADU (Digitalisasi Data Guru) Workspace (`dadu-app-imp`)  
**Auditor:** Antigravity Autonomous Ops & Deployment Systems Auditor  
**Audit Scope:** Layer 8 Operations & Deployment (Version synchronization, Firebase deployment targets & rules, Vercel hosting & environment variables, build reproducibility, CI/CD pipeline health, Git state, and v2.3.0 rollback formulation)  
**Target File:** [`audit/layer8-ops.md`](file:///c:/Users/Administrator/Documents/ai/dadu/dadu-app-imp/audit/layer8-ops.md)

---

## 1. Executive Summary

This read-only audit evaluates the **Layer 8 Operations, Build, and Deployment Infrastructure** of the DADU application following the v2.3.0 Design System migration. The audit assesses release readiness across package manifests, cloud target declarations, hosting configurations, environment variables, reproducible build artifacts, automated quality gates, and disaster recovery procedures.

### Operational Scorecard:

| Evaluation Dimension | Assessed Target | Status | Severity |
| :--- | :--- | :--- | :--- |
| **Version Synchronization** | `package.json`, `package-lock.json`, `app.ts`, `changelog.ts` | ✅ **100% Synchronized** (`2.3.0`) | None |
| **Firebase Firestore Target** | `firebase.json` database declaration | ✅ **Compliant** (`ai-studio-97dcf1e2-...`) | None |
| **Firestore Security Rules** | `firestore.rules` (358 lines) | ✅ **Valid & Granular** | None |
| **Firestore Composite Indexes**| `firestore.indexes.json` (12 composite indexes) | ✅ **Configured & Valid** | None |
| **Vercel SPA Rewrites** | `vercel.json` wildcard rewrite | ✅ **Configured** (`/(.*)` -> `/`) | None |
| **Vercel Environment Matrix** | `VITE_FIREBASE_*` variables & fallbacks | ⚠️ **Fallback-Dependent** | **P1** |
| **TypeScript Compilation** | `npm run type-check` (`tsc --noEmit`) | ✅ **Clean (0 errors)** | None |
| **Biome Linter** | `npm run lint` (`biome lint`) | ✅ **Clean (0 errors, 218 files)** | None |
| **Architectural Boundaries** | `npm run check:boundaries` (`depcruise`) | ✅ **0 Violations (235 modules)** | None |
| **Production Bundle Build** | `npm run build` (`vite build`) | ✅ **Pass (18.15s, 11 chunks)** | None |
| **Automated Test Suite** | `npm test` (`vitest run`) | ❌ **FAIL (2 tests in users.test.ts)** | **P0** |
| **CI Quality Gate** | `npm run ci` / `.github/workflows/ci.yml` | ❌ **BLOCKED by test failure** | **P0** |
| **Git Release Tagging** | `git tag -l` | ⚠️ **No tags found (Missing v2.3.0 tag)**| **P1** |
| **Git Working Tree** | `git status` on branch `main` | ✅ **Clean (Up to date with origin)** | None |
| **Rollback Plan Formulation**| Recovery runbook for v2.3.0 -> v2.2.0 | ✅ **Fully Formulated & Validated** | None |

---

## 2. Version Synchronization Audit

A comprehensive multi-point cross-check was executed across package manifests, lockfiles, application runtime constants, and documentation:

### 2.1 Manifest & Constant Verification Matrix

| Location / File | Line | Key / Expression | Value Found | Sync Status |
| :--- | :---: | :--- | :--- | :---: |
| [`package.json`](file:///c:/Users/Administrator/Documents/ai/dadu/dadu-app-imp/package.json) | 4 | `"version"` | `"2.3.0"` | ✅ MATCH |
| [`package-lock.json`](file:///c:/Users/Administrator/Documents/ai/dadu/dadu-app-imp/package-lock.json) | 3 | Root `"version"` | `"2.3.0"` | ✅ MATCH |
| [`package-lock.json`](file:///c:/Users/Administrator/Documents/ai/dadu/dadu-app-imp/package-lock.json) | 9 | `packages[""].version` | `"2.3.0"` | ✅ MATCH |
| [`src/constants/app.ts`](file:///c:/Users/Administrator/Documents/ai/dadu/dadu-app-imp/src/constants/app.ts) | 4 | `APP_CONFIG.version` | `'2.3.0'` | ✅ MATCH |
| [`src/constants/app.ts`](file:///c:/Users/Administrator/Documents/ai/dadu/dadu-app-imp/src/constants/app.ts) | 5 | `APP_CONFIG.versionDisplay` | `'ver. 2.3-JRA'` | ✅ MATCH |
| [`src/constants/app.ts`](file:///c:/Users/Administrator/Documents/ai/dadu/dadu-app-imp/src/constants/app.ts) | 6 | `APP_CONFIG.releaseDate` | `'30 September 2026'` | ✅ MATCH |
| [`src/constants/changelog.ts`](file:///c:/Users/Administrator/Documents/ai/dadu/dadu-app-imp/src/constants/changelog.ts) | 15 | `APP_CHANGELOGS[0].version` | `'ver. 2.3-JRA'` | ✅ MATCH |
| [`src/constants/changelog.ts`](file:///c:/Users/Administrator/Documents/ai/dadu/dadu-app-imp/src/constants/changelog.ts) | 16 | `APP_CHANGELOGS[0].versionCode` | `'2.3.0-JRA'` | ✅ MATCH |
| [`src/constants/changelog.ts`](file:///c:/Users/Administrator/Documents/ai/dadu/dadu-app-imp/src/constants/changelog.ts) | 17 | `APP_CHANGELOGS[0].releaseDate` | `'30 September 2026'` | ✅ MATCH |
| [`CHANGELOG.md`](file:///c:/Users/Administrator/Documents/ai/dadu/dadu-app-imp/CHANGELOG.md) | 7 | Release Header | `## [2.3.0] — 2026-09-30` | ✅ MATCH |
| [`docs/DADU-ARCHITECTURE.md`](file:///c:/Users/Administrator/Documents/ai/dadu/dadu-app-imp/docs/DADU-ARCHITECTURE.md) | 3 | Metadata Header | `Version: 2.3.0` | ✅ MATCH |

### 2.2 Finding:
Version synchronization is **perfect**. No stale version numbers (such as `2.2.0` or `2.0.0`) remain in primary application manifests or runtime config constants.

---

## 3. Firebase Deployment Configuration (`firebase.json`)

The project configuration file [`firebase.json`](file:///c:/Users/Administrator/Documents/ai/dadu/dadu-app-imp/firebase.json) was audited against security rules, index definitions, and the project's single-source-of-truth guidelines.

### 3.1 Content Analysis
```json
{
  "firestore": {
    "rules": "firestore.rules",
    "indexes": "firestore.indexes.json",
    "database": "ai-studio-97dcf1e2-31b5-4f50-ac68-ea4891b875c7"
  },
  "emulators": {
    "firestore": {
      "port": 8080
    },
    "ui": {
      "enabled": false
    }
  }
}
```

### 3.2 Verification Details:
1. **Named Database Target ID (Rule 4 Compliance)**:
   - `"database": "ai-studio-97dcf1e2-31b5-4f50-ac68-ea4891b875c7"` is explicitly declared.
   - **Why this matters**: In Google Cloud / Firebase Firestore projects with named databases, running `firebase deploy --only firestore` without specifying the target database causes the Firebase CLI to deploy rules to the `(default)` database instead of the app's named database. This configuration adheres directly to `.agents/rules/no-dual-source.md` Rule 4.
2. **Security Rules Declaration (`firestore.rules`)**:
   - File exists at root ([`firestore.rules`](file:///c:/Users/Administrator/Documents/ai/dadu/dadu-app-imp/firestore.rules)) with 358 lines of Granular Security Rules (Version 2).
   - Validated: Enforces Super Admin overrides, user ownership (`request.auth.uid == userId`), immutability of academic and class linkage IDs, valid score ranges (0–100), and rate-limited public share reports.
3. **Composite Index Definitions (`firestore.indexes.json`)**:
   - File exists at root ([`firestore.indexes.json`](file:///c:/Users/Administrator/Documents/ai/dadu/dadu-app-imp/firestore.indexes.json)) with 111 lines.
   - 12 composite indexes are declared across `meetings`, `teacherAttendanceRecords`, `studentNotes`, `students`, `teachingAssignments`, and `assessmentItems`.
4. **Hosting Section Evaluation**:
   - Notice: `"hosting"` is **absent** from `firebase.json`.
   - **Operational assessment**: DADU uses **Vercel** as its web application host / Edge CDN, while Firebase is utilized exclusively as a Backend-as-a-Service (BaaS) for Firestore, Authentication, and Storage.
   - **Operational Command**: Operations engineers must deploy rules and indexes using:
     ```bash
     firebase deploy --only firestore
     ```
     Running a bare `firebase deploy` will safely deploy only the configured `firestore` component.

---

## 4. Vercel Deployment Configuration & Environment Variables

### 4.1 Routing Configuration (`vercel.json`)
[`vercel.json`](file:///c:/Users/Administrator/Documents/ai/dadu/dadu-app-imp/vercel.json) specifies:
```json
{
  "rewrites": [
    {
      "source": "/(.*)",
      "destination": "/"
    }
  ]
}
```
- **Evaluation**: Standard Single-Page Application (SPA) rewrite. It ensures deep links (e.g. `/teacher`, `/homeroom/students`, `/reports/ledger`, `/settings`) return `index.html` so that `react-router-dom` handles routing client-side without HTTP 404 errors.

### 4.2 Required Vercel Environment Variables Matrix

All environment variables configured in [`src/services/firebase/config.ts`](file:///c:/Users/Administrator/Documents/ai/dadu/dadu-app-imp/src/services/firebase/config.ts) and defined in [`.env.example`](file:///c:/Users/Administrator/Documents/ai/dadu/dadu-app-imp/.env.example) must be provisioned in the Vercel Project Settings (Production & Preview environments):

| Environment Variable | Required in Vercel? | Expected Value / Format | Purpose / Architectural Impact |
| :--- | :---: | :--- | :--- |
| `VITE_FIREBASE_API_KEY` | **Required** | `AIzaSy...` | Firebase Web Client Authentication |
| `VITE_FIREBASE_AUTH_DOMAIN` | **Required** | `personal-teacher-app.firebaseapp.com` | OAuth Redirects & Auth Handshake |
| `VITE_FIREBASE_PROJECT_ID` | **Required** | `personal-teacher-app` | GCP Project Identification |
| `VITE_FIREBASE_STORAGE_BUCKET` | **Required** | `personal-teacher-app.firebasestorage.app` | Cloud Storage for student photos/docs |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | **Required** | `590515867311` | Firebase Cloud Messaging Sender ID |
| `VITE_FIREBASE_APP_ID` | **Required** | `1:590515867311:web:...` | Web Application Registration ID |
| `VITE_FIREBASE_FIRESTORE_DATABASE_ID` | **CRITICAL** | `ai-studio-97dcf1e2-31b5-4f50-ac68-ea4891b875c7` | **Named Database ID**. If missing or defaulting to `(default)`, client queries will fail or hit empty database |
| `VITE_FIRESTORE_FORCE_LONG_POLLING` | *Optional* | `false` (default) / `true` | When `false`, enables high-speed native WebChannel streaming. Set `true` only behind restrictive proxies |

### 4.3 Static Fallback & Security Risk Analysis
- In [`src/services/firebase/config.ts`](file:///c:/Users/Administrator/Documents/ai/dadu/dadu-app-imp/src/services/firebase/config.ts):
  ```typescript
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || firebaseConfigJson.apiKey,
  ...
  const databaseId = import.meta.env.VITE_FIREBASE_FIRESTORE_DATABASE_ID || firebaseConfigJson.firestoreDatabaseId || '(default)';
  ```
- **Finding (P1 Risk)**: The codebase imports [`firebase-applet-config.json`](file:///c:/Users/Administrator/Documents/ai/dadu/dadu-app-imp/firebase-applet-config.json) as a fallback. While convenient for local development, relying on this fallback in production obscures missing Vercel environment variables. If credentials ever rotate in Firebase Console, an unconfigured Vercel environment will silently continue deploying with stale fallback keys bundled into the client build.
- **TypeScript Interface Deficit**: [`src/vite-env.d.ts`](file:///c:/Users/Administrator/Documents/ai/dadu/dadu-app-imp/src/vite-env.d.ts) declares types for `VITE_FIREBASE_*` variables but omits `VITE_FIRESTORE_FORCE_LONG_POLLING`.

---

## 5. Build Reproducibility & CI/CD Scripts Audit

### 5.1 Verification of `package.json` Scripts

The execution of each lifecycle script in [`package.json`](file:///c:/Users/Administrator/Documents/ai/dadu/dadu-app-imp/package.json) was audited:

```json
"scripts": {
  "dev": "vite --port=3000 --host=0.0.0.0",
  "build": "vite build",
  "preview": "vite preview",
  "clean": "rm -rf dist server.js",
  "lint": "biome lint --diagnostic-level=error src",
  "type-check": "tsc --noEmit",
  "check": "tsc --noEmit && biome lint --diagnostic-level=error src && npm run check:boundaries",
  "lint:fix": "biome check --write src",
  "format": "biome format --write src",
  "test": "vitest run",
  "test:watch": "vitest",
  "test:coverage": "vitest run --coverage",
  "ci": "npm run lint && npm run type-check && npm test && npm run build",
  "check:boundaries": "depcruise src --config .dependency-cruiser.cjs"
}
```

#### Verification Run Results:

1. **`npm run type-check` (`tsc --noEmit`)**:
   - Result: **0 errors**. Exit code 0. TypeScript strictly validates all source code.
2. **`npm run lint` (`biome lint --diagnostic-level=error src`)**:
   - Result: **0 errors**. Checked 218 files in 414ms.
3. **`npm run check:boundaries` (`depcruise src --config .dependency-cruiser.cjs`)**:
   - Result: **0 violations** across 235 modules and 872 dependencies. Hexagonal/layered architecture boundaries are intact.
4. **`npm run build` (`vite build`)**:
   - Result: **Built in 18.15s**. Exit code 0.
   - Bundle analysis:
     - `dist/index.html` (2.73 kB)
     - `dist/assets/index-CzHrtU6j.css` (239.49 kB │ gzip: 29.86 kB)
     - Vendor chunks properly segregated:
       - `vendor-firebase-firestore` (573.84 kB │ gzip: 143.50 kB)
       - `vendor-xlsx` (424.73 kB │ gzip: 141.75 kB)
       - `vendor-react` (223.22 kB │ gzip: 69.24 kB)
       - `vendor-motion` (129.22 kB │ gzip: 42.48 kB)
       - `vendor-firebase-auth` (127.42 kB │ gzip: 25.59 kB)
       - `vendor-firebase-core` (96.19 kB │ gzip: 29.05 kB)
       - `vendor-lucide` (49.46 kB │ gzip: 9.69 kB)
       - `vendor-router` (36.81 kB │ gzip: 13.46 kB)
     - Page chunks are lazily loaded (`DashboardPage`, `MasterDataPage`, `ReportsHubPage`, etc.).
5. **`npm test` (`vitest run`) — ❌ FAILING (P0)**:
   - Result: **1 failed suite, 20 passed suites** (2 failed tests, 109 passed tests). Exit code 1.
   - Failure details:
     ```text
     FAIL src/services/firestore/users.test.ts > Firestore Users Service > createUserProfile
     TypeError: Cannot read properties of undefined (reading 'exists')
       ❯ Module.createUserProfile src/services/firestore/users.ts:31:16
           30| const existing = await getDoc(docRef);
           31| if (existing.exists()) {
     ```
   - **Root Cause**: In commit `f02de47`, anti-overwrite logic (`getDoc(docRef).exists()`) was introduced to protect against cache-miss overwrite. However, `users.test.ts` was not updated to mock `getDoc` for `createUserProfile` tests, returning `undefined`.
6. **`npm run ci` — ❌ BLOCKED (P0)**:
   - Executes: `npm run lint && npm run type-check && npm test && npm run build`.
   - Halts at `npm test` step with exit code 1.
7. **`npm run clean` — ⚠️ Portability Issue (P2)**:
   - Uses Unix command `rm -rf dist server.js`. In native Windows Command Prompt (`cmd.exe`), this script fails with `'rm' is not recognized`.

### 5.2 GitHub Actions Quality Pipeline (`.github/workflows/ci.yml`)

The CI workflow file was evaluated:
```yaml
name: CI Quality Pipeline
on:
  push:
    branches: [ main ]
  pull_request:
    branches: [ main ]
concurrency:
  group: ${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: true
jobs:
  ci:
    name: Verify Quality Gates
    runs-on: ubuntu-latest
    strategy:
      matrix:
        node-version: [22.x]
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: ${{ matrix.node-version }}
          cache: 'npm'
      - run: npm ci
      - run: npm run lint
      - run: npm run type-check
      - run: npm test        <-- BLOCKS CI RUNS DUE TO P0 FAILURE
      - run: npm run build
```

#### Identified CI Gaps:
1. **GitHub Actions is currently red**: Any push or PR will fail on GitHub Actions at step `Run Test Suite` (`npm test`). If branch protection rule *Require status checks to pass before merging* is enabled on `main`, merging is blocked.
2. **Missing Architectural Boundary Enforcement**: Neither `.github/workflows/ci.yml` nor `npm run ci` runs `npm run check:boundaries`. It is only checked if a developer manually runs `npm run check`.

---

## 6. Git Status & History Audit

### 6.1 Current Repository Status (`git status 2>&1`)
```text
On branch main
Your branch is up to date with 'origin/main'.

Untracked files:
  (use "git add <file>..." to include in what will be committed)
	audit/

nothing added to commit but untracked files present (use "git add" to track)
```
- Working tree is clean and synchronized with `origin/main`. No modified tracked files exist.

### 6.2 Recent Commit History (`git log -n 5 --oneline 2>&1`)
```text
945d476 feat(ds): Opsi B full — G4 neo text parity + G5 font loading + G6 accent-glow
495fe91 feat(ds): Opsi A 100% total — G1 radius + G2 elevation + G3 apple glass translucency per system
a03115e chore: add no-dual-source rule (DesignSystem single source, anti-overwrite)
f02de47 fix: P0-P5 comprehensive bug fixes - anti-overwrite, single source, brutalism total, db sync
419e021 chore: sync version 2.3.0 and clean info files
```

### 6.3 Git Release Tag Audit (`git tag -l`)
- Command returned **empty** (0 tags).
- **Finding (P1)**: The repository has no Git tags (neither `v2.2.0` nor `v2.3.0`). Releases exist only as commit messages. Creating formal annotated Git tags is critical for CI/CD automated release deployments, rollback targeting, and changelog generators.

---

## 7. Rollback Plan for v2.3.0

In the event of an unforeseen production regression resulting from the Design System overhaul in v2.3.0, the following rollback runbook must be executed.

### 7.1 Release Boundary & Target Commit

- **Current Production Head (v2.3.0)**: Commit `945d476`
- **v2.3.0 Introduction Boundary**: Commits `48a7697` .. `945d476` (7 commits touching 23 files)
- **Last Stable Baseline (v2.2.0 Head)**: Commit `fbd8bc0` (`fbd8bc038de36b4ee72aa05f267e6901bf0136bc`)
  - Commit message: `refactor: container leak fix - route settings via repository, make app layer Svelte-ready`
  - Timestamp: `2026-09-29 02:41:44 +0900`

### 7.2 Multi-Phase Rollback Runbook

```
[Production Incident Detected in v2.3.0]
                   │
                   ▼
  Phase A: Instant Traffic Rollback (Vercel Console)   <-- < 60 seconds (zero downtime)
                   │
                   ▼
  Phase B: Database & User Profile Safety Check       <-- Schema compatibility confirmed
                   │
                   ▼
  Phase C: Git Branch Revert / Reversion PR            <-- Traceable Git history
                   │
                   ▼
  Phase D: Firebase Config & Rules Guard              <-- PRESERVE database ID target!
                   │
                   ▼
  Phase E: Post-Rollback Quality Gate Verification
```

#### Phase A: Instant Zero-Downtime Rollback via Vercel (Immediate)
1. Open the [Vercel Dashboard](https://vercel.com) for project `dadu-workspace` / `dadu-app-imp`.
2. Navigate to **Deployments**.
3. Locate the last successful deployment associated with commit [`fbd8bc0`](file:///c:/Users/Administrator/Documents/ai/dadu/dadu-app-imp) (or previous v2.2.0 production build).
4. Click the three dots `...` on the deployment entry and select **Instant Rollback / Promote to Production**.
5. *Result*: Vercel edge routers immediately redirect 100% of incoming production traffic to the v2.2.0 static bundle in < 60 seconds without rebuilding or redeploying.

#### Phase B: State & Firestore Schema Compatibility (Safety Validation)
- **User Profile Field Compatibility**:
  - In v2.3.0, profiles may have been saved with `designSystemPreference: 'brutalism' | 'apple-glass' | 'neo-skeuomorphic'`.
  - In v2.2.0 (`ThemeContext.tsx` in `fbd8bc0`):
    ```typescript
    if (profile?.themePreference && VALID_THEME_KEYS.includes(profile.themePreference)) {
      setActiveTheme(profile.themePreference);
      return;
    }
    setActiveTheme('light');
    ```
  - **Audit Confirmation**: v2.2.0 strictly validates known theme keys against `VALID_THEME_KEYS`. Any unknown field or unlisted theme safely falls back to `'light'`. **No database schema migration, script, or profile cleanup is required.**
- **Firestore Security Rules**:
  - `git diff fbd8bc0..HEAD -- firestore.rules` has **0 differences**. The rules remain 100% compatible.

#### Phase C: Git Repository Rollback
To maintain continuous deployment integrity (per `GITHUB-WORKFLOW-GUIDE.md` Execution Rule 7: *never run manual vercel --prod CLI*), create a rollback revert branch:

```bash
# 1. Create a rollback branch from main
git checkout -b rollback/revert-to-v2.2.0

# 2. Revert the commit range 48a7697..945d476 cleanly
git revert --no-commit 48a7697^..945d476

# 3. CRITICAL: Re-apply the named database configuration in firebase.json!
# (Do NOT lose the database ID target during rollback)
```

#### Phase D: Firebase Configuration Guard (CRITICAL WARNING)
> [!CAUTION]
> In commit `f02de47`, `"database": "ai-studio-97dcf1e2-31b5-4f50-ac68-ea4891b875c7"` was added to `firebase.json`.
> If a blind `git revert` is performed, this line would be stripped.
> **DO NOT REMOVE THIS LINE.** If removed, future `firebase deploy --only firestore` commands would deploy to `(default)` database and leave the production named database exposed without rules.
> Keep `firebase.json` with `"database": "ai-studio-97dcf1e2-31b5-4f50-ac68-ea4891b875c7"`.

#### Phase E: Verification Checklist After Rollback
- [ ] Vercel production URL responds with HTTP 200.
- [ ] Open app in incognito window: UI loads standard Atelier Zamrud (`light`) theme.
- [ ] User login succeeds via Firebase Auth.
- [ ] Navigation to `/dashboard`, `/teacher`, `/homeroom`, and `/settings` succeeds without errors.
- [ ] Version displayed in footer / settings reflects `ver. 2.2-JRA`.

---

## 8. Prioritized Findings & Remediation Plan

### 8.1 P0 (Critical / Deployment Blocker)

| Issue ID | Description | Impact | Root Cause | Remediation |
| :---: | :--- | :--- | :--- | :--- |
| **OPS-P0-01** | Unit test failure in `src/services/firestore/users.test.ts` | Blocks `npm run ci` and all automated PR merges in GitHub Actions | Anti-overwrite check (`getDoc(docRef).exists()`) added in `users.ts` without mocking `getDoc` in `users.test.ts` | Update `users.test.ts` test cases for `createUserProfile` to mock `getDoc` returning `{ exists: () => false }` |

### 8.2 P1 (High Priority / Operational & Deployment Risks)

| Issue ID | Description | Impact | Root Cause | Remediation |
| :---: | :--- | :--- | :--- | :--- |
| **OPS-P1-01** | Missing Git release tags (`v2.2.0`, `v2.3.0`) | Inability to track releases reliably, error-prone manual rollback targeting | Releases committed to `main` without running `git tag` | Create annotated tags: `git tag -a v2.2.0 fbd8bc0 -m "Release v2.2.0"` and `git tag -a v2.3.0 945d476 -m "Release v2.3.0"` |
| **OPS-P1-02** | Omission of `check:boundaries` in GitHub Actions CI | Architectural boundary leaks could merge undetected via PR | `.github/workflows/ci.yml` was not updated when `depcruise` was introduced in Phase 7 | Add step `- name: Architecture Boundaries Check\n  run: npm run check:boundaries` to `ci.yml` and `npm run ci` |
| **OPS-P1-03** | Silent static fallback for `VITE_FIREBASE_*` in production | If Vercel env vars are not set, app falls back to checked-in json with no alerting | `config.ts` uses `|| firebaseConfigJson.key` fallbacks unconditionally | Add build-time or runtime environment validation asserting `VITE_FIREBASE_*` presence in non-local environments |
| **OPS-P1-04** | Missing type declaration for `VITE_FIRESTORE_FORCE_LONG_POLLING` | Minor TypeScript interface drift in `src/vite-env.d.ts` | Variable added in Phase 8 without updating `ImportMetaEnv` | Add `readonly VITE_FIRESTORE_FORCE_LONG_POLLING?: string;` to `src/vite-env.d.ts` |

### 8.3 P2 (Medium Priority / Maintenance & Tooling Hygiene)

| Issue ID | Description | Impact | Root Cause | Remediation |
| :---: | :--- | :--- | :--- | :--- |
| **OPS-P2-01** | `package.json` `"clean"` script uses non-portable `rm -rf` | `npm run clean` fails on Windows Command Prompt (`cmd.exe`) | Shell-specific Unix command in npm script | Replace `"clean": "rm -rf dist server.js"` with cross-platform node script or rely on Vite's `build.emptyOutDir: true` |
| **OPS-P2-02** | Missing documentation clarifying Firebase Hosting vs Vercel | Developers might attempt `firebase deploy` expecting frontend hosting | Multi-cloud architecture (Vercel CDN + Firebase BaaS) | Add an explicit deployment section in `README.md` and `docs/GITHUB-WORKFLOW-GUIDE.md` detailing the separation |

---

## 9. Conclusion

DADU Workspace exhibits strong operational hygiene in its version synchronization, bundle modularity, and database deployment targeting. The single-source-of-truth rule (`no-dual-source.md`) is properly respected in `firebase.json` with the named database ID `ai-studio-97dcf1e2-31b5-4f50-ac68-ea4891b875c7`.

The sole blocker preventing continuous integration deployment gates from succeeding is **OPS-P0-01** (the 2 mock-related test failures in `users.test.ts`), which must be resolved to restore green builds in GitHub Actions. Once patched and tagged with `git tag v2.3.0`, the v2.3.0 release is fully deployable and has a validated zero-downtime rollback path.
