# Layer 3 Data & Database Audit Report: DADU Workspace

**Date:** 2026-09-30  
**Project:** DADU (Data Akademik & Database Utama) Workspace (`dadu-app-imp`)  
**Auditor:** Antigravity Autonomous Architecture & Database Auditor  
**Audit Scope:** Layer 3 Data & DB (Firestore Schema, Subcollection Isolation, Security Rules, Composite Indexes, Offline Cache Persistence, Dual Field Deprecation, and Test Integrity)

---

## 1. Executive Summary

This read-only database and data layer audit reviews the storage architecture, schema patterns, query indexing, offline caching, and security boundaries of the DADU application.

DADU employs a **Multi-tenant Per-User Workspace Subcollection Isolation Architecture**. All operational teacher records (classes, students, enrollments, teaching assignments, meetings, assessments, attendance, and notes) are scoped strictly under `users/{userId}/{subcollection}` rather than global shared collections. Global root collections are strictly limited to `users`, `feedbacks`, and `sharedReports`.

### Key Verification Highlights:
| Verification Target | Expected | Observed | Status |
| :--- | :--- | :--- | :--- |
| **`firebase.json` target database** | `ai-studio-97dcf1e2-31b5-4f50-ac68-ea4891b875c7` | `ai-studio-97dcf1e2-31b5-4f50-ac68-ea4891b875c7` | **PASS** |
| **`firebase-applet-config.json` database** | `ai-studio-97dcf1e2-31b5-4f50-ac68-ea4891b875c7` | `ai-studio-97dcf1e2-31b5-4f50-ac68-ea4891b875c7` | **PASS** |
| **Offline Cache Engine** | `persistentLocalCache` + multi-tab | `persistentMultipleTabManager` configured | **PASS** |
| **Offline/Unavailable Error Guard** | Preserve profile on cache miss | Handled in `AuthContext` + `createUserProfile` exists guard | **PASS** |
| **Dual Field Preference Audit** | `themePreference` deprecated / read-fallback only | Single write source to `designSystemPreference` | **PASS** |
| **Single Source Theme Context** | `ThemeContext` pure alias/shim | Zero state, zero localStorage, zero writes | **PASS** |
| **Composite Indexes Defined** | Validated in `firestore.indexes.json` | 12 composite indexes defined | **PASS** |
| **Composite Index Coverage** | All queries with `where` + `orderBy` / range indexed | **4 missing index patterns identified** | ⚠️ **P0 / P1** |
| **Service Unit Tests (`users.test.ts`)** | All tests pass | 2/5 tests fail due to mock missing `getDoc.exists()` | ⚠️ **P1** |

---

## 2. Configuration & Deployment Target Verification

### 2.1 `firebase.json` Database Configuration
Inspection of `firebase.json`:
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
- **Target Verification**: The `database` property is set to `ai-studio-97dcf1e2-31b5-4f50-ac68-ea4891b875c7`.
- **Deployment Safety**: When `firebase deploy --only firestore` is executed, Firestore CLI deploys both rules and indexes directly to the named database instead of deploying to `(default)`. This satisfies Rule 4 of `.agents/rules/no-dual-source.md`.

### 2.2 Client Firebase Initialization (`src/services/firebase/config.ts`)
```typescript
const databaseId = 
  import.meta.env.VITE_FIREBASE_FIRESTORE_DATABASE_ID || 
  firebaseConfigJson.firestoreDatabaseId || 
  '(default)';
```
- Evaluated database ID from `firebase-applet-config.json`: `"ai-studio-97dcf1e2-31b5-4f50-ac68-ea4891b875c7"`.
- The client application connects to the designated named database in development and production environments.

---

## 3. Offline Cache & Connectivity Architecture

