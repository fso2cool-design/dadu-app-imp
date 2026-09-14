import { 
  collection, 
  doc, 
  getDocs, 
  getDoc,
  addDoc, 
  updateDoc, 
  deleteDoc,
  query, 
  where, 
  serverTimestamp 
} from 'firebase/firestore';
import { db } from '../firebase/config';
import { TeachingAssignment, SemesterType } from '../../types';

export interface TeachingAssignmentUsageSummary {
  isUsed: boolean;
  canDelete: boolean;
  reasons: string[];
  counts: {
    meetings: number;
    attendanceRecords: number;
    assessmentItems: number;
    teacherAttendanceRecords: number;
  };
}

export async function checkTeachingAssignmentUsage(
  uid: string, 
  assignmentId: string
): Promise<TeachingAssignmentUsageSummary> {
  const [meetSnap, attSnap, aiSnap, teacherAttSnap] = await Promise.all([
    getDocs(query(collection(db, 'users', uid, 'meetings'), where('teachingAssignmentId', '==', assignmentId))),
    getDocs(query(collection(db, 'users', uid, 'attendanceRecords'), where('teachingAssignmentId', '==', assignmentId))),
    getDocs(query(collection(db, 'users', uid, 'assessmentItems'), where('teachingAssignmentId', '==', assignmentId))),
    getDocs(query(collection(db, 'users', uid, 'teacherAttendanceRecords'), where('teachingAssignmentId', '==', assignmentId))),
  ]);

  const counts = {
    meetings: meetSnap.size,
    attendanceRecords: attSnap.size,
    assessmentItems: aiSnap.size,
    teacherAttendanceRecords: teacherAttSnap.size,
  };

  const reasons: string[] = [];
  if (counts.meetings > 0) {
    reasons.push(`Memiliki ${counts.meetings} rekam jurnal pertemuan tatap muka`);
  }
  if (counts.attendanceRecords > 0) {
    reasons.push(`Memiliki ${counts.attendanceRecords} rekam presensi siswa`);
  }
  if (counts.assessmentItems > 0) {
    reasons.push(`Memiliki ${counts.assessmentItems} format/kolom penilaian siswa`);
  }
  if (counts.teacherAttendanceRecords > 0) {
    reasons.push(`Memiliki ${counts.teacherAttendanceRecords} rekap kehadiran guru mapel di ruang wali kelas`);
  }

  const isUsed = reasons.length > 0;
  return {
    isUsed,
    canDelete: !isUsed,
    reasons,
    counts,
  };
}

export async function getTeachingAssignments(
  uid: string, 
  academicYearId?: string, 
  semester?: SemesterType
): Promise<TeachingAssignment[]> {
  const colRef = collection(db, 'users', uid, 'teachingAssignments');
  let q;
  if (academicYearId && semester) {
    q = query(colRef, where('academicYearId', '==', academicYearId), where('semester', '==', semester));
  } else if (academicYearId) {
    q = query(colRef, where('academicYearId', '==', academicYearId));
  } else {
    q = query(colRef);
  }

  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...(d.data() as any) } as TeachingAssignment));
}

export async function createTeachingAssignment(
  uid: string, 
  data: Omit<TeachingAssignment, 'id' | 'createdAt' | 'updatedAt'>
): Promise<TeachingAssignment> {
  const colRef = collection(db, 'users', uid, 'teachingAssignments');
  const now = serverTimestamp();
  
  const assignmentData = {
    academicYearId: data.academicYearId,
    semester: data.semester,
    classId: data.classId,
    subjectId: data.subjectId,
    teacherId: uid, // Strictly from authenticated user
    isActive: data.isActive ?? true,
    isArchived: false,
    dayOfWeek: data.dayOfWeek || '',
    timeSlot: data.timeSlot || '',
    room: data.room || '',
    className: data.className || '',
    subjectName: data.subjectName || '',
    subjectCode: data.subjectCode || '',
    createdAt: now,
    updatedAt: now,
  };

  const docRef = await addDoc(colRef, assignmentData);
  return { id: docRef.id, ...assignmentData } as TeachingAssignment;
}

