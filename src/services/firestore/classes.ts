import { 
  collection, 
  doc, 
  getDoc,
  getDocs, 
  addDoc, 
  updateDoc, 
  deleteDoc,
  query, 
  where, 
  orderBy, 
  limit,
  serverTimestamp 
} from 'firebase/firestore';
import { db } from '../firebase/config';
import { ClassItem } from '../../types';

export interface ClassUsageSummary {
  isUsed: boolean;
  canDelete: boolean;
  reasons: string[];
  counts: {
    enrollments: number;
    teachingAssignments: number;
    meetings: number;
    dailyAttendance: number;
    assessmentItems: number;
    studentNotes: number;
  };
}

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

/**
 * Checks all 7 subcollections referencing classId to determine if the class has historical academic dependencies.
 */
export async function checkClassUsage(uid: string, classId: string): Promise<ClassUsageSummary> {
  const [
    enrSnap,
    taSnap,
    meetSnap,
    subjAttSnap,
    attSessSnap,
    attRecSnap,
    assessSnap,
    notesSnap,
  ] = await Promise.all([
    getDocs(query(collection(db, 'users', uid, 'enrollments'), where('classId', '==', classId), limit(1))),
    getDocs(query(collection(db, 'users', uid, 'teachingAssignments'), where('classId', '==', classId), limit(1))),
    getDocs(query(collection(db, 'users', uid, 'meetings'), where('classId', '==', classId), limit(1))),
    getDocs(query(collection(db, 'users', uid, 'attendanceRecords'), where('classId', '==', classId), limit(1))),
    getDocs(query(collection(db, 'users', uid, 'dailyAttendanceSessions'), where('classId', '==', classId), limit(1))),
    getDocs(query(collection(db, 'users', uid, 'dailyAttendanceRecords'), where('classId', '==', classId), limit(1))),
    getDocs(query(collection(db, 'users', uid, 'assessmentItems'), where('classId', '==', classId), limit(1))),
    getDocs(query(collection(db, 'users', uid, 'studentNotes'), where('classId', '==', classId), limit(1))),
  ]);

  const reasons: string[] = [];
  const counts = {
    enrollments: enrSnap.size,
    teachingAssignments: taSnap.size,
    meetings: meetSnap.size,
    subjectAttendance: subjAttSnap.size,
    dailyAttendance: attSessSnap.size + attRecSnap.size,
    assessmentItems: assessSnap.size,
    studentNotes: notesSnap.size,
  };

  if (counts.enrollments > 0) reasons.push('Terdapat data penempatan siswa (enrollment)');
  if (counts.teachingAssignments > 0) reasons.push('Terdapat pembagian tugas mengajar guru');
  if (counts.meetings > 0) reasons.push('Terdapat jurnal/agenda pertemuan mengajar');
  if (counts.subjectAttendance > 0) reasons.push('Terdapat riwayat presensi mata pelajaran');
  if (counts.dailyAttendance > 0) reasons.push('Terdapat riwayat presensi harian');
  if (counts.assessmentItems > 0) reasons.push('Terdapat butir asesmen dan penilaian nilai siswa');
  if (counts.studentNotes > 0) reasons.push('Terdapat catatan pembinaan siswa');

  const isUsed = reasons.length > 0;
  return {
    isUsed,
    canDelete: !isUsed,
    reasons,
    counts,
  };
}

export async function canDeleteClass(
  uid: string, 
  classId: string
): Promise<{ canDelete: boolean; reason?: string }> {
  const usage = await checkClassUsage(uid, classId);
  if (!usage.canDelete) {
    return {
      canDelete: false,
      reason: `Kelas ini tidak dapat dihapus karena sudah memiliki data transaksi historis: ${usage.reasons.join(', ')}. Silakan gunakan fitur Arsipkan Kelas.`,
    };
  }
  return { canDelete: true };
}

/**
 * Updates a class with governance enforcement:
 * - If class has historical data (isUsed), locking identity fields (name, gradeLevel, major, academicYearId)
 * - Only metadata (classTeacherId, isActive, isArchived) can be updated on used classes.
 */
export async function updateClass(
  uid: string, 
  id: string, 
  data: Partial<ClassItem>
): Promise<void> {
  const docRef = doc(db, 'users', uid, 'classes', id);
  const snap = await getDoc(docRef);
  if (!snap.exists()) {
    throw new Error('Data kelas tidak ditemukan');
  }

  const current = snap.data() as ClassItem;
  const usage = await checkClassUsage(uid, id);

  if (usage.isUsed) {
    // Check if identity fields are being mutated
    if (data.name !== undefined && data.name.trim() !== current.name) {
      throw new Error(`Nama kelas "${current.name}" tidak dapat diubah karena kelas sudah memiliki transaksi data akademik. Buat kelas baru untuk identitas berbeda.`);
    }
    if (data.gradeLevel !== undefined && data.gradeLevel.trim() !== current.gradeLevel) {
      throw new Error(`Tingkat kelas tidak dapat diubah karena kelas sudah memiliki data akademik historis.`);
    }
    if (data.major !== undefined && data.major.trim() !== (current.major || '')) {
      throw new Error(`Peminatan/jurusan kelas tidak dapat diubah karena kelas sudah memiliki data akademik historis.`);
    }
    if (data.academicYearId !== undefined && data.academicYearId !== current.academicYearId) {
      throw new Error(`Tahun ajaran kelas tidak dapat diubah karena terikat pada data historis.`);
    }

    // Only allow updating safe metadata fields
    const safePayload: Record<string, any> = {
      updatedAt: serverTimestamp(),
    };
    if (data.classTeacherId !== undefined) safePayload.classTeacherId = data.classTeacherId;
    if (data.isActive !== undefined) safePayload.isActive = data.isActive;
    if (data.isArchived !== undefined) safePayload.isArchived = data.isArchived;

    await updateDoc(docRef, safePayload);
    return;
  }

  // If not used, full edit is permissible
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

export async function unarchiveClass(uid: string, id: string, activeAcademicYearId?: string): Promise<void> {
  const docRef = doc(db, 'users', uid, 'classes', id);
  const snap = await getDoc(docRef);
  if (!snap.exists()) {
    throw new Error('Data kelas tidak ditemukan.');
  }

  const classData = snap.data();
  // Validasi tata kelola unarchive: Kelas hanya boleh diaktifkan kembali jika berasal dari tahun ajaran aktif
  if (activeAcademicYearId && classData.academicYearId && classData.academicYearId !== activeAcademicYearId) {
    throw new Error(
      'Kelas ini berasal dari tahun ajaran yang berbeda dan tidak dapat diaktifkan kembali. Untuk tahun ajaran baru, silakan buat Kelas/Rombel baru.'
    );
  }

  await updateDoc(docRef, {
    isActive: true,
    isArchived: false,
    updatedAt: serverTimestamp(),
  });
}

export async function deleteClass(uid: string, id: string): Promise<void> {
  const check = await canDeleteClass(uid, id);
  if (!check.canDelete) {
    throw new Error(check.reason || 'Kelas memiliki riwayat akademik dan tidak dapat dihapus. Silakan arsipkan kelas.');
  }

  const docRef = doc(db, 'users', uid, 'classes', id);
  await deleteDoc(docRef);
}