### 3.1 Local Persistence Engine
`src/services/firebase/config.ts` initializes Firestore with multi-tab offline persistence:
```typescript
firestoreInstance = initializeFirestore(app, {
  localCache: persistentLocalCache({
    tabManager: persistentMultipleTabManager(),
  }),
  ...(forceLongPolling ? { experimentalForceLongPolling: true } : {}),
}, databaseId);
```
- **Multi-Tab Coordination**: `persistentMultipleTabManager()` coordinates IndexedDB locks across tabs, preventing data corruption when multiple browser tabs are open.
- **Fallback Resilience**: Enclosed in a nested `try/catch` block; if persistent storage is rejected (e.g. strict third-party cookie/storage blocking in private browsing or embedded iframes), it falls back to memory cache gracefully.

### 3.2 Cache Miss & Offline Profile Overwrite Guard
According to Rule 3 of `.agents/rules/no-dual-source.md`, an unauthenticated or offline profile fetch must never overwrite an existing user doc with a blank default profile (`isOnboarded: false`).

1. **`src/services/firestore/users.ts` (`createUserProfile`)**:
   ```typescript
   export async function createUserProfile(uid: string, data: Partial<UserProfile>): Promise<UserProfile> {
     const docRef = doc(db, 'users', uid);
     const existing = await getDoc(docRef);
     if (existing.exists()) {
       return { uid: existing.id, ...existing.data() } as UserProfile;
     }
     ...
     await setDoc(docRef, profileData);
     return { uid, ...profileData } as UserProfile;
   }
   ```
   - Before issuing `setDoc`, `createUserProfile` checks `existing.exists()`. If the document already exists in Firestore/cache, it returns the existing document without overwriting.

2. **`src/features/auth/AuthContext.tsx` (`fetchProfile`)**:
   ```typescript
   try {
     p = await container.repos.user.getProfile(firebaseUser.uid);
   } catch (getErr: any) {
     const code = getErr?.code || '';
     const msg = (getErr?.message || '').toLowerCase();
     const isOffline = code === 'unavailable' || msg.includes('offline') || msg.includes('failed to get document because the client is offline');
     if (isOffline) {
       console.warn('[Auth] getProfile offline — keep existing profile, skip create');
       return;
     }
     throw getErr;
   }
   ```
   - If the network is unavailable or offline, the profile fetch returns early and retains the current in-memory profile without creating a reset document.
   - When a document is missing `isOnboarded` (legacy record), `p.isOnboarded = true` is assigned in memory so returning teachers are not forced through the onboarding wizard again.

### 3.3 `getDocFromServer` Usage
- Grep scan confirms `getDocFromServer` is only used in `src/services/firestore/backup.ts:429` as an explicit server connection ping before backup export/import operations (`await getDocFromServer(doc(db, 'users', uid, 'settings', 'school'))`).
- It is not used in standard query paths, ensuring full offline-first functionality for everyday operations.

---

## 4. Firestore Schema & Workspace Model

The codebase strictly follows the schema registry in `src/constants/firestoreCollections.ts`:
```typescript
ROOT_COLLECTIONS = ['users', 'feedbacks', 'sharedReports']
WORKSPACE_SUBCOLLECTIONS = [
  'academicYears', 'classes', 'subjects', 'teachingAssignments',
  'students', 'enrollments', 'meetings', 'attendanceRecords',
  'dailyAttendanceSessions', 'dailyAttendanceRecords', 'assessmentItems',
  'scores', 'studentNotes', 'teacherAttendanceRecords',
  'teacherMonthlyAttendance', 'classSchedules', 'settings',
  'studentCustomFields'
]
```

### 4.1 Schema Entity Map

```
Root Documents
├── users/{userId}
│   ├── academicYears/{academicYearId}
│   ├── classes/{classId}
│   ├── subjects/{subjectId}
│   ├── teachingAssignments/{assignmentId}
│   ├── students/{studentId}
│   ├── enrollments/{enrollmentId}
│   ├── meetings/{meetingId}
│   ├── attendanceRecords/{recordId}
│   ├── dailyAttendanceSessions/{sessionId}
│   ├── dailyAttendanceRecords/{recordId}
│   ├── assessmentItems/{itemId}
│   ├── scores/{scoreId}
│   ├── studentNotes/{noteId}
│   ├── teacherAttendanceRecords/{recordId}
│   ├── teacherMonthlyAttendance/{recordId}
│   ├── classSchedules/{scheduleId}
│   ├── settings/{settingId}
│   └── studentCustomFields/{fieldId}
├── feedbacks/{feedbackId}
└── sharedReports/{reportId}
```

