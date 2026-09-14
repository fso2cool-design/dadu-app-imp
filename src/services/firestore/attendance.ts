import { 
  collection, 
  doc, 
  getDoc,
  getDocs, 
  query, 
  where, 
  orderBy, 
  serverTimestamp,
  writeBatch
} from 'firebase/firestore';
import { db } from '../firebase/config';
import { AttendanceRecord, AttendanceSummary, AttendanceStatus, SemesterType } from '../../types';
import { updateMeetingAttendanceSummary } from './meetings';
import { trackSync } from '../../utils/syncEvents';

export interface SaveAttendanceItem {
  id?: string;
  studentId: string;
  rollNumber?: number;
  studentName?: string;
  gender?: 'L' | 'P';
  status: AttendanceStatus;
  note?: string;
}

export interface SaveSubjectAttendancePayload {
  academicYearId: string;
  semester: SemesterType;
  classId: string;
  teachingAssignmentId: string;
  subjectId?: string;
  date: string; // YYYY-MM-DD
  meetingId?: string | null;
  meetingNumber?: number | null;
  items: SaveAttendanceItem[];
}

/**
 * Generates a deterministic document ID for an attendance record to guarantee idempotency
 * and prevent duplicate records when re-saving the same session.
 */
export function getDeterministicAttendanceId(
  academicYearId: string,
  semester: string,
  classId: string,
  date: string,
  teachingAssignmentId: string,
  studentId: string
): string {
  const raw = `${academicYearId}_${semester}_${classId}_${date}_${teachingAssignmentId}_${studentId}`;
  return raw.replace(/[^a-zA-Z0-9_-]/g, '_');
}

/**
 * Normalizes an attendance record document to guarantee all relational fields are populated,
 * whether the record is newly created (independent) or legacy (meeting-bound).
 */
export function normalizeAttendanceRecord(
  raw: { id: string; [key: string]: any },
  meetingInfo?: { date?: string; meetingNumber?: number; academicYearId?: string; classId?: string; teachingAssignmentId?: string }
): AttendanceRecord {
  return {
    id: raw.id,
    studentId: raw.studentId || '',
    meetingId: raw.meetingId || null,
    meetingNumber: raw.meetingNumber ?? meetingInfo?.meetingNumber ?? null,
    academicYearId: raw.academicYearId || meetingInfo?.academicYearId || '',
    semester: raw.semester || 'GANJIL',
    classId: raw.classId || meetingInfo?.classId || '',
    teachingAssignmentId: raw.teachingAssignmentId || meetingInfo?.teachingAssignmentId || '',
    subjectId: raw.subjectId || '',
    date: raw.date || meetingInfo?.date || '',
    rollNumber: raw.rollNumber || 0,
    studentName: raw.studentName || '',
    gender: raw.gender || 'L',
    status: raw.status || 'PRESENT',
    note: raw.note || '',
    recordedBy: raw.recordedBy || '',
    createdAt: raw.createdAt,
    updatedAt: raw.updatedAt,
  };
}

/**
 * Independent Subject Attendance Save Handler.
 * Saves attendance without requiring an existing meeting/journal.
 * If meetingId is provided, also updates meeting attendance summary.
 */
