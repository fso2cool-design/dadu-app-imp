# Layer 4 Security Audit Report: DADU Workspace

**Date:** 2026-09-30  
**Project:** DADU (Data Akademik & Database Utama) Workspace (`dadu-app-imp`)  
**Auditor:** Antigravity Autonomous Security Auditor  
**Audit Scope:** Layer 4 Security (Cloud Firestore Security Rules, Access Control & Privilege Escalation, Secret & Credential Exposure, App Check / Abuse Prevention, Client-Side Logging & Token Leakage)

---

## 1. Executive Summary

This read-only security audit thoroughly investigates the security posture of the DADU application across Layer 4 (Security). The audit encompasses:
- Cloud Firestore Security Rules (`firestore.rules`, 358 lines)
- Role-Based Access Control (RBAC), Super Admin elevation, and privilege escalation vulnerabilities
- Secret hygiene, `.gitignore` compliance, and `.env.local` safety
- Public `VITE_FIREBASE_*` configuration exposure vs. Admin SDK credentials
- Information leakage and authentication token exposure in client-side logging
- Firebase App Check deployment and bot/abuse defense readiness

### Key Metrics Summary:
| Audit Area | Findings / Measurement | Status | Risk Level |
| :--- | :--- | :--- | :--- |
| **Firestore Security Rules LOC** | 358 lines audited | Evaluated | — |
| **Global Permissive Rules (`match /{all=**}`)** | Deny by default (no mass open catch-all) | Pass | Low |
| **Unauthenticated Read Operations** | 1 collection (`/sharedReports/{reportId}`) | Warning | Medium (P1) |
| **Unauthenticated Write Operations** | 1 collection (`/sharedReports/{reportId}` view counter) | Warning | Medium (P1) |
| **Workspace Subcollection Isolation** | 18 subcollections enforce `uid == userId` or `isSuperAdmin()` | Pass | Low |
| **User Profile Onboarding Privilege Escalation** | `users/{userId}` `create` rule does NOT restrict `role` | ⚠️ Vulnerability | **High (P0)** |
| **SuperAdmin Email Auth Guard** | Missing `email_verified == true` validation | ⚠️ Vulnerability | **High (P0)** |
| **Hardcoded Super Admin Emails** | Hardcoded in `firestore.rules` and 6+ frontend files | Architectural Drift | Medium (P1) |
| **`.env.local` Exposure** | Ignored by `.gitignore:7:.env*`, 0 committed secrets | Pass | Low |
| **Admin SDK Credentials in Frontend** | No private keys or service accounts found in client code | Pass | Low |
| **Auth Token / Credential Logging** | 0 tokens logged in `console.*` or `onAuthStateChanged` | Pass | Low |
| **Firebase App Check** | Not implemented (0 occurrences, empty reCAPTCHA key) | Gap | Medium (P1) |

---

## 2. Firestore Security Rules Audit (`firestore.rules`)

The security rules define access control for the application database (`ai-studio-97dcf1e2-31b5-4f50-ac68-ea4891b875c7`).

### 2.1 Default Posture
- Rules version: `rules_version = '2';`
- Catch-all fallback: Cloud Firestore defaults to **deny all** when no rule matches. No overly permissive wildcard like `allow read, write: if true;` exists at the root.

### 2.2 User Profiles (`/users/{userId}`) — Vulnerability Analysis
```javascript
match /users/{userId} {
  // Allow reading user profiles (admin can list all users to manage accounts)
  allow list: if request.auth != null && (isSuperAdmin() || request.auth.uid == userId);
  allow get: if request.auth != null && (isSuperAdmin() || request.auth.uid == userId);
  
  // Allow create user profile during onboarding/signup
  allow create: if request.auth != null && request.auth.uid == userId;
  
  // Allow update by owner (without privilege escalation) or by Super Admin
  allow update: if request.auth != null && (
    isSuperAdmin() || 
    (request.auth.uid == userId && 
      (!request.resource.data.diff(resource.data).affectedKeys().hasAny(['role', 'accountStatus']) 
       || (resource.data.role == request.resource.data.role && resource.data.accountStatus == request.resource.data.accountStatus)))
  );
  
  // Allow Super Admin to delete/purge accounts to manage free quota
  allow delete: if request.auth != null && isSuperAdmin();
}
```