### 4.2 Entity Details & Key Fields

| Path | Key Fields | Invariants / Foreign Keys | Description |
| :--- | :--- | :--- | :--- |
| `users/{userId}` | `displayName`, `email`, `role`, `accountStatus`, `designSystemPreference`, `themePreference` (deprecated), `defaultAcademicYearId`, `defaultSemester`, `isOnboarded`, `createdAt`, `updatedAt` | `role` cannot be updated by client. | User profile and system settings. |
| `users/{uid}/academicYears/{id}` | `label`, `startYear`, `endYear`, `currentSemester`, `isActive`, `isArchived`, `createdAt`, `updatedAt` | Only 1 `isActive` allowed at a time. Read-only if `isArchived`. | Academic year lifecycle definition. |
| `users/{uid}/classes/{id}` | `name`, `gradeLevel`, `major`, `classTeacherId`, `academicYearId`, `isActive`, `isArchived`, `createdAt`, `updatedAt` | `academicYearId` immutable upon creation. | Class section management. |
| `users/{uid}/subjects/{id}` | `code`, `name`, `isActive`, `isArchived`, `archivedAt`, `createdAt`, `updatedAt` | `code` normalized uppercase. | Subject / Course catalog. |
| `users/{uid}/teachingAssignments/{id}` | `academicYearId`, `semester`, `classId`, `subjectId`, `targetHours`, `isActive`, `isArchived` | FK: `academicYearId`, `classId`, `subjectId` (immutable). | Teacher's subject-class binding. |
| `users/{uid}/students/{id}` | `nis`, `nisn`, `fullName`, `gender`, `birthPlace`, `birthDate`, `parentName`, `parentPhone`, `address`, `status`, `searchTokens` | `searchTokens` computed prefix array (min len 2). | Master student records. |
| `users/{uid}/enrollments/{id}` | `academicYearId`, `classId`, `studentId`, `rollNumber`, `status`, `relinkedAt` | FK: `academicYearId`, `classId`, `studentId`. Unique active per AY. | Class roster and placement. |
| `users/{uid}/meetings/{id}` | `teachingAssignmentId`, `classId`, `subjectId`, `academicYearId`, `semester`, `meetingNumber`, `date`, `topic`, `activityDetails`, `attendanceSummary` | Deterministic ID: `{assignmentId}_{semester}_{meetingNumber}`. | Journal of teaching meetings. |
| `users/{uid}/attendanceRecords/{id}` | `studentId`, `meetingId` (nullable), `meetingNumber`, `academicYearId`, `semester`, `classId`, `subjectId`, `teachingAssignmentId`, `date`, `rollNumber`, `status`, `note` | Deterministic ID prevents duplicate records on re-save. | Subject attendance entry. |
| `users/{uid}/dailyAttendanceSessions/{id}` | `classId`, `className`, `academicYearId`, `date`, `summary`, `createdAt` | Composite key: `{classId}_{date}_{academicYearId}`. | Homeroom daily morning roll-call session. |
| `users/{uid}/dailyAttendanceRecords/{id}` | `sessionId`, `studentId`, `studentName`, `rollNumber`, `gender`, `status`, `note`, `classId`, `academicYearId`, `date` | Belongs to `dailyAttendanceSessions`. | Individual homeroom attendance status. |
| `users/{uid}/assessmentItems/{id}` | `academicYearId`, `semester`, `teachingAssignmentId`, `classId`, `subjectId`, `name`, `category`, `weight`, `maxScore`, `isIncludedInFinalScore`, `assessmentDate` | `weight >= 0`, `maxScore` 1-100. Read-only if AY archived. | Gradebook columns / test items. |
| `users/{uid}/scores/{id}` | `assessmentItemId`, `studentId`, `score` (0-100), `note`, `relinkedAt` | FK: `assessmentItemId`, `studentId`. Cascade delete strictly forbidden. | Individual student grades. |
| `users/{uid}/studentNotes/{id}` | `studentId`, `studentName`, `classId`, `academicYearId`, `date`, `category`, `note`, `action` | FK: `studentId`, `classId`, `academicYearId`. | Guidance & counseling student logs. |
| `users/{uid}/teacherAttendanceRecords/{id}` | `academicYearId`, `semester`, `classId`, `date`, `teachingAssignmentId`, `subjectName`, `status` ('HADIR' \| 'SAKIT' \| 'IZIN' \| 'ALPA' \| 'DINAS') | Recorded by homeroom teacher for subject teachers. | Teacher classroom presence tracker. |
| `users/{uid}/teacherMonthlyAttendance/{id}` | `classId`, `academicYearId`, `semester`, `year`, `month`, `records` | Monthly aggregated teacher attendance summary. | Monthly attendance report storage. |
| `users/{uid}/classSchedules/{id}` | `classId`, `academicYearId`, `semester`, `slots`, `updatedBy`, `updatedAt` | Deterministic ID: `{classId}_{academicYearId}_{semester}`. | Class weekly timetable grid. |
| `users/{uid}/settings/{id}` | Key-value settings (`school`, `system`, etc.) | Owner-only read/write. | Teacher/school profile configuration. |
| `users/{uid}/studentCustomFields/{id}` | `name`, `key`, `type`, `options`, `description`, `showInTable`, `isActive` | Initialized automatically with default fields if empty. | Dynamic student custom attributes. |
| `feedbacks/{feedbackId}` | `userId`, `userEmail`, `userName`, `type`, `title`, `description`, `screenshotUrl`, `status`, `adminReply`, `createdAt` | Root collection. Authenticated user can create with own `uid`. | User feedback & bug reporting. |
| `sharedReports/{reportId}` | `id`, `userId`, `reportType`, `reportData`, `isRevoked`, `viewCount`, `lastViewedAt`, `expiresAt`, `createdAt` | Root collection. Token/Passcode access. Viewer can only update view count. | Public read-only sharing link for student reports. |

