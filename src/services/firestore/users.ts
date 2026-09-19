import { 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  deleteDoc,
  collection,
  collectionGroup,
  getDocs,
  writeBatch,
  serverTimestamp 
} from 'firebase/firestore';
import { db } from '../firebase/config';
import { UserProfile } from '../../types';
import { WORKSPACE_SUBCOLLECTIONS } from '../../constants/firestoreCollections';

export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  const docRef = doc(db, 'users', uid);
  const snap = await getDoc(docRef);
  if (snap.exists()) {
    return { uid: snap.id, ...snap.data() } as UserProfile;
  }
  return null;
}

export async function createUserProfile(uid: string, data: Partial<UserProfile>): Promise<UserProfile> {
  const docRef = doc(db, 'users', uid);
  const now = serverTimestamp();
  const isAdminEmail = data.email === 'johanrovian90@gmail.com' || data.email === 'fso2cool@gmail.com';
  
  const profileData: Omit<UserProfile, 'uid'> = {
    displayName: data.displayName || '',
    email: data.email || '',
    nip: data.nip || '',
    nik: data.nik || '',
    phone: data.phone || '',
    photoUrl: data.photoUrl || '',
    role: isAdminEmail ? 'ADMIN' : (data.role || 'TEACHER'),
    accountStatus: data.accountStatus || 'ACTIVE',
    defaultAcademicYearId: data.defaultAcademicYearId || '',
    defaultSemester: data.defaultSemester || 'GANJIL',
    isOnboarded: data.isOnboarded || false,
    createdAt: now,
    updatedAt: now,
  };

  await setDoc(docRef, profileData);
  return { uid, ...profileData } as UserProfile;
}

export async function updateUserProfile(uid: string, data: Partial<UserProfile>): Promise<void> {
  const docRef = doc(db, 'users', uid);
  // Never allow changing role through standard client profile update
  const { role, ...safeData } = data;
  await updateDoc(docRef, {
    ...safeData,
    updatedAt: serverTimestamp(),
  });
}