#### Vulnerabilities Identified:
1. **CRITICAL (P0): Privilege Escalation on Profile Creation (`allow create`)**
   - While `allow update` carefully forbids regular users from changing `role` or `accountStatus` (`!request.resource.data.diff(resource.data).affectedKeys().hasAny(['role', 'accountStatus'])`), the `allow create` rule has **NO field constraints whatsoever**:
     ```javascript
     allow create: if request.auth != null && request.auth.uid == userId;
     ```
   - Any newly registered authenticated user can call `setDoc(doc(db, 'users', auth.currentUser.uid), { role: 'ADMIN', accountStatus: 'ACTIVE', ... })`.
   - In the frontend (`src/App.tsx:56`, `src/components/layout/Header.tsx:112`, `src/features/admin/AdminUserManagementPage.tsx:599`):
     ```typescript
     const isAdmin = profile?.role === 'ADMIN' || profile?.email === 'johanrovian90@gmail.com' || profile?.email === 'fso2cool@gmail.com';
     ```
   - An attacker setting their profile role to `'ADMIN'` upon signup immediately gains UI Super Admin privileges, rendering the Admin User Management, User Purging, and Role Edit screens accessible in their client.
   - **Remediation**: Restrict document creation so that `role` MUST equal `'TEACHER'` (or can only be `'ADMIN'` if `isSuperAdmin()`):
     ```javascript
     allow create: if request.auth != null && request.auth.uid == userId
       && request.resource.data.role in ['TEACHER']
       && (!('accountStatus' in request.resource.data) || request.resource.data.accountStatus == 'ACTIVE');
     ```

2. **CRITICAL (P0): Unverified Email Check in `isSuperAdmin()`**
   ```javascript
   function isSuperAdmin() {
     return request.auth != null && (
       request.auth.token.email == 'johanrovian90@gmail.com' ||
       request.auth.token.email == 'fso2cool@gmail.com'
     );
   }
   ```
   - The rule checks `request.auth.token.email` without requiring `request.auth.token.email_verified == true`.
   - In standard Firebase email/password signup or untrusted identity provider linking, an attacker could sign up with `johanrovian90@gmail.com` before the genuine owner creates or links the email, receiving a token with that email and immediately acquiring SuperAdmin privileges across all Firestore collections.
   - **Remediation**:
     ```javascript
     function isSuperAdmin() {
       return request.auth != null 
         && request.auth.token.email_verified == true
         && (
           request.auth.token.email == 'johanrovian90@gmail.com' ||
           request.auth.token.email == 'fso2cool@gmail.com'
         );
     }
     ```

### 2.3 Workspace Subcollections (`/users/{userId}/*`)
The following 18 subcollections were audited:
- `classes`, `students`, `subjects`, `teachingAssignments`, `academicYears`, `enrollments`, `scores`, `meetings`, `attendanceRecords`, `dailyAttendanceSessions`, `dailyAttendanceRecords`, `assessmentItems`, `studentNotes`, `teacherAttendanceRecords`, `teacherMonthlyAttendance`, `classSchedules`, `settings`, `studentCustomFields`