---

## 5. Firestore Rules Analysis (`firestore.rules` - 358 lines)

`firestore.rules` enforces authorization and document validation:

1. **Super Admin Guard**:
   ```javascript
   function isSuperAdmin() {
     return request.auth != null && (
       request.auth.token.email == 'johanrovian90@gmail.com' ||
       request.auth.token.email == 'fso2cool@gmail.com'
     );
   }
   ```
2. **Privilege Escalation Protection**:
   - In `users/{userId}` update rule: standard users cannot modify their own `role` or `accountStatus`.
   - Super Admin can delete/purge accounts to optimize free quota.
3. **Relational Field Immutability Rules**:
   - `classes`: `academicYearId` is immutable on update.
   - `teachingAssignments`: `academicYearId`, `classId`, and `subjectId` cannot be altered once created.
   - `enrollments`: `academicYearId`, `classId`, and `studentId` cannot be changed on normal update (governed recovery requires `relinkedAt`).
   - `scores`: `assessmentItemId` is immutable; `studentId` cannot change unless `relinkedAt` is supplied; `score` is bounded to `[0, 100]`.
   - `meetings`: `teachingAssignmentId`, `classId`, `subjectId`, `academicYearId`, `meetingNumber`, `semester` cannot be modified on update.
   - `assessmentItems`: `academicYearId`, `semester`, `teachingAssignmentId`, `classId`, `subjectId` are immutable.
4. **Collection Group Queries for Maintenance**:
   - Lines 310-353 define collection group rules: `match /{path=**}/classes/{docId} { allow read: if isSuperAdmin(); }` (across all 14 subcollections).
   - This allows Super Admin functions in `src/services/firestore/users.ts` (`findOrphanResidualData`) to query across subcollections to identify and purge orphaned teacher data without exposing data across users.

