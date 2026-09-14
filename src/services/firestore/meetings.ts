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
  orderBy, 
  serverTimestamp,
  writeBatch,
  runTransaction
} from 'firebase/firestore';
import { db } from '../firebase/config';
import { Meeting, SemesterType, AttendanceSummary } from '../../types';
import { getTodayISO } from '../../utils/date';
import { trackSync } from '../../utils/syncEvents';

export interface MeetingFilterOptions {
  academicYearId?: string;
  semester?: SemesterType;
  teachingAssignmentId?: string;
  classId?: string;
}

export async function getMeetings(
  uid: string, 
  options?: MeetingFilterOptions
): Promise<Meeting[]> {
  const colRef = collection(db, 'users', uid, 'meetings');
  let q = query(colRef, orderBy('meetingNumber', 'asc'));

  try {
    if (options?.teachingAssignmentId && options?.semester) {
      q = query(
        colRef, 
        where('teachingAssignmentId', '==', options.teachingAssignmentId),
        where('semester', '==', options.semester),
        orderBy('meetingNumber', 'asc')
      );
    } else if (options?.teachingAssignmentId) {
      q = query(colRef, where('teachingAssignmentId', '==', options.teachingAssignmentId), orderBy('meetingNumber', 'asc'));
    } else if (options?.academicYearId && options?.semester) {
      q = query(
        colRef, 
        where('academicYearId', '==', options.academicYearId),
        where('semester', '==', options.semester),
        orderBy('meetingNumber', 'asc')
      );
    } else if (options?.academicYearId) {
      q = query(colRef, where('academicYearId', '==', options.academicYearId), orderBy('meetingNumber', 'asc'));
    }

    const snap = await getDocs(q);
    let results = snap.docs.map(d => ({ id: d.id, ...(d.data() as any) } as Meeting));

    if (options?.classId) {
      results = results.filter(m => m.classId === options.classId);
    }

    return results;
  } catch (err) {
    // Fallback: in case composite index is still building, query by teachingAssignmentId and sort in-memory
    console.warn('Index query notice, falling back to base filter:', err);
    let fallbackQuery = query(colRef);
    if (options?.teachingAssignmentId) {
      fallbackQuery = query(colRef, where('teachingAssignmentId', '==', options.teachingAssignmentId));
    } else if (options?.academicYearId) {
      fallbackQuery = query(colRef, where('academicYearId', '==', options.academicYearId));
    }
    const snap = await getDocs(fallbackQuery);
    let results = snap.docs.map(d => ({ id: d.id, ...(d.data() as any) } as Meeting));
    
    if (options?.semester) {
      results = results.filter(m => m.semester === options.semester);
    }
    if (options?.classId) {
      results = results.filter(m => m.classId === options.classId);
    }
    return results.sort((a, b) => (a.meetingNumber || 0) - (b.meetingNumber || 0));
  }
}

export async function getMeetingById(uid: string, meetingId: string): Promise<Meeting | null> {
  const docRef = doc(db, 'users', uid, 'meetings', meetingId);
  const snap = await getDoc(docRef);
  if (!snap.exists()) return null;
  return { id: snap.id, ...(snap.data() as any) } as Meeting;
}