#### Strengths:
- **Tenant Isolation**: Every subcollection enforces `request.auth != null && (request.auth.uid == userId || isSuperAdmin())`. A teacher cannot read or write another teacher's classes, students, or scores.
- **Relational Integrity & Immutability**:
  - `classes`: `academicYearId` is immutable on update.
  - `teachingAssignments`: `academicYearId`, `classId`, and `subjectId` are immutable.
  - `enrollments`: Foreign key immutability enforced, status enum validated (`['ACTIVE', 'TRANSFERRED', 'GRADUATED', 'DROPOUT', 'ARCHIVED']`), relinking requires explicit audit key `relinkedAt`.
  - `scores`: Validates score range `0 <= score <= 100`, prevents changing `assessmentItemId`.
  - `attendanceRecords`: Validates status enums (`['PRESENT', 'SICK', 'PERMITTED', 'ABSENT', 'DISPENSATION']`).

#### Gaps:
- `settings` and `studentCustomFields` lack schema and payload length validation (`allow read, write, delete: if request.auth != null && (request.auth.uid == userId || isSuperAdmin());`). While tenant-isolated, an authenticated client can store arbitrary structures or oversized documents up to Firestore's 1MB limit.

### 2.4 Shared Reports (`/sharedReports/{reportId}`)
```javascript
match /sharedReports/{reportId} {
  // Allow public get if document exists, is not revoked, and is not expired
  allow get: if resource.data.isRevoked != true
    && (!('expiresAt' in resource.data) || resource.data.expiresAt == null || !(resource.data.expiresAt is timestamp) || request.time < resource.data.expiresAt);

  // Listing is restricted to the creator or Super Admin
  allow list: if request.auth != null && (request.auth.uid == resource.data.userId || isSuperAdmin());

  // Authenticated teacher can create a shared report with their own userId
  allow create: if request.auth != null
    && request.resource.data.userId == request.auth.uid
    && request.resource.data.id == reportId
    && request.resource.data.isRevoked == false
    && request.resource.data.viewCount == 0
    && !('passcode' in request.resource.data);

  // Owner or Super Admin can revoke/update, or viewer can increment viewCount & lastViewedAt
  allow update: if (
    (request.auth != null && (request.auth.uid == resource.data.userId || isSuperAdmin())
      && (!request.resource.data.diff(resource.data).affectedKeys().hasAny(['userId', 'id', 'reportType']))
    ) ||
    (resource.data.isRevoked != true
      && (!('expiresAt' in resource.data) || resource.data.expiresAt == null || !(resource.data.expiresAt is timestamp) || request.time < resource.data.expiresAt)
      && request.resource.data.diff(resource.data).affectedKeys().hasOnly(['viewCount', 'lastViewedAt'])
      && request.resource.data.viewCount is number
      && request.resource.data.viewCount >= resource.data.viewCount
    )
  );

  allow delete: if request.auth != null && (request.auth.uid == resource.data.userId || isSuperAdmin());
}
```

#### Observations & Risks:
1. **Unauthenticated Public Read (`allow get`)**:
   - By design, shared reports allow public view via token URL (`/shared/report/:id`).
   - Token entropy: Uses `window.crypto.getRandomValues` to generate 8-character base58 tokens ($\approx 54^8 \approx 7.2 \times 10^{13}$ combinations), preventing brute-force enumeration.
   - `allow list` is strictly guarded (`request.auth.uid == resource.data.userId || isSuperAdmin()`), preventing attackers from listing all shared reports.
   - **Zero-Knowledge Encryption**: When a passcode is configured, the payload is client-side encrypted with AES-GCM (PBKDF2 with 100,000 iterations), and `firestoreData.payload = null`. Plaintext passcodes are strictly forbidden (`!('passcode' in request.resource.data)`).
   - **Risk (P2)**: When no passcode is set, the student report payload (containing student names, scores, attendance) is stored in plaintext in Firestore, readable by anyone who acquires the token.
