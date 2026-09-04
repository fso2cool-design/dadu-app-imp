import { 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  deleteDoc,
  collection,
  getDocs,
  writeBatch,
  serverTimestamp 
} from 'firebase/firestore';
import { db } from '../firebase/config';
import { UserProfile } from '../../types';

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
  const isAdminEmail = data.email === 'johanrovian90@gmail.com';
  
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

const SUBCOLLECTIONS = [
  'academicYears',
  'classes',
  'subjects',
  'students',
  'enrollments',
  'teachingAssignments',
  'meetings',
  'attendance',
  'homeroomAttendance',
  'gradeAssessments',
  'gradeScores',
  'studentNotes',
  'settings',
];

export async function getUserStorageStats(targetUid: string): Promise<UserStorageStats> {
  let totalDocs = 1; // including the user doc
  let counts: Record<string, number> = {};

  await Promise.all(
    SUBCOLLECTIONS.map(async (colName) => {
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
    attendanceCount: (counts['attendance'] || 0) + (counts['homeroomAttendance'] || 0),
    gradesCount: (counts['gradeAssessments'] || 0) + (counts['gradeScores'] || 0),
    totalDocuments: totalDocs,
  };
}

/**
 * Permanently purge/cascading delete all user data and subcollections in Firestore
 * to immediately reclaim free-tier quota.
 */
export async function purgeEntireUserWorkspace(targetUid: string): Promise<number> {
  let deletedCount = 0;

  for (const subcol of SUBCOLLECTIONS) {
    try {
      const snap = await getDocs(collection(db, 'users', targetUid, subcol));
      if (!snap.empty) {
        // Delete in batches of max 400
        const batch = writeBatch(db);
        snap.docs.forEach((docSnap) => {
          batch.delete(docSnap.ref);
          deletedCount++;
        });
        await batch.commit();
      }
    } catch (err) {
      console.warn(`Error cleaning subcollection ${subcol} for ${targetUid}:`, err);
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