export async function createMeeting(
  uid: string, 
  data: Omit<Meeting, 'id' | 'createdAt' | 'updatedAt'>
): Promise<Meeting> {
  // 1. Validate semantic relationship integrity
  if (!data.teachingAssignmentId || !data.classId || !data.subjectId || !data.academicYearId || !data.semester) {
    throw new Error('Relasi akademik tidak lengkap: ID Tugas Mengajar, Kelas, Mapel, Tahun Ajaran, dan Semester wajib diisi.');
  }

  // 2. Active Academic Year & Entity Governance
  const ayDoc = await getDoc(doc(db, 'users', uid, 'academicYears', data.academicYearId));
  if (!ayDoc.exists()) {
    throw new Error('Tahun ajaran tidak ditemukan.');
  }
  const ayData = ayDoc.data();
  if (ayData?.isArchived || ayData?.isActive === false) {
    throw new Error('Tidak dapat membuat jurnal pertemuan pada Tahun Ajaran yang tidak aktif atau telah diarsipkan.');
  }

  const taDoc = await getDoc(doc(db, 'users', uid, 'teachingAssignments', data.teachingAssignmentId));
  if (!taDoc.exists()) {
    throw new Error('Penugasan mengajar tidak ditemukan.');
  }
  if (taDoc.data()?.isArchived) {
    throw new Error('Penugasan mengajar ini telah diarsipkan dan tidak dapat menerima pertemuan KBM baru.');
  }

  const classDoc = await getDoc(doc(db, 'users', uid, 'classes', data.classId));
  if (!classDoc.exists()) {
    throw new Error('Kelas tidak ditemukan.');
  }
  if (classDoc.data()?.isArchived) {
    throw new Error('Kelas telah diarsipkan.');
  }

  const colRef = collection(db, 'users', uid, 'meetings');
  const meetingNumber = Number(data.meetingNumber) || 1;

  // 3. Deterministic business key guarantees zero concurrency collisions
  // Key structure: {teachingAssignmentId}_{semester}_{meetingNumber}
  const meetingKey = `${data.teachingAssignmentId}_${data.semester}_${meetingNumber}`;
  const meetingDocRef = doc(colRef, meetingKey);

  // 4. Check for duplicate legacy meetings created with random IDs (backward compatibility)
  const duplicateQ = query(
    colRef,
    where('teachingAssignmentId', '==', data.teachingAssignmentId),
    where('semester', '==', data.semester),
    where('meetingNumber', '==', meetingNumber)
  );
  const dupSnap = await getDocs(duplicateQ);
  if (!dupSnap.empty && dupSnap.docs.some(d => d.id !== meetingKey)) {
    throw new Error(`Pertemuan ke-${meetingNumber} untuk kelas dan mata pelajaran ini pada ${data.semester} sudah ada dalam jurnal.`);
  }

  const now = serverTimestamp();
  
  const meetingData = {
    academicYearId: data.academicYearId,
    semester: data.semester,
    teachingAssignmentId: data.teachingAssignmentId,
    classId: data.classId,
    subjectId: data.subjectId,
    date: data.date || getTodayISO(),
    timeSlot: data.timeSlot?.trim() || '',
    meetingNumber,
    topic: data.topic.trim(),
    learningObjectives: data.learningObjectives?.trim() || '',
    activities: data.activities?.trim() || '',
    method: data.method?.trim() || '',
    notes: data.notes?.trim() || '',
    status: data.status || 'COMPLETED',
    className: data.className || '',
    subjectName: data.subjectName || '',
    subjectCode: data.subjectCode || '',
    attendanceSummary: data.attendanceSummary || null,
    createdAt: now,
    updatedAt: now,
  };

  // 5. Run atomic transaction on deterministic document ID
  await runTransaction(db, async (transaction) => {
    const existingDoc = await transaction.get(meetingDocRef);
    if (existingDoc.exists()) {
      throw new Error(`Pertemuan ke-${meetingNumber} untuk kelas dan mata pelajaran ini pada ${data.semester} sudah ada dalam jurnal.`);
    }
    transaction.set(meetingDocRef, meetingData);
  });

  return { id: meetingDocRef.id, ...meetingData } as Meeting;
}

export async function updateMeeting(
  uid: string, 
  id: string, 
  data: Partial<Meeting>
): Promise<void> {
  const docRef = doc(db, 'users', uid, 'meetings', id);
  const snap = await getDoc(docRef);
  if (!snap.exists()) {
    throw new Error('Jurnal pertemuan tidak ditemukan.');
  }
  const existingData = snap.data() as Meeting;

  // 1. Check if academic year is archived (Historical Read-Only Protection)
  if (existingData.academicYearId) {
    const ayDoc = await getDoc(doc(db, 'users', uid, 'academicYears', existingData.academicYearId));
    if (ayDoc.exists() && ayDoc.data()?.isArchived) {
      throw new Error('Jurnal pertemuan ini berada pada Tahun Ajaran yang telah diarsipkan dan bersifat historis (read-only).');
    }
  }

  // 2. Strict Edit Governance:
  // Fields that are strictly IMMUTABLE on update:
  // - academicYearId, semester, teachingAssignmentId, classId, subjectId, meetingNumber
  // Any attempt to modify these is stripped to protect linked attendance records and deterministic keys.
  const {
    academicYearId,
    semester,
    teachingAssignmentId,
    classId,
    subjectId,
    meetingNumber,
    ...safeEditableData
  } = data;

  return trackSync((async () => {
    await updateDoc(docRef, {
      ...safeEditableData,
      updatedAt: serverTimestamp(),
    });
  })(), {
    startMessage: 'Memperbarui jurnal pertemuan...',
    successMessage: 'Jurnal pertemuan tersimpan!'
  });
}

