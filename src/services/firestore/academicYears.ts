import { 
  collection, 
  doc, 
  getDocs, 
  getDoc,
  setDoc, 
  addDoc, 
  updateDoc, 
  deleteDoc,
  query, 
  where, 
  orderBy, 
  serverTimestamp, 
  writeBatch
} from 'firebase/firestore';
import { db } from '../firebase/config';
import { AcademicYear } from '../../types';

export async function getAcademicYears(uid: string): Promise<AcademicYear[]> {
  const colRef = collection(db, 'users', uid, 'academicYears');
  const q = query(colRef, orderBy('startYear', 'desc'));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...(d.data() as any) } as AcademicYear));
}

export async function getActiveAcademicYear(uid: string): Promise<AcademicYear | null> {
  const colRef = collection(db, 'users', uid, 'academicYears');
  const q = query(colRef, where('isActive', '==', true));
  const snap = await getDocs(q);
  if (!snap.empty) {
    const d = snap.docs[0];
    return { id: d.id, ...(d.data() as any) } as AcademicYear;
  }
  return null;
}

export async function createAcademicYear(
  uid: string, 
  data: Omit<AcademicYear, 'id' | 'createdAt' | 'updatedAt'>
): Promise<AcademicYear> {
  const colRef = collection(db, 'users', uid, 'academicYears');
  const batch = writeBatch(db);

  // If this new year is set to active, deactivate all other years first
  if (data.isActive) {
    const currentYears = await getAcademicYears(uid);
    for (const year of currentYears) {
      if (year.isActive) {
        const yearRef = doc(db, 'users', uid, 'academicYears', year.id);
        batch.update(yearRef, { isActive: false, updatedAt: serverTimestamp() });
      }
    }
  }

  const newDocRef = doc(colRef);
  const now = serverTimestamp();
  const yearData = {
    label: data.label,
    startYear: Number(data.startYear),
    endYear: Number(data.endYear),
    currentSemester: data.currentSemester || 'GANJIL',
    isActive: data.isActive ?? true,
    createdAt: now,
    updatedAt: now,
  };

  batch.set(newDocRef, yearData);
  await batch.commit();

  return { id: newDocRef.id, ...yearData } as AcademicYear;
}

export async function updateAcademicYear(
  uid: string, 
  id: string, 
  data: Partial<AcademicYear>
): Promise<void> {
  const batch = writeBatch(db);
  
  if (data.isActive === true) {
    const currentYears = await getAcademicYears(uid);
    for (const year of currentYears) {
      if (year.id !== id && year.isActive) {
        const otherRef = doc(db, 'users', uid, 'academicYears', year.id);
        batch.update(otherRef, { isActive: false, updatedAt: serverTimestamp() });
      }
    }
  }

  const docRef = doc(db, 'users', uid, 'academicYears', id);
  batch.update(docRef, {
    ...data,
    updatedAt: serverTimestamp(),
  });

  await batch.commit();
}

export async function canDeleteAcademicYear(
  uid: string, 
  yearId: string
): Promise<{ canDelete: boolean; reason?: string }> {
  // Check enrollments
  const enrSnap = await getDocs(
    query(collection(db, 'users', uid, 'enrollments'), where('academicYearId', '==', yearId))
  );
  if (!enrSnap.empty) {
    return {
      canDelete: false,
      reason: `Tahun pelajaran ini memiliki ${enrSnap.size} data penempatan siswa. Arsipkan tahun pelajaran alih-alih menghapus.`
    };
  }

  // Check teaching assignments
  const taSnap = await getDocs(
    query(collection(db, 'users', uid, 'teachingAssignments'), where('academicYearId', '==', yearId))
  );
  if (!taSnap.empty) {
    return {
      canDelete: false,
      reason: `Tahun pelajaran terhubung dengan ${taSnap.size} pembagian tugas mengajar.`
    };
  }

  // Check meetings
  const meetSnap = await getDocs(
    query(collection(db, 'users', uid, 'meetings'), where('academicYearId', '==', yearId))
  );
  if (!meetSnap.empty) {
    return {
      canDelete: false,
      reason: `Tahun pelajaran memiliki riwayat jurnal tatap muka.`
    };
  }

  return { canDelete: true };
}

export async function deleteAcademicYear(uid: string, id: string): Promise<void> {
  const check = await canDeleteAcademicYear(uid, id);
  if (!check.canDelete) {
    throw new Error(check.reason || 'Tahun pelajaran memiliki riwayat akademik dan tidak dapat dihapus.');
  }

  const docRef = doc(db, 'users', uid, 'academicYears', id);
  await deleteDoc(docRef);
}

