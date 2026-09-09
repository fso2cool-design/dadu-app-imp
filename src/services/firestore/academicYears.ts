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

export interface AcademicYearUsageSummary {
  isUsed: boolean;
  canDelete: boolean;
  reasons: string[];
  counts: {
    classes: number;
    enrollments: number;
    teachingAssignments: number;
    meetings: number;
    dailyAttendanceSessions: number;
    dailyAttendanceRecords: number;
    assessmentItems: number;
    studentNotes: number;
    teacherAttendanceRecords: number;
  };
}

export async function checkAcademicYearUsage(
  uid: string, 
  yearId: string
): Promise<AcademicYearUsageSummary> {
  const [
    classSnap,
    enrSnap,
    taSnap,
    meetSnap,
    dailySessSnap,
    dailyAttSnap,
    aiSnap,
    notesSnap,
    teacherAttSnap
  ] = await Promise.all([
    getDocs(query(collection(db, 'users', uid, 'classes'), where('academicYearId', '==', yearId))),
    getDocs(query(collection(db, 'users', uid, 'enrollments'), where('academicYearId', '==', yearId))),
    getDocs(query(collection(db, 'users', uid, 'teachingAssignments'), where('academicYearId', '==', yearId))),
    getDocs(query(collection(db, 'users', uid, 'meetings'), where('academicYearId', '==', yearId))),
    getDocs(query(collection(db, 'users', uid, 'dailyAttendanceSessions'), where('academicYearId', '==', yearId))),
    getDocs(query(collection(db, 'users', uid, 'dailyAttendanceRecords'), where('academicYearId', '==', yearId))),
    getDocs(query(collection(db, 'users', uid, 'assessmentItems'), where('academicYearId', '==', yearId))),
    getDocs(query(collection(db, 'users', uid, 'studentNotes'), where('academicYearId', '==', yearId))),
    getDocs(query(collection(db, 'users', uid, 'teacherAttendanceRecords'), where('academicYearId', '==', yearId))),
  ]);

  const counts = {
    classes: classSnap.size,
    enrollments: enrSnap.size,
    teachingAssignments: taSnap.size,
    meetings: meetSnap.size,
    dailyAttendanceSessions: dailySessSnap.size,
    dailyAttendanceRecords: dailyAttSnap.size,
    assessmentItems: aiSnap.size,
    studentNotes: notesSnap.size,
    teacherAttendanceRecords: teacherAttSnap.size,
  };

  const reasons: string[] = [];
  if (counts.classes > 0) reasons.push(`${counts.classes} rombongan belajar/kelas`);
  if (counts.enrollments > 0) reasons.push(`${counts.enrollments} data penempatan siswa`);
  if (counts.teachingAssignments > 0) reasons.push(`${counts.teachingAssignments} tugas mengajar`);
  if (counts.meetings > 0) reasons.push(`${counts.meetings} jurnal pertemuan tatap muka`);
  if (counts.dailyAttendanceSessions > 0 || counts.dailyAttendanceRecords > 0) {
    reasons.push(`${counts.dailyAttendanceSessions + counts.dailyAttendanceRecords} rekam presensi harian`);
  }
  if (counts.assessmentItems > 0) reasons.push(`${counts.assessmentItems} format asesmen/nilai`);
  if (counts.studentNotes > 0) reasons.push(`${counts.studentNotes} catatan pembinaan siswa`);
  if (counts.teacherAttendanceRecords > 0) reasons.push(`${counts.teacherAttendanceRecords} rekap kehadiran guru mapel di ruang wali kelas`);

  const isUsed = reasons.length > 0;
  return {
    isUsed,
    canDelete: !isUsed,
    reasons,
    counts,
  };
}