---

## 6. Composite Indexes Audit

### 6.1 Indexes Defined in `firestore.indexes.json` (12 Defined)
The current `firestore.indexes.json` contains 12 composite indexes:

| # | Collection Group | Query Scope | Indexed Fields |
| :--- | :--- | :--- | :--- |
| 1 | `meetings` | `COLLECTION` | `teachingAssignmentId` ASC, `semester` ASC, `meetingNumber` ASC |
| 2 | `meetings` | `COLLECTION` | `teachingAssignmentId` ASC, `meetingNumber` ASC |
| 3 | `meetings` | `COLLECTION` | `academicYearId` ASC, `semester` ASC, `meetingNumber` ASC |
| 4 | `meetings` | `COLLECTION` | `academicYearId` ASC, `meetingNumber` ASC |
| 5 | `teacherAttendanceRecords` | `COLLECTION` | `classId` ASC, `academicYearId` ASC, `semester` ASC, `date` ASC |
| 6 | `studentNotes` | `COLLECTION` | `classId` ASC, `academicYearId` ASC, `date` DESC |
| 7 | `students` | `COLLECTION` | `status` ASC, `fullName` ASC |
| 8 | `students` | `COLLECTION` | `status` ASC, `gender` ASC, `fullName` ASC |
| 9 | `students` | `COLLECTION` | `gender` ASC, `fullName` ASC |
| 10 | `teachingAssignments` | `COLLECTION` | `academicYearId` ASC, `semester` ASC, `classId` ASC |
| 11 | `assessmentItems` | `COLLECTION` | `classId` ASC, `subjectId` ASC, `academicYearId` ASC, `semester` ASC |
| 12 | `assessmentItems` | `COLLECTION` | `classId` ASC, `academicYearId` ASC |

---

### 6.2 Missing Composite Indexes Scan & Discovery

Firestore requires a composite index whenever a query combines:
1. `where(fieldA, '==', ...)` with `orderBy(fieldB, ...)`
2. `where(fieldA, '==', ...)` with range comparisons `where(fieldB, '>=', ...)`
3. `where(fieldA, 'array-contains', ...)` with `where(fieldB, '==', ...)`

Through scanning all query definitions in `src/services/firestore/*.ts`, we uncovered **four critical missing index patterns**:

#### Missing Index 1: `classes` (P0)
- **Source**: `src/services/firestore/classes.ts:36`
  ```typescript
  export async function getClasses(uid: string, academicYearId?: string): Promise<ClassItem[]> {
    const colRef = collection(db, 'users', uid, 'classes');
    let q;
    if (academicYearId) {
      q = query(colRef, where('academicYearId', '==', academicYearId), orderBy('name', 'asc'));
    } else {
      q = query(colRef, orderBy('name', 'asc'));
    }
  ```
- **Failure Scenario**: Whenever `getClasses` is called with an `academicYearId` (the most common pattern in the app when switching academic years), Firestore throws `FirebaseError: The query requires an index`.
- **Required Index**:
  - Collection: `classes`
  - Query Scope: `COLLECTION`
  - Fields: `academicYearId` (ASCENDING), `name` (ASCENDING)

#### Missing Index 2: `enrollments` (P0)
- **Source**: `src/services/firestore/enrollments.ts:38-43`
  ```typescript
  export async function getEnrollmentsByClass(
    uid: string, 
    academicYearId: string, 
    classId: string,
    options?: GetEnrollmentsOptions
  ): Promise<Enrollment[]> {
    const colRef = collection(db, 'users', uid, 'enrollments');
    const q = query(
      colRef, 
      where('academicYearId', '==', academicYearId),
      where('classId', '==', classId),
      orderBy('rollNumber', 'asc')
    );
  ```
- **Failure Scenario**: Called via `container.repos.enrollment.getByClass` on virtually every attendance sheet, grading table, and student list view. Lacks try/catch fallback; will crash or produce empty data if the composite index is absent.
- **Required Index**:
  - Collection: `enrollments`
  - Query Scope: `COLLECTION`
  - Fields: `academicYearId` (ASCENDING), `classId` (ASCENDING), `rollNumber` (ASCENDING)

