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

  if (options?.teachingAssignmentId) {
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
  // Validate semantic relationship integrity
  if (!data.teachingAssignmentId || !data.classId || !data.subjectId || !data.academicYearId || !data.semester) {
    throw new Error('Relasi akademik tidak lengkap: ID Tugas Mengajar, Kelas, Mapel, Tahun Ajaran, dan Semester wajib diisi.');
  }

  const colRef = collection(db, 'users', uid, 'meetings');
  const meetingNumber = Number(data.meetingNumber) || 1;

  // Deterministic business key guarantees zero concurrency collisions
  const meetingKey = `${data.teachingAssignmentId}_${data.semester}_${meetingNumber}`;
  const meetingDocRef = doc(colRef, meetingKey);

  // Check for duplicate legacy meetings created with random IDs (backward compatibility)
  const duplicateQ = query(
    colRef,
    where('teachingAssignmentId', '==', data.teachingAssignmentId),
    where('semester', '==', data.semester),
    where('meetingNumber', '==', meetingNumber)
  );
  const dupSnap = await getDocs(duplicateQ);
  if (!dupSnap.empty) {
    throw new Error(`Pertemuan ke-${meetingNumber} untuk kelas dan mata pelajaran ini sudah ada dalam jurnal. Silakan periksa daftar pertemuan.`);
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

  // Run atomic transaction on deterministic document ID
  await runTransaction(db, async (transaction) => {
    const existingDoc = await transaction.get(meetingDocRef);
    if (existingDoc.exists()) {
      throw new Error(`Pertemuan ke-${meetingNumber} untuk kelas dan mata pelajaran ini sudah ada dalam jurnal.`);
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
  return trackSync((async () => {
    const docRef = doc(db, 'users', uid, 'meetings', id);
    await updateDoc(docRef, {
      ...data,
      updatedAt: serverTimestamp(),
    });
  })(), {
    startMessage: 'Memperbarui jurnal pertemuan...',
    successMessage: 'Jurnal pertemuan tersimpan!'
  });
}

export async function deleteMeeting(uid: string, id: string): Promise<void> {
  return trackSync((async () => {
    // Also delete associated attendance records
    const attColRef = collection(db, 'users', uid, 'attendanceRecords');
    const attQ = query(attColRef, where('meetingId', '==', id));
    const attSnap = await getDocs(attQ);

    const batch = writeBatch(db);
    attSnap.docs.forEach(docSnap => {
      batch.delete(docSnap.ref);
    });

    const docRef = doc(db, 'users', uid, 'meetings', id);
    batch.delete(docRef);

    await batch.commit();
  })(), {
    startMessage: 'Menghapus jurnal pertemuan...',
    successMessage: 'Jurnal pertemuan dihapus!'
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
