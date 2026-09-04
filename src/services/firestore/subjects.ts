import { 
  collection, 
  doc, 
  getDocs, 
  addDoc, 
  updateDoc, 
  deleteDoc,
  query, 
  where,
  orderBy, 
  serverTimestamp 
} from 'firebase/firestore';
import { db } from '../firebase/config';
import { Subject } from '../../types';

export async function getSubjects(uid: string): Promise<Subject[]> {
  const colRef = collection(db, 'users', uid, 'subjects');
  const q = query(colRef, orderBy('name', 'asc'));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...(d.data() as any) } as Subject));
}

export async function createSubject(
  uid: string, 
  data: Omit<Subject, 'id' | 'createdAt' | 'updatedAt'>
): Promise<Subject> {
  const colRef = collection(db, 'users', uid, 'subjects');
  const now = serverTimestamp();
  const subjectData = {
    code: data.code.trim().toUpperCase(),
    name: data.name.trim(),
    isActive: data.isActive ?? true,
    isArchived: false,
    createdAt: now,
    updatedAt: now,
  };
  const docRef = await addDoc(colRef, subjectData);
  return { id: docRef.id, ...subjectData } as Subject;
}

export async function updateSubject(
  uid: string, 
  id: string, 
  data: Partial<Subject>
): Promise<void> {
  const docRef = doc(db, 'users', uid, 'subjects', id);
  await updateDoc(docRef, {
    ...data,
    ...(data.code ? { code: data.code.trim().toUpperCase() } : {}),
    ...(data.name ? { name: data.name.trim() } : {}),
    updatedAt: serverTimestamp(),
  });
}

export async function archiveSubject(uid: string, id: string): Promise<void> {
  const docRef = doc(db, 'users', uid, 'subjects', id);
  await updateDoc(docRef, {
    isActive: false,
    isArchived: true,
    updatedAt: serverTimestamp(),
  });
}

export async function canDeleteSubject(
  uid: string, 
  subjectId: string
): Promise<{ canDelete: boolean; reason?: string }> {
  // Check teaching assignments
  const taSnap = await getDocs(
    query(collection(db, 'users', uid, 'teachingAssignments'), where('subjectId', '==', subjectId))
  );
  if (!taSnap.empty) {
    return {
      canDelete: false,
      reason: `Mata pelajaran terhubung dengan ${taSnap.size} pembagian tugas mengajar. Arsipkan mata pelajaran ini alih-alih menghapus.`
    };
  }

  // Check assessment items
  const aiSnap = await getDocs(
    query(collection(db, 'users', uid, 'assessmentItems'), where('subjectId', '==', subjectId))
  );
  if (!aiSnap.empty) {
    return {
      canDelete: false,
      reason: `Mata pelajaran memiliki ${aiSnap.size} riwayat penilaian. Arsipkan mata pelajaran untuk menjaga integritas nilai.`
    };
  }

  return { canDelete: true };
}

export async function deleteSubject(uid: string, id: string): Promise<void> {
  const check = await canDeleteSubject(uid, id);
  if (!check.canDelete) {
    throw new Error(check.reason || 'Mata pelajaran memiliki data terhubung dan tidak dapat dihapus.');
  }

  const docRef = doc(db, 'users', uid, 'subjects', id);
  await deleteDoc(docRef);
}