#### Missing Index 3: `dailyAttendanceRecords` Monthly Queries (P1)
- **Source**: `src/services/firestore/homeroomAttendance.ts:80-92`
  ```typescript
  const q = academicYearId
    ? query(
        colRef,
        where('academicYearId', '==', academicYearId),
        where('classId', '==', classId),
        where('date', '>=', startDate),
        where('date', '<=', endDate)
      )
    : query(
        colRef,
        where('classId', '==', classId),
        where('date', '>=', startDate),
        where('date', '<=', endDate)
      );
  ```
- **Failure Scenario**: Monthly homeroom recap queries combine multiple equality filters with date range inequality filters (`>=` and `<=`). Firestore requires composite indexes for this combination.
- **Required Indexes**:
  1. Collection: `dailyAttendanceRecords`, Scope: `COLLECTION`, Fields: `academicYearId` (ASC), `classId` (ASC), `date` (ASC)
  2. Collection: `dailyAttendanceRecords`, Scope: `COLLECTION`, Fields: `classId` (ASC), `date` (ASC)

#### Missing Index 4: `students` Search by Token with Filters (P1)
- **Source**: `src/services/firestore/students.ts:214-219 & 243-248`
  ```typescript
  const q = query(
    colRef,
    where('searchTokens', 'array-contains', primaryToken),
    ...baseConstraints,
    limit(maxResults)
  );
  ```
  Where `baseConstraints` includes `where('status', '==', statusFilter)` and `where('gender', '==', genderFilter)`.
- **Failure Scenario**: When a user selects a filter dropdown in `StudentsMasterPage.tsx` (e.g. status: "ACTIVE" or gender: "L") and searches by name, the query combines `array-contains` with equality filters.
- **Required Indexes**:
  1. Collection: `students`, Scope: `COLLECTION`, Fields: `status` (ASC), `searchTokens` (ARRAY_CONTAINS)
  2. Collection: `students`, Scope: `COLLECTION`, Fields: `gender` (ASC), `searchTokens` (ARRAY_CONTAINS)
  3. Collection: `students`, Scope: `COLLECTION`, Fields: `status` (ASC), `gender` (ASC), `searchTokens` (ARRAY_CONTAINS)

---

## 7. Dual Field Audit: `themePreference` vs `designSystemPreference`

Compliance check against `.agents/rules/no-dual-source.md` (Rule 1 & Rule 2):

### 7.1 Single Source Verification
- `UserProfile` model in `src/types/index.ts`:
  - `designSystemPreference?: DesignSystemKey;` (Primary single source)
  - `themePreference?: ThemeKey;` (Marked as legacy fallback read-only)

### 7.2 Read Resolution Order in `src/context/DesignSystemContext.tsx`
```typescript
// 1. New designSystemPreference from Firestore
if (profile?.designSystemPreference && isValidDesignSystem(profile.designSystemPreference)) {
  setActiveSystem(profile.designSystemPreference);
  return;
}

// 2. Backward compat: map old themePreference to new design system
if (profile?.themePreference) {
  const mappedSystem = mapLegacyThemeToDesignSystem(profile.themePreference);
  setActiveSystem(mappedSystem);
  return;
}
```
Reads follow strict priority: `designSystemPreference` is evaluated first. `themePreference` is only consulted as a fallback for accounts that have not logged in since the migration.

### 7.3 Write Path Verification
```typescript
const applyAndSaveSystem = (system: DesignSystemKey) => {
  setActiveSystem(system);
  if (user) {
    localStorage.setItem(`app_design_system_${user.uid}`, system);
    container.repos.user.updateDesignSystem(user.uid, system);
  }
};
```
- When a user changes the design system in `SettingsPage.tsx`, it calls `applyAndSaveTheme(selectedTheme)` in `ThemeContext`, which immediately delegates to `applyAndSaveSystem` in `DesignSystemContext`.
- Only `container.repos.user.updateDesignSystem` is called.
- `updateUserThemePreference` in `users.ts` is never called by any UI flow.
- Verified: Zero duplicate writes, zero field drift.