2. **Unauthenticated Write Permissiveness (`allow update`)**:
   - The rule permits unauthenticated callers to update `viewCount` and `lastViewedAt`.
   - **Risk (P1)**: `lastViewedAt` has no data type validation (`is timestamp`). An attacker could inject arbitrary strings into `lastViewedAt`. Furthermore, because write calls to Firestore incur billing and quota usage, unauthenticated update spam can increment `viewCount` repeatedly, draining write quotas.
   - **Remediation**:
     ```javascript
     && request.resource.data.diff(resource.data).affectedKeys().hasOnly(['viewCount', 'lastViewedAt'])
     && request.resource.data.viewCount is number
     && request.resource.data.viewCount == resource.data.viewCount + 1
     && request.resource.data.lastViewedAt is timestamp
     && request.resource.data.lastViewedAt == request.time
     ```

### 2.5 Collection Group Queries (`match /{path=**}/classes/{docId}` etc.)
- Lines 311–353: Rules guard 14 collection groups (`classes`, `students`, `academicYears`, `subjects`, `teachingAssignments`, `dailyAttendanceSessions`, `attendanceRecords`, `teacherAttendanceRecords`, `studentCustomFields`, `enrollments`, `meetings`, `scores`, `assessmentItems`, `studentNotes`).
- All collection group matches require `isSuperAdmin()`.
- Standard authenticated users cannot execute collection-group queries across other tenants.

---

## 3. SuperAdmin Email List Verification

### 3.1 Codebase Audit Findings
Command run: `git grep -n -E "johanrovian90@gmail\.com|fso2cool@gmail\.com"`

Found occurrences across **7 files**:
1. `firestore.rules:7-8`:
   ```javascript
   request.auth.token.email == 'johanrovian90@gmail.com' ||
   request.auth.token.email == 'fso2cool@gmail.com'
   ```
2. `src/App.tsx:56`:
   ```typescript
   const isAdmin = profile?.role === 'ADMIN' || profile?.email === 'johanrovian90@gmail.com' || profile?.email === 'fso2cool@gmail.com';
   ```
3. `src/components/layout/Header.tsx:112`:
   ```typescript
   const isAdmin = profile?.role === 'ADMIN' || profile?.email === 'johanrovian90@gmail.com' || profile?.email === 'fso2cool@gmail.com';
   ```
4. `src/features/admin/AdminUserManagementPage.tsx:599, 625, 650`:
   ```typescript
   const isSuper = (u.role === 'ADMIN' && (u.email === 'johanrovian90@gmail.com' || u.email === 'fso2cool@gmail.com'));
   ```
5. `src/features/admin/EditUserModal.tsx:63`:
   ```typescript
   const isSuperAdminEmail = targetUser.email === 'johanrovian90@gmail.com' || targetUser.email === 'fso2cool@gmail.com';
   ```
6. `src/services/firestore/users.ts:35`:
   ```typescript
   const isAdminEmail = data.email === 'johanrovian90@gmail.com' || data.email === 'fso2cool@gmail.com';
   ```
7. `src/services/firestore/users.test.ts:89`:
   ```typescript
   email: 'johanrovian90@gmail.com'
   ```
8. Documentation note in `docs/DADU-ARCHITECTURE.md:263` already flagged this architectural vulnerability as High severity:
   > *"Hardcoding johanrovian90@gmail.com and fso2cool@gmail.com requires code modification and deployment whenever admin personnel changes."*

### 3.2 Security Implications & Deficiencies:
- **Dual Source of Truth / Desynchronization**:
  The UI checks `profile?.role === 'ADMIN'`, while `firestore.rules` checks only the hardcoded email list. If an admin edits another user's role to `ADMIN` in `EditUserModal`, that user will see Admin navigation in the UI, but all underlying Firestore admin requests (such as listing all users or running collection group queries) will be rejected by Firestore Security Rules.
- **Exposure in Bundled Code**:
  Hardcoded administrative email addresses are baked into the production JavaScript bundle, exposing administrator identities.
- **Recommended Architecture**:
  Migrate to Firebase Auth Custom Claims (`request.auth.token.role == 'ADMIN'`). Custom claims are set via the Firebase Admin SDK on a trusted backend/Cloud Function, cryptographically signed in the user's JWT, and evaluated in security rules with zero database reads.

