# DADU — GitHub Actions & CI/CD Workflow Guide

> **Version**: 1.0.0 | **Author**: DADU Architecture Team | **Last Updated**: 2026-09-23

---

## 1. Overview

DADU employs an automated Continuous Integration (CI) pipeline powered by **GitHub Actions** and continuous deployment managed by **Vercel**. Every pull request and push to the `main` branch is validated against four automated quality gates before any deployment occurs:

```
[Git Push / PR] 
       │
       ▼
1. Biome Lint        (Sub-second static analysis)
       │
       ▼
2. TypeScript Check  (tsc --noEmit strict compiler verification)
       │
       ▼
3. Vitest Suite      (11 test suites / 61 tests)
       │
       ▼
4. Vite Build        (Production bundle compilation & chunk validation)
       │
       ▼
[Green Checks Pass] ──► Auto-deploy Preview (PR) / Production (main)
```

---

## 2. GitHub Actions Workflow Configuration

The workflow is defined in [`.github/workflows/ci.yml`](file:///.github/workflows/ci.yml).

### Pipeline Characteristics:
- **Triggers**: Pushes to `main` and Pull Requests targeting `main`.
- **Concurrency**: `cancel-in-progress: true` prevents wasted compute by cancelling obsolete runs when subsequent commits are pushed to the same PR.
- **Node.js**: Runs on Node 22 LTS with native npm package caching.
- **Dependency Installation**: Uses `npm ci` ensuring exact parity with [`package-lock.json`](file:///package-lock.json).

---

## 3. Recommended Branch Protection Rules

To prevent accidental regressions and enforce team review, configure the following settings in your GitHub Repository under **Settings** ➔ **Branches** ➔ **Add branch protection rule**:

### Branch Pattern:
- **Branch name pattern**: `main`

### Protection Rules:
1. **Require a pull request before merging**:
   - Check *Require approvals* (Recommended: 1 approval).
   - Check *Dismiss stale pull request approvals when new commits are pushed*.
2. **Require status checks to pass before merging**:
   - Check *Require branches to be up to date before merging*.
   - In the search bar for status checks, select:
     - `Verify Quality Gates (22.x)`
3. **Do not allow bypassing the above settings**:
   - Ensures administrators and bots adhere to the same quality standard.
4. **Restrict force pushes**:
   - Disable *Allow force pushes* (checked by default to prevent history rewriting).
5. **Restrict deletions**:
   - Disable *Allow deletions*.

---

## 4. Vercel Preview & Production Deployments

DADU is hosted on Vercel with automatic Git integration:

1. **Pull Request Previews**:
   - When a PR is opened, Vercel automatically creates an isolated preview URL (e.g., `dadu-app-imp-git-feature-xyz.vercel.app`).
   - The preview URL allows stakeholders, teachers, and admins to test UI and workflow changes live before merging.
2. **Production Deployments**:
   - Upon merging the PR to `main` (after all CI quality checks pass), Vercel automatically initiates an atomic zero-downtime production deployment.
   - SPA route rewrites are governed by [`vercel.json`](file:///vercel.json).
3. **Production Security Rule**:
   - As stated in `DADU-UPGRADE-ROADMAP.md` Execution Rule 7: **Never execute manual `vercel --prod` CLI deployments**. All production releases must flow through Git commits on `main`.

---

## 5. Local CI Verification

Developers can execute the exact CI sequence locally before committing:

```bash
# Run the complete CI sequence
npm run ci

# Or run individual steps
npm run lint         # Biome linter
npm run type-check   # TypeScript compiler
npm test             # Vitest test suite
npm run build        # Production bundle build
```