export async function updateTeachingAssignment(
  uid: string, 
  id: string, 
  data: Partial<TeachingAssignment>
): Promise<void> {
  const docRef = doc(db, 'users', uid, 'teachingAssignments', id);
  const currentSnap = await getDoc(docRef);
  if (!currentSnap.exists()) {
    throw new Error('Data tugas mengajar tidak ditemukan.');
  }
  const currentData = currentSnap.data() as TeachingAssignment;

  // Check usage before updating identity fields
  const usage = await checkTeachingAssignmentUsage(uid, id);
  if (usage.isUsed) {
    const isTeacherChanged = data.teacherId !== undefined && data.teacherId !== currentData.teacherId;
    const isSubjectChanged = data.subjectId !== undefined && data.subjectId !== currentData.subjectId;
    const isClassChanged = data.classId !== undefined && data.classId !== currentData.classId;
    const isYearChanged = data.academicYearId !== undefined && data.academicYearId !== currentData.academicYearId;
    const isSemesterChanged = data.semester !== undefined && data.semester !== currentData.semester;

    if (isTeacherChanged || isSubjectChanged || isClassChanged || isYearChanged || isSemesterChanged) {
      throw new Error(
        'Field inti penugasan (teacherId, subjectId, classId, academicYearId, semester) bersifat immutable dan tidak dapat diubah karena penugasan telah memiliki riwayat transaksi historis (jurnal tatap muka atau nilai). Hanya jadwal operasional (hari, jam, ruang) yang diizinkan untuk diperbarui.'
      );
    }

    // Strip immutable fields from update payload to guarantee absolute immutability in Firestore
    delete data.teacherId;
    delete data.subjectId;
    delete data.classId;
    delete data.academicYearId;
    delete data.semester;
    delete data.className;
    delete data.subjectName;
    delete data.subjectCode;
  }

  await updateDoc(docRef, {
    ...data,
    teacherId: uid, // Strictly preserve owner identity
    updatedAt: serverTimestamp(),
  });
}

export async function archiveTeachingAssignment(uid: string, id: string): Promise<void> {
  const docRef = doc(db, 'users', uid, 'teachingAssignments', id);
  await updateDoc(docRef, {
    isActive: false,
    isArchived: true,
    archivedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

export async function unarchiveTeachingAssignment(
  uid: string, 
  id: string, 
  activeAcademicYearId?: string
): Promise<void> {
  const docRef = doc(db, 'users', uid, 'teachingAssignments', id);
  const snap = await getDoc(docRef);
  if (!snap.exists()) {
    throw new Error('Data penugasan mengajar tidak ditemukan.');
  }
  const data = snap.data() as TeachingAssignment;

  if (activeAcademicYearId && data.academicYearId !== activeAcademicYearId) {
    throw new Error(
      'Tugas mengajar ini berasal dari tahun ajaran yang berbeda dan tidak dapat diaktifkan kembali. Untuk tahun ajaran baru, silakan buat penugasan mengajar baru.'
    );
  }

  await updateDoc(docRef, {
    isActive: true,
    isArchived: false,
    archivedAt: null,
    updatedAt: serverTimestamp(),
  });
}

export async function canDeleteTeachingAssignment(
  uid: string, 
  assignmentId: string
): Promise<{ canDelete: boolean; reason?: string; details?: TeachingAssignmentUsageSummary }> {
  const usage = await checkTeachingAssignmentUsage(uid, assignmentId);
  if (usage.isUsed) {
    return {
      canDelete: false,
      reason: `Tugas mengajar tidak dapat dihapus: ${usage.reasons.join(', ')}. Arsipkan penugasan alih-alih menghapus data.`,
      details: usage,
    };
  }

  return { canDelete: true, details: usage };
}

export async function deleteTeachingAssignment(
  uid: string,
  id: string
): Promise<void> {
  const check = await canDeleteTeachingAssignment(uid, id);
  if (!check.canDelete) {
    throw new Error(check.reason || 'Tugas mengajar memiliki data terkait dan tidak dapat dihapus.');
  }

  const docRef = doc(db, 'users', uid, 'teachingAssignments', id);
  await deleteDoc(docRef);
}
