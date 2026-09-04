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
import { ClassItem } from '../../types';

export async function getClasses(uid: string, academicYearId?: string): Promise<ClassItem[]> {
  const colRef = collection(db, 'users', uid, 'classes');
  let q;
  if (academicYearId) {
    q = query(colRef, where('academicYearId', '==', academicYearId), orderBy('name', 'asc'));
  } else {
    q = query(colRef, orderBy('name', 'asc'));
  }
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...(d.data() as any) } as ClassItem));
}

export async function createClass(
  uid: string, 
  data: Omit<ClassItem, 'id' | 'createdAt' | 'updatedAt'>
): Promise<ClassItem> {
  const colRef = collection(db, 'users', uid, 'classes');
  const now = serverTimestamp();
  const classData = {
    academicYearId: data.academicYearId,
    name: data.name.trim(),
    gradeLevel: data.gradeLevel.trim(),
    major: data.major?.trim() || '',
    classTeacherId: data.classTeacherId || '',
    isActive: data.isActive ?? true,
    isArchived: false,
    createdAt: now,
    updatedAt: now,
  };
  const docRef = await addDoc(colRef, classData);
  return { id: docRef.id, ...classData } as ClassItem;
}

export async function updateClass(
  uid: string, 
  id: string, 
  data: Partial<ClassItem>
): Promise<void> {
  const docRef = doc(db, 'users', uid, 'classes', id);
  await updateDoc(docRef, {
    ...data,
    updatedAt: serverTimestamp(),
  });
}

export async function archiveClass(uid: string, id: string): Promise<void> {
  const docRef = doc(db, 'users', uid, 'classes', id);
  await updateDoc(docRef, {
    isActive: false,
    isArchived: true,
    updatedAt: serverTimestamp(),
  });
}

export async function canDeleteClass(
  uid: string, 
  classId: string
): Promise<{ canDelete: boolean; reason?: string }> {
  // Check enrollments
  const enrSnap = await getDocs(
    query(collection(db, 'users', uid, 'enrollments'), where('classId', '==', classId))
  );
  if (!enrSnap.empty) {
    return { 
      canDelete: false, 
      reason: `Kelas ini memiliki ${enrSnap.size} data penempatan siswa. Arsipkan kelas alih-alih menghapus.` 
    };
  }

  // Check teaching assignments
  const taSnap = await getDocs(
    query(collection(db, 'users', uid, 'teachingAssignments'), where('classId', '==', classId))
  );
  if (!taSnap.empty) {
    return { 
      canDelete: false, 
      reason: `Kelas ini terhubung dengan ${taSnap.size} pembagian tugas mengajar. Hapus atau pindahkan tugas mengajar terlebih dahulu.` 
    };
  }

  // Check daily attendance sessions
  const attSnap = await getDocs(
    query(collection(db, 'users', uid, 'dailyAttendanceSessions'), where('classId', '==', classId))
  );
  if (!attSnap.empty) {
    return { 
      canDelete: false, 
      reason: `Kelas ini memiliki riwayat presensi harian. Arsipkan kelas untuk melindungi rekam jejak kehadiran.` 
    };
  }

  return { canDelete: true };
}

export async function deleteClass(uid: string, id: string): Promise<void> {
  const check = await canDeleteClass(uid, id);
  if (!check.canDelete) {
    throw new Error(check.reason || 'Kelas memiliki riwayat akademik dan tidak dapat dihapus. Silakan arsipkan kelas.');
  }

  const docRef = doc(db, 'users', uid, 'classes', id);
  await deleteDoc(docRef);
}