---

## 4. Secret & Credential Exposure Audit (`.env.local` & Git)

### 4.1 `.gitignore` Inspection
`.gitignore` file contents:
```gitignore
node_modules/
build/
dist/
coverage/
.DS_Store
*.log
.env*
!.env.example
.vercel
```

- Verification command: `git check-ignore -v .env.local`
- Result: `.gitignore:7:.env* .env.local` (Properly ignored).
- Git History Inspection: `git log --all --full-history -- "**.env*"`
- Result: No secret-bearing `.env` or `.env.local` files were ever committed to the repository history. Only `.env.example` and `src/vite-env.d.ts` are tracked.

### 4.2 Local `.env.local` Inspection
- File present on disk (size: 1308 bytes).
- Analysis of keys:
  - Contains Vercel CLI authentication token (`VERCEL_OIDC_TOKEN`).
  - Contains **NO** Firebase Admin SDK private keys, GCP service account credentials, or database passwords.
  - Verification passed.

---

## 5. `VITE_FIREBASE_*` Public Configuration Exposure

### 5.1 Environment Variable Usage in Source
Command run: `git grep -n -E "VITE_FIREBASE_|process\.env\.VITE_FIREBASE" src`

Variables utilized in `src/services/firebase/config.ts`:
- `VITE_FIREBASE_API_KEY`
- `VITE_FIREBASE_AUTH_DOMAIN`
- `VITE_FIREBASE_PROJECT_ID`
- `VITE_FIREBASE_STORAGE_BUCKET`
- `VITE_FIREBASE_MESSAGING_SENDER_ID`
- `VITE_FIREBASE_APP_ID`
- `VITE_FIREBASE_FIRESTORE_DATABASE_ID`
- `VITE_FIRESTORE_FORCE_LONG_POLLING`

Fallback JSON: `firebase-applet-config.json`
```json
{
  "projectId": "personal-teacher-app",
  "appId": "1:590515867311:web:697002a1eba887004c0e5a",
  "apiKey": "AIzaSyDZNXK90RD111cYgyVFELa4uMtgPiyXPu0",
  "authDomain": "personal-teacher-app.firebaseapp.com",
  "firestoreDatabaseId": "ai-studio-97dcf1e2-31b5-4f50-ac68-ea4891b875c7",
  "storageBucket": "personal-teacher-app.firebasestorage.app",
  "messagingSenderId": "590515867311",
  "measurementId": "",
  "oAuthClientId": "590515867311-bjid4h8uib5oq2okah04ue4se1v2quvu.apps.googleusercontent.com",
  "recaptchaSiteKey": ""
}
```

### 5.2 Verification Finding
- **Safe Public Identifiers**: In Firebase architecture, web client API keys (`AIzaSy...`), `projectId`, and `appId` are public routing identifiers designed to be embedded in client-side code. They do not grant administrative access without valid authentication tokens.
- **Admin SDK Keys**: 0 service account keys (`private_key`, `client_email`) exist in client code.
- **Named Database Protection**: `firebase.json` explicitly targets named database `"database": "ai-studio-97dcf1e2-31b5-4f50-ac68-ea4891b875c7"`, preventing accidental deployment of rules or queries to the `(default)` instance.
- **GCP API Key Restrictions**: While the key is public, best practice requires restricting this key in Google Cloud Console (`APIs & Services > Credentials`) with:
  1. Application restrictions (HTTP referrers matching production and authorized development domains).
  2. API restrictions (only Google Identity Toolkit API, Token Service API, and Cloud Firestore API).

---

## 6. Client-Side Logging & Token Leak Audit

### 6.1 Token Inspection
Commands run:
- `git grep -n -E "auth\.currentUser|getIdToken|getIdTokenResult" src`
- `git grep -n -E "currentUser|getIdToken|onAuthStateChanged" src`

