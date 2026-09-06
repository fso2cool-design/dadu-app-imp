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
import { AttendanceRecord, AttendanceSummary, AttendanceStatus } from '../../types';
import { updateMeetingAttendanceSummary } from './meetings';
import { trackSync } from '../../utils/syncEvents';

export async function getAttendanceRecordsByMeeting(
  uid: string, 
  meetingId: string
): Promise<AttendanceRecord[]> {
  const colRef = collection(db, 'users', uid, 'attendanceRecords');
  const q = query(colRef, where('meetingId', '==', meetingId));
  const snap = await getDocs(q);
  const records = snap.docs.map(d => ({ id: d.id, ...(d.data() as any) } as AttendanceRecord));
  
  // Sort by rollNumber ascending
  return records.sort((a, b) => (a.rollNumber || 0) - (b.rollNumber || 0));
}

export interface SaveAttendanceItem {
  id?: string;
  studentId: string;
  rollNumber?: number;
  studentName?: string;
  gender?: 'L' | 'P';
  status: AttendanceStatus;
  note?: string;
}

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

  if (meetingData?.academicYearId) {
    const ayDoc = await getDoc(doc(db, 'users', uid, 'academicYears', meetingData.academicYearId));
    if (ayDoc.exists() && ayDoc.data()?.isArchived) {
      throw new Error('Tidak dapat mengubah presensi pada Tahun Ajaran yang telah diarsipkan (read-only).');
    }
  }

  return trackSync((async () => {
    const colRef = collection(db, 'users', uid, 'attendanceRecords');
    const batch = writeBatch(db);
    const now = serverTimestamp();

    let present = 0;
    let sick = 0;
    let permitted = 0;
    let absent = 0;
    let dispensation = 0;

    const validStatuses = new Set(['PRESENT', 'SICK', 'PERMITTED', 'ABSENT', 'DISPENSATION']);

    for (const item of items) {
      const status: AttendanceStatus = validStatuses.has(item.status) ? item.status : 'PRESENT';

      if (status === 'PRESENT') present++;
      else if (status === 'SICK') sick++;
      else if (status === 'PERMITTED') permitted++;
      else if (status === 'ABSENT') absent++;
      else if (status === 'DISPENSATION') dispensation++;

      const recordId = `${meetingId}_${item.studentId}`;
      const docRef = doc(colRef, recordId);

      batch.set(docRef, {
        meetingId,
        studentId: item.studentId,
        teachingAssignmentId: meetingData.teachingAssignmentId || '',
        classId: meetingData.classId || '',
        subjectId: meetingData.subjectId || '',
        academicYearId: meetingData.academicYearId || '',
        rollNumber: item.rollNumber || 0,
        studentName: item.studentName || '',
        gender: item.gender || 'L',
        status,
        note: item.note || '',
        updatedAt: now,
        createdAt: now,
      }, { merge: true });
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

    // Commit batch for attendance records
    await batch.commit();

    // Update summary in meeting document
    await updateMeetingAttendanceSummary(uid, meetingId, summary);

    return summary;
  })(), {
    startMessage: 'Menyimpan presensi siswa ke cloud...',
    successMessage: 'Presensi pertemuan berhasil disimpan!'
  });
}

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
      allRecords.push({ id: d.id, ...(d.data() as any) } as AttendanceRecord);
    });
  }

  return allRecords;
}