export interface CanDeleteMeetingResult {
  canDelete: boolean;
  reason?: string;
  hasAttendance: boolean;
  attendanceCount: number;
}

export async function canDeleteMeeting(
  uid: string, 
  id: string
): Promise<CanDeleteMeetingResult> {
  const docRef = doc(db, 'users', uid, 'meetings', id);
  const snap = await getDoc(docRef);
  if (!snap.exists()) {
    return { canDelete: false, reason: 'Pertemuan tidak ditemukan.', hasAttendance: false, attendanceCount: 0 };
  }
  const meetingData = snap.data() as Meeting;

  // Check if historical/archived
  if (meetingData.academicYearId) {
    const ayDoc = await getDoc(doc(db, 'users', uid, 'academicYears', meetingData.academicYearId));
    if (ayDoc.exists() && ayDoc.data()?.isArchived) {
      return { 
        canDelete: false, 
        reason: 'Jurnal pertemuan berada pada Tahun Ajaran yang telah diarsipkan (arsip historis dilindungi).',
        hasAttendance: false,
        attendanceCount: 0 
      };
    }
  }

  // Count attendance records
  const attColRef = collection(db, 'users', uid, 'attendanceRecords');
  const attQ = query(attColRef, where('meetingId', '==', id));
  const attSnap = await getDocs(attQ);
  const attendanceCount = attSnap.docs.length;

  return {
    canDelete: true,
    hasAttendance: attendanceCount > 0,
    attendanceCount
  };
}

export async function deleteMeeting(uid: string, id: string): Promise<void> {
  const docRef = doc(db, 'users', uid, 'meetings', id);
  const snap = await getDoc(docRef);
  if (!snap.exists()) {
    return; // Already deleted
  }
  const meetingData = snap.data() as Meeting;

  // Historical protection
  if (meetingData.academicYearId) {
    const ayDoc = await getDoc(doc(db, 'users', uid, 'academicYears', meetingData.academicYearId));
    if (ayDoc.exists() && ayDoc.data()?.isArchived) {
      throw new Error('Tidak dapat menghapus jurnal pertemuan pada Tahun Ajaran yang telah diarsipkan.');
    }
  }

  return trackSync((async () => {
    // Unlink associated attendance records instead of deleting them to preserve student attendance history
    const attColRef = collection(db, 'users', uid, 'attendanceRecords');
    const attQ = query(attColRef, where('meetingId', '==', id));
    const attSnap = await getDocs(attQ);

    const chunkSize = 400;
    const now = serverTimestamp();
    for (let i = 0; i < attSnap.docs.length; i += chunkSize) {
      const chunk = attSnap.docs.slice(i, i + chunkSize);
      const batch = writeBatch(db);
      chunk.forEach(d => {
        batch.update(d.ref, {
          meetingId: null,
          meetingNumber: null,
          updatedAt: now,
        });
      });
      await batch.commit();
    }

    // Delete meeting document
    await deleteDoc(docRef);
  })(), {
    startMessage: 'Menghapus jurnal pertemuan...',
    successMessage: 'Jurnal pertemuan dihapus (data presensi siswa tetap aman)!'
  });
}

export async function updateMeetingAttendanceSummary(
  uid: string,
  meetingId: string,
  summary: AttendanceSummary
): Promise<void> {
  const docRef = doc(db, 'users', uid, 'meetings', meetingId);
  await updateDoc(docRef, {
    attendanceSummary: summary,
    status: 'COMPLETED',
    updatedAt: serverTimestamp(),
  });
}