Findings:
- Neither `getIdToken` nor `getIdTokenResult` is called anywhere in `src/`.
- `onAuthStateChanged` in `src/features/auth/AuthContext.tsx` handles `currentUser` safely:
  - User object is stored in React component state (`setUser(currentUser)`).
  - Session recording only stores UID in `sessionStorage` (`sessionStorage.setItem('login_session_recorded', currentUser.uid)`).
  - No `console.log` statements dump the user object, tokens, or credentials.

### 6.2 Full `console.*` Audit
Scanned all 80+ `console.error` and `console.warn` occurrences in `src/`:
- All logging calls are standard exception catches (e.g. `console.error('Error fetching journal report data:', err)`).
- No sensitive user payloads, passwords, decrypted report texts, or auth tokens are logged to browser consoles.

---

## 7. Firebase App Check Audit

### 7.1 Audit Findings
Command run: `git grep -i -E "appCheck|app.check" src firestore.rules package.json`
- Occurrences: **0**
- Dependency `@firebase/app-check` or `firebase/app-check`: **Not installed / Not initialized**.
- `firebase-applet-config.json`: `"recaptchaSiteKey": ""` (Empty).

### 7.2 Risk & Threat Modeling:
- **Direct API Scraping**: Because App Check is absent, any external script, curl command, or Postman client using the public API key and project ID can issue direct HTTP requests to Firestore's REST and WebChannel APIs.
- **Denial of Wallet / Quota Exhaustion**: An automated bot can flood read/write requests to `sharedReports` (updating view counts or reading reports) or attempt to spam `/feedbacks`, consuming project quotas.
- **Bypassing Client Logic**: Any business rules enforced solely in React components (such as form validation or UI rate limits) can be bypassed by issuing direct Firestore queries.

---

## 8. Security Risk Matrix

| Risk ID | Vulnerability Description | Category | Severity | Likelihood | Impact |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **SEC-01** | `users/{userId}` `create` rule allows setting `role: 'ADMIN'` during onboarding | Authorization / Privilege Escalation | **HIGH** | Medium | High |
| **SEC-02** | `isSuperAdmin()` in `firestore.rules` does not verify `email_verified == true` | Authentication / Identity Spoofing | **HIGH** | Medium | High |
| **SEC-03** | Firebase App Check not configured or enforced | Abuse Prevention / Anti-Bot | **MEDIUM** | High | Medium |
| **SEC-04** | Hardcoded Super Admin emails across frontend and backend rules | Architecture / Info Disclosure | **MEDIUM** | Low | Medium |
| **SEC-05** | Unauthenticated `sharedReports` update allows arbitrary `lastViewedAt` & view spam | Denial of Service / Integrity | **MEDIUM** | High | Low |
| **SEC-06** | Passcode-less shared reports store student data in plaintext | Data Privacy | **LOW** | Medium | Low |
| **SEC-07** | Lack of schema & payload size validation on `settings` and `studentCustomFields` | Schema Validation | **LOW** | Low | Low |

---

## 9. Actionable Prioritized Remediation Plan

### P0: Critical Vulnerabilities (Immediate Action Required)

#### 1. Fix `users/{userId}` Creation Privilege Escalation (`firestore.rules`)
Update line 18 of `firestore.rules` to strictly prevent setting `role: 'ADMIN'` on document creation:
```javascript
// Before (Vulnerable):
allow create: if request.auth != null && request.auth.uid == userId;

// After (Secure):
allow create: if request.auth != null && request.auth.uid == userId
  && request.resource.data.role == 'TEACHER'
  && (!('accountStatus' in request.resource.data) || request.resource.data.accountStatus in ['ACTIVE', 'PENDING']);
```