export async function saveSubjectAttendance(
  uid: string,
  payload: SaveSubjectAttendancePayload
): Promise<AttendanceSummary> {
  const {
    academicYearId,
    semester,
    classId,
    teachingAssignmentId,
    subjectId = '',
    date,
    meetingId = null,
    meetingNumber = null,
    items
  } = payload;

  if (!academicYearId || !classId || !teachingAssignmentId || !date) {
    throw new Error('Data sesi presensi tidak lengkap (Tahun Ajaran, Kelas, Tugas Mengajar, dan Tanggal wajib diisi).');
  }

  if (!items || items.some(it => !it.studentId)) {
    throw new Error('Data presensi tidak valid: ID Siswa wajib diisi.');
  }

  // 1. Archive Governance: verify academic year is not archived
  const ayDoc = await getDoc(doc(db, 'users', uid, 'academicYears', academicYearId));
  if (ayDoc.exists() && ayDoc.data()?.isArchived) {
    throw new Error('Tidak dapat mengubah presensi pada Tahun Ajaran yang telah diarsipkan (read-only).');
  }

  return trackSync((async () => {
    const colRef = collection(db, 'users', uid, 'attendanceRecords');
    const now = serverTimestamp();

    let present = 0;
    let sick = 0;
    let permitted = 0;
    let absent = 0;
    let dispensation = 0;

    const validStatuses = new Set(['PRESENT', 'SICK', 'PERMITTED', 'ABSENT', 'DISPENSATION']);

    // Chunking writes in batches of 400
    const chunkSize = 400;
    for (let i = 0; i < items.length; i += chunkSize) {
      const chunk = items.slice(i, i + chunkSize);
      const batch = writeBatch(db);

      for (const item of chunk) {
        const status: AttendanceStatus = validStatuses.has(item.status) ? item.status : 'PRESENT';

        if (status === 'PRESENT') present++;
        else if (status === 'SICK') sick++;
        else if (status === 'PERMITTED') permitted++;
        else if (status === 'ABSENT') absent++;
        else if (status === 'DISPENSATION') dispensation++;

        // Deterministic ID ensures idempotency
        const recordId = getDeterministicAttendanceId(
          academicYearId,
          semester,
          classId,
          date,
          teachingAssignmentId,
          item.studentId
        );
        const docRef = doc(colRef, recordId);

        batch.set(docRef, {
          academicYearId,
          semester,
          classId,
          teachingAssignmentId,
          subjectId,
          studentId: item.studentId,
          date,
          rollNumber: item.rollNumber || 0,
          studentName: item.studentName || '',
          gender: item.gender || 'L',
          status,
          note: item.note || '',
          meetingId: meetingId || null,
          meetingNumber: meetingNumber !== undefined ? meetingNumber : null,
          recordedBy: uid,
          updatedAt: now,
          createdAt: now,
        }, { merge: true });
      }

      await batch.commit();
    }

    const total = items.length;
    const presentPercentage = total > 0 ? Math.round(((present + dispensation) / total) * 100) : 0;

    const summary: AttendanceSummary = {
      present,
      sick,
      permitted,
      absent,
      dispensation,
      total,
      presentPercentage,
    };

    // If an optional meeting is linked, update its summary
    if (meetingId) {
      try {
        await updateMeetingAttendanceSummary(uid, meetingId, summary);
      } catch (err) {
        console.warn('Gagal memperbarui ringkasan pertemuan opsional:', err);
      }
    }

    return summary;
  })(), {
    startMessage: 'Menyimpan presensi siswa ke cloud...',
    successMessage: 'Presensi mata pelajaran berhasil disimpan!'
  });
}

/**
 * Backward compatibility wrapper for saveMeetingAttendance.
 * Reads meeting metadata and persists using the independent attendance schema.
 */
export async function saveMeetingAttendance(
  uid: string,
  meetingId: string,
  items: SaveAttendanceItem[]
): Promise<AttendanceSummary> {
  if (!meetingId) {
    throw new Error('ID pertemuan wajib diisi.');
  }
  if (!items || items.some(it => !it.studentId)) {
    throw new Error('Data presensi tidak valid: ID Siswa wajib diisi.');
  }

  // 1. Relational & Archive Integrity Verification
  const meetingDoc = await getDoc(doc(db, 'users', uid, 'meetings', meetingId));
  if (!meetingDoc.exists()) {
    throw new Error('Pertemuan tidak ditemukan.');
  }
  const meetingData = meetingDoc.data() as any;

  return saveSubjectAttendance(uid, {
    academicYearId: meetingData.academicYearId || '',
    semester: meetingData.semester || 'GANJIL',
    classId: meetingData.classId || '',
    teachingAssignmentId: meetingData.teachingAssignmentId || '',
    subjectId: meetingData.subjectId || '',
    date: meetingData.date || new Date().toISOString().split('T')[0],
    meetingId,
    meetingNumber: meetingData.meetingNumber ?? null,
    items,
  });
}