---

## 8. Unit Test Regression (`users.test.ts`)

During the audit, test suite execution revealed a regression in `src/services/firestore/users.test.ts`:

```
FAIL src/services/firestore/users.test.ts > Firestore Users Service > createUserProfile > creates standard TEACHER profile for normal email
TypeError: Cannot read properties of undefined (reading 'exists')
 ❯ Module.createUserProfile src/services/firestore/users.ts:31:16
     29| const docRef = doc(db, 'users', uid);
     30| const existing = await getDoc(docRef);
     31| if (existing.exists()) {
```

### Root Cause Analysis:
- In adherence to Rule 3 of `.agents/rules/no-dual-source.md`, `createUserProfile` was hardened with an `exists()` check:
  `const existing = await getDoc(docRef); if (existing.exists()) { return ...; }`
- However, the mock in `users.test.ts` was not updated to configure `mockGetDoc.mockResolvedValueOnce({ exists: () => false })` for the `createUserProfile` tests.
- When `createUserProfile` runs in unit tests, `mockGetDoc` returns `undefined`, triggering `TypeError: Cannot read properties of undefined (reading 'exists')`.
- This is purely a test mocking omission; the production code logic correctly enforces the exists guard.

---

## 9. Defect Log & Action Items (P0 / P1 / P2)

### P0 (Critical - Query Index Failures)
1. **Missing Composite Index: `classes`**
   - Query: `where('academicYearId', '==', ...), orderBy('name', 'asc')` in `src/services/firestore/classes.ts:36`.
   - Action: Add index `classes` (`academicYearId` ASC, `name` ASC) to `firestore.indexes.json` and deploy.
2. **Missing Composite Index: `enrollments`**
   - Query: `where('academicYearId', '==', ...), where('classId', '==', ...), orderBy('rollNumber', 'asc')` in `src/services/firestore/enrollments.ts:38-43`.
   - Action: Add index `enrollments` (`academicYearId` ASC, `classId` ASC, `rollNumber` ASC) to `firestore.indexes.json` and deploy.

### P1 (High - Edge Flow Failures & Test Drift)
1. **Missing Composite Indexes: `dailyAttendanceRecords`**
   - Query: Date range with `classId` and `academicYearId` in `src/services/firestore/homeroomAttendance.ts:80-92`.
   - Action: Add composite indexes for `dailyAttendanceRecords`:
     - `academicYearId` ASC, `classId` ASC, `date` ASC
     - `classId` ASC, `date` ASC
2. **Missing Composite Indexes: `students` Search Tokens**
   - Query: `searchTokens array-contains` combined with `status` and `gender` equality filters in `src/services/firestore/students.ts:214-219 & 243-248`.
   - Action: Add composite indexes for `students`:
     - `status` ASC, `searchTokens` ARRAY_CONTAINS
     - `gender` ASC, `searchTokens` ARRAY_CONTAINS
     - `status` ASC, `gender` ASC, `searchTokens` ARRAY_CONTAINS
3. **Unit Test Mock Drift: `users.test.ts`**
   - Test failure in `createUserProfile` due to missing `mockGetDoc` return value.
   - Action: Update `src/services/firestore/users.test.ts` to mock `mockGetDoc.mockResolvedValue({ exists: () => false })` in `createUserProfile` test cases.

### P2 (Medium - Code Hygiene & Documentation)
1. **Deprecate Unused Repository Method `updateTheme`**
   - `updateTheme` in `userRepository.ts` and `updateUserThemePreference` in `users.ts` are unused.
   - Action: Mark with `@deprecated` docstrings indicating that `updateDesignSystem` is the single source of truth.
2. **Synchronize Package Versions**
   - Keep `package.json` and `package-lock.json` versions in sync after future dependency bumps using `npm install --package-lock-only`.