#### 2. Enforce `email_verified == true` for SuperAdmin (`firestore.rules`)
Update lines 5-10 of `firestore.rules`:
```javascript
// Before (Vulnerable):
function isSuperAdmin() {
  return request.auth != null && (
    request.auth.token.email == 'johanrovian90@gmail.com' ||
    request.auth.token.email == 'fso2cool@gmail.com'
  );
}

// After (Secure):
function isSuperAdmin() {
  return request.auth != null 
    && request.auth.token.email_verified == true
    && (
      request.auth.token.email == 'johanrovian90@gmail.com' ||
      request.auth.token.email == 'fso2cool@gmail.com'
    );
}
```

---

### P1: Medium Priority Security Improvements

#### 1. Implement Firebase App Check
1. Enable App Check in the Firebase Console with **reCAPTCHA Enterprise** (or reCAPTCHA v3) for web.
2. Add `recaptchaSiteKey` to environment configuration.
3. In `src/services/firebase/config.ts`:
   ```typescript
   import { initializeAppCheck, ReCaptchaEnterpriseProvider } from 'firebase/app-check';

   if (typeof window !== 'undefined' && import.meta.env.VITE_RECAPTCHA_SITE_KEY) {
     initializeAppCheck(app, {
       provider: new ReCaptchaEnterpriseProvider(import.meta.env.VITE_RECAPTCHA_SITE_KEY),
       isTokenAutoRefreshEnabled: true,
     });
   }
   ```
4. Enforce App Check in the Firebase Console for Cloud Firestore once client distribution is complete.

#### 2. Strict Type & Rate Guard on `sharedReports` Updates (`firestore.rules`)
Harden `allow update` on `/sharedReports/{reportId}` (lines 298-304):
```javascript
(resource.data.isRevoked != true
  && (!('expiresAt' in resource.data) || resource.data.expiresAt == null || !(resource.data.expiresAt is timestamp) || request.time < resource.data.expiresAt)
  && request.resource.data.diff(resource.data).affectedKeys().hasOnly(['viewCount', 'lastViewedAt'])
  && request.resource.data.viewCount is number
  && request.resource.data.viewCount == resource.data.viewCount + 1
  && request.resource.data.lastViewedAt is timestamp
  && request.resource.data.lastViewedAt == request.time
)
```

#### 3. Centralize and Migrate SuperAdmin Role to Custom Claims
1. Remove hardcoded email lists from `src/App.tsx`, `src/components/layout/Header.tsx`, `src/features/admin/AdminUserManagementPage.tsx`, and `src/features/admin/EditUserModal.tsx`.
2. Define a single source helper `isSuperAdmin(user, profile)` in `src/domain/auth/authPolicy.ts`.
3. Plan migration to Firebase Auth Custom Claims (`request.auth.token.role == 'ADMIN'`).

---

### P2: Low Priority / Defense-in-Depth Hardening

#### 1. Payload and Size Constraints on Subcollections
Add size and key constraints to `settings` and `studentCustomFields` to prevent storing oversized blobs:
```javascript
match /settings/{settingId} {
  allow read: if request.auth != null && (request.auth.uid == userId || isSuperAdmin());
  allow write: if request.auth != null && (request.auth.uid == userId || isSuperAdmin())
    && request.resource.size() < 100 * 1024; // Limit to 100KB
  allow delete: if request.auth != null && (request.auth.uid == userId || isSuperAdmin());
}
```

#### 2. Encourage Passcode Protection on Shared Reports
In `src/features/reports/ShareReportModal.tsx`, display a clear security recommendation urging teachers to configure a passcode when sharing sensitive student grades and personal information with parents.

---

## 10. Verification of Existing Tests
A test suite run (`npm test -- --run`) executed 21 test files (111 tests):
- 20 test files passed (109 tests passed).
- 1 test file failed: `src/services/firestore/users.test.ts` (2 tests failed due to a missing mock for `getDoc` returning `{ exists: () => false }` when enforcing rule 3 from `no-dual-source.md`: *"`createUserProfile` MUST check `getDoc` `exists()` first"*).
- The security audit was conducted completely in read-only mode without modifying any application source files or tests.