export async function recordUserLastLogin(uid: string): Promise<void> {
  const docRef = doc(db, 'users', uid);
  try {
    await updateDoc(docRef, {
      lastLoginAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } catch (err) {
    console.warn('Could not record user last login:', err);
  }
}

export async function updateUserThemePreference(uid: string, theme: 'light' | 'dark-crimson'): Promise<void> {
  const docRef = doc(db, 'users', uid);
  try {
    await updateDoc(docRef, {
      themePreference: theme,
      updatedAt: serverTimestamp(),
    });
  } catch (err) {
    console.warn('Could not update user theme preference:', err);
  }
}

// -------------------------------------------------------------
// ADMIN MANAGEMENT & STORAGE QUOTA OPTIMIZATION FUNCTIONS
// -------------------------------------------------------------

export async function getAllUsers(): Promise<UserProfile[]> {
  const colRef = collection(db, 'users');
  const snap = await getDocs(colRef);
  return snap.docs.map(d => ({
    uid: d.id,
    ...(d.data() as any),
  } as UserProfile));
}

export async function setAccountStatus(targetUid: string, status: 'ACTIVE' | 'SUSPENDED' | 'INACTIVE'): Promise<void> {
  const docRef = doc(db, 'users', targetUid);
  await updateDoc(docRef, {
    accountStatus: status,
    updatedAt: serverTimestamp(),
  });
}

export async function setAccountRole(targetUid: string, role: 'ADMIN' | 'TEACHER'): Promise<void> {
  const docRef = doc(db, 'users', targetUid);
  await updateDoc(docRef, {
    role,
    updatedAt: serverTimestamp(),
  });
}

/**
 * Admin update for any user profile data (displayName, nip, nuptk, nik, phone, role, accountStatus, mainSubject, employmentStatus)
 */
export async function adminUpdateUserProfile(
  targetUid: string, 
  data: Partial<Omit<UserProfile, 'uid' | 'createdAt' | 'updatedAt'>>
): Promise<void> {
  const docRef = doc(db, 'users', targetUid);
  await updateDoc(docRef, {
    ...data,
    updatedAt: serverTimestamp(),
  });
}


export interface UserStorageStats {
  classesCount: number;
  subjectsCount: number;
  studentsCount: number;
  assignmentsCount: number;
  meetingsCount: number;
  attendanceCount: number;
  gradesCount: number;
  totalDocuments: number;
}

export async function getUserStorageStats(targetUid: string): Promise<UserStorageStats> {
  let totalDocs = 1; // including the user doc if exists
  let counts: Record<string, number> = {};

  await Promise.all(
    WORKSPACE_SUBCOLLECTIONS.map(async (colName) => {
      try {
        const snap = await getDocs(collection(db, 'users', targetUid, colName));
        counts[colName] = snap.size;
        totalDocs += snap.size;
      } catch (err) {
        counts[colName] = 0;
      }
    })
  );

  return {
    classesCount: counts['classes'] || 0,
    subjectsCount: counts['subjects'] || 0,
    studentsCount: counts['students'] || 0,
    assignmentsCount: counts['teachingAssignments'] || 0,
    meetingsCount: counts['meetings'] || 0,
    attendanceCount: (counts['attendanceRecords'] || 0) + (counts['dailyAttendanceSessions'] || 0) + (counts['dailyAttendanceRecords'] || 0),
    gradesCount: (counts['assessmentItems'] || 0) + (counts['scores'] || 0),
    totalDocuments: totalDocs,
  };
}

/**
 * Permanently purge/cascading delete all user data and subcollections in Firestore
 * using the verified WORKSPACE_SUBCOLLECTIONS list to eliminate residual data.
 */
export async function purgeEntireUserWorkspace(targetUid: string): Promise<number> {
  let deletedCount = 0;

  for (const subcol of WORKSPACE_SUBCOLLECTIONS) {
    try {
      const snap = await getDocs(collection(db, 'users', targetUid, subcol));
      if (!snap.empty) {
        // Delete in safe chunks of max 350 to strictly respect Firestore batch limits
        const chunkSize = 350;
        for (let i = 0; i < snap.docs.length; i += chunkSize) {
          const chunk = snap.docs.slice(i, i + chunkSize);
          const batch = writeBatch(db);
          chunk.forEach((docSnap) => {
            batch.delete(docSnap.ref);
            deletedCount++;
          });
          await batch.commit();
        }
      }
    } catch (err) {
      console.warn(`Error cleaning subcollection ${subcol} for ${targetUid}:`, err);
    }
  }

  // Also purge any legacy named subcollections just in case
  const legacySubcols = ['attendance', 'homeroomAttendance', 'gradeAssessments', 'gradeScores'];
  for (const legacyCol of legacySubcols) {
    try {
      const snap = await getDocs(collection(db, 'users', targetUid, legacyCol));
      if (!snap.empty) {
        const chunkSize = 350;
        for (let i = 0; i < snap.docs.length; i += chunkSize) {
          const chunk = snap.docs.slice(i, i + chunkSize);
          const batch = writeBatch(db);
          chunk.forEach((docSnap) => {
            batch.delete(docSnap.ref);
            deletedCount++;
          });
          await batch.commit();
        }
      }
    } catch (err) {
      // ignore
    }
  }

  // Delete the root user document
  try {
    const userDocRef = doc(db, 'users', targetUid);
    await deleteDoc(userDocRef);
    deletedCount++;
  } catch (err) {
    console.error(`Error deleting user doc for ${targetUid}:`, err);
  }

  return deletedCount;
}

/**
 * Sweep any orphaned residual data left over in Firestore by UID
 * Even if root user document was already deleted earlier.
 */
export async function purgeOrphanedResiduals(targetUid: string): Promise<number> {
  return purgeEntireUserWorkspace(targetUid);
}

export interface OrphanResidualItem {
  uid: string;
  detectedDocCount: number;
  sampleCollections: string[];
}

/**
 * Auto-detect orphan residuals across Firestore workspaces.
 * Finds any UIDs that have documents inside subcollections but no parent document in /users/{uid}.
 */
export async function scanOrphanResiduals(): Promise<OrphanResidualItem[]> {
  // 1. Get all registered active user IDs
  const usersSnap = await getDocs(collection(db, 'users'));
  const activeUserIds = new Set<string>();
  usersSnap.docs.forEach((d) => activeUserIds.add(d.id));

  const orphanMap = new Map<string, { count: number; collections: Set<string> }>();

  // Probe key collections where workspaces store records
  const probeSubcols = [
    'classes', 
    'students', 
    'academicYears', 
    'subjects', 
    'teachingAssignments', 
    'dailyAttendanceSessions',
    'attendanceRecords'
  ];

  for (const colName of probeSubcols) {
    try {
      const snap = await getDocs(collectionGroup(db, colName));
      snap.docs.forEach((docSnap) => {
        const parentUser = docSnap.ref.parent.parent;
        if (parentUser && parentUser.parent && parentUser.parent.id === 'users') {
          const uid = parentUser.id;
          if (!activeUserIds.has(uid)) {
            if (!orphanMap.has(uid)) {
              orphanMap.set(uid, { count: 0, collections: new Set<string>() });
            }
            const item = orphanMap.get(uid)!;
            item.count += 1;
            item.collections.add(colName);
          }
        }
      });
    } catch (err) {
      console.warn(`CollectionGroup probe for ${colName} failed:`, err);
    }
  }

  const result: OrphanResidualItem[] = [];
  orphanMap.forEach((val, uid) => {
    result.push({
      uid,
      detectedDocCount: val.count,
      sampleCollections: Array.from(val.collections),
    });
  });

  return result;
}