/**
 * Retrieves attendance records by meetingId.
 */
export async function getAttendanceRecordsByMeeting(
  uid: string, 
  meetingId: string
): Promise<AttendanceRecord[]> {
  const colRef = collection(db, 'users', uid, 'attendanceRecords');
  const q = query(colRef, where('meetingId', '==', meetingId));
  const snap = await getDocs(q);
  const records = snap.docs.map(d => normalizeAttendanceRecord({ id: d.id, ...d.data() }));
  
  // Sort by rollNumber ascending
  return records.sort((a, b) => (a.rollNumber || 0) - (b.rollNumber || 0));
}

/**
 * Retrieves attendance records across multiple meeting IDs.
 */
export async function getAttendanceRecordsByMeetingIds(
  uid: string,
  meetingIds: string[]
): Promise<AttendanceRecord[]> {
  if (!meetingIds || meetingIds.length === 0) return [];
  const colRef = collection(db, 'users', uid, 'attendanceRecords');

  const chunks: string[][] = [];
  for (let i = 0; i < meetingIds.length; i += 30) {
    chunks.push(meetingIds.slice(i, i + 30));
  }

  const allRecords: AttendanceRecord[] = [];
  for (const chunk of chunks) {
    const q = query(colRef, where('meetingId', 'in', chunk));
    const snap = await getDocs(q);
    snap.docs.forEach(d => {
      allRecords.push(normalizeAttendanceRecord(Object.assign({ id: d.id }, d.data())));
    });
  }

  return allRecords;
}

/**
 * Retrieves all attendance records for a teaching assignment.
 * Optional filter by date.
 */
export async function getAttendanceRecordsByAssignment(
  uid: string,
  teachingAssignmentId: string,
  date?: string
): Promise<AttendanceRecord[]> {
  if (!teachingAssignmentId) return [];
  const colRef = collection(db, 'users', uid, 'attendanceRecords');

  let q;
  if (date) {
    q = query(
      colRef,
      where('teachingAssignmentId', '==', teachingAssignmentId),
      where('date', '==', date)
    );
  } else {
    q = query(
      colRef,
      where('teachingAssignmentId', '==', teachingAssignmentId)
    );
  }

  const snap = await getDocs(q);
  const records = snap.docs.map(d => normalizeAttendanceRecord(Object.assign({ id: d.id }, d.data())));
  return records.sort((a, b) => (a.rollNumber || 0) - (b.rollNumber || 0));
}

/**
 * Convenience helper to retrieve attendance records for an assignment on a specific date.
 */
export async function getAttendanceRecordsByDate(
  uid: string,
  teachingAssignmentId: string,
  date: string
): Promise<AttendanceRecord[]> {
  return getAttendanceRecordsByAssignment(uid, teachingAssignmentId, date);
}

/**
 * Retrieves attendance records for a class and academic period.
 */
export async function getAttendanceRecordsByClassAndPeriod(
  uid: string,
  classId: string,
  academicYearId: string,
  semester?: SemesterType
): Promise<AttendanceRecord[]> {
  if (!classId || !academicYearId) return [];
  const colRef = collection(db, 'users', uid, 'attendanceRecords');

  let q;
  if (semester) {
    q = query(
      colRef,
      where('classId', '==', classId),
      where('academicYearId', '==', academicYearId),
      where('semester', '==', semester)
    );
  } else {
    q = query(
      colRef,
      where('classId', '==', classId),
      where('academicYearId', '==', academicYearId)
    );
  }

  const snap = await getDocs(q);
  return snap.docs.map(d => normalizeAttendanceRecord(Object.assign({ id: d.id }, d.data())));
}