export async function updateAcademicYear(
  uid: string, 
  id: string, 
  data: Partial<AcademicYear>
): Promise<void> {
  const docRef = doc(db, 'users', uid, 'academicYears', id);
  const currentSnap = await getDoc(docRef);
  if (!currentSnap.exists()) {
    throw new Error('Data tahun ajaran tidak ditemukan.');
  }
  const currentData = currentSnap.data() as AcademicYear;

  // Check usage before updating identity fields
  const usage = await checkAcademicYearUsage(uid, id);
  if (usage.isUsed) {
    const isLabelChanged = data.label !== undefined && data.label.trim() !== currentData.label;
    const isStartYearChanged = data.startYear !== undefined && Number(data.startYear) !== Number(currentData.startYear);
    const isEndYearChanged = data.endYear !== undefined && Number(data.endYear) !== Number(currentData.endYear);

    if (isLabelChanged || isStartYearChanged || isEndYearChanged) {
      throw new Error(
        `Identitas tahun ajaran (${currentData.label}) tidak dapat diubah karena telah memiliki data transaksi historis (${usage.reasons.join(', ')}). Hanya semester aktif dan status arsip yang dapat diperbarui demi integritas rapor dan leger.`
      );
    }
  }

  const batch = writeBatch(db);
  
  if (data.isActive === true) {
    const currentYears = await getAcademicYears(uid);
    for (const year of currentYears) {
      if (year.id !== id && year.isActive) {
        const otherRef = doc(db, 'users', uid, 'academicYears', year.id);
        batch.update(otherRef, { isActive: false, updatedAt: serverTimestamp() });
      }
    }
    // Activating also removes archived status
    data.isArchived = false;
    data.archivedAt = null;
  }

  batch.update(docRef, {
    ...data,
    updatedAt: serverTimestamp(),
  });

  await batch.commit();
}

export async function archiveAcademicYear(uid: string, id: string): Promise<void> {
  const docRef = doc(db, 'users', uid, 'academicYears', id);
  const currentSnap = await getDoc(docRef);
  if (!currentSnap.exists()) {
    throw new Error('Data tahun ajaran tidak ditemukan.');
  }
  const currentData = currentSnap.data() as AcademicYear;

  if (currentData.isActive) {
    throw new Error('Tahun ajaran yang sedang aktif tidak dapat diarsipkan. Aktifkan tahun ajaran lain terlebih dahulu sebelum mengarsipkan tahun ajaran ini.');
  }

  await updateDoc(docRef, {
    isArchived: true,
    isActive: false,
    archivedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

export async function unarchiveAcademicYear(uid: string, id: string): Promise<void> {
  const docRef = doc(db, 'users', uid, 'academicYears', id);
  await updateDoc(docRef, {
    isArchived: false,
    archivedAt: null,
    updatedAt: serverTimestamp(),
  });
}

export async function canDeleteAcademicYear(
  uid: string, 
  yearId: string
): Promise<{ canDelete: boolean; reason?: string; details?: AcademicYearUsageSummary }> {
  const docRef = doc(db, 'users', uid, 'academicYears', yearId);
  const snap = await getDoc(docRef);
  if (!snap.exists()) return { canDelete: true };
  const current = snap.data() as AcademicYear;

  if (current.isActive) {
    return {
      canDelete: false,
      reason: 'Tahun ajaran yang sedang aktif tidak dapat dihapus. Aktifkan tahun ajaran lain terlebih dahulu jika ingin menghapus atau mengarsipkan.'
    };
  }

  const usage = await checkAcademicYearUsage(uid, yearId);
  if (usage.isUsed) {
    return {
      canDelete: false,
      reason: `Tahun ajaran memiliki riwayat transaksi historis: ${usage.reasons.join(', ')}. Arsipkan tahun ajaran alih-alih menghapus data.`,
      details: usage,
    };
  }

  return { canDelete: true, details: usage };
}

export async function deleteAcademicYear(uid: string, id: string): Promise<void> {
  const check = await canDeleteAcademicYear(uid, id);
  if (!check.canDelete) {
    throw new Error(check.reason || 'Tahun ajaran memiliki riwayat akademik dan tidak dapat dihapus.');
  }

  const docRef = doc(db, 'users', uid, 'academicYears', id);
  await deleteDoc(docRef);
}

