import { 
  collection, 
  doc, 
  getDocs, 
  getDoc,
  query, 
  where, 
  orderBy, 
  serverTimestamp,
  writeBatch,
  setDoc
} from 'firebase/firestore';
import { db } from '../firebase/config';
import { DailyAttendanceRecord, DailyAttendanceSession, AttendanceSummary, AttendanceStatus, GenderType } from '../../types';
import { trackSync } from '../../utils/syncEvents';

export interface SaveDailyAttendanceItem {
  id?: string;
  studentId: string;
  rollNumber?: number;
  studentName?: string;
  gender?: GenderType;
  status: AttendanceStatus;
  note?: string;
}

export async function getDailyAttendanceSession(
  uid: string,
  academicYearId: string,
  classId: string,
  date: string
): Promise<DailyAttendanceSession | null> {
  const colRef = collection(db, 'users', uid, 'dailyAttendanceSessions');
  const q = query(
    colRef,
    where('academicYearId', '==', academicYearId),
    where('classId', '==', classId),
    where('date', '==', date)
  );
  const snap = await getDocs(q);
  if (snap.empty) return null;
  const docData = snap.docs[0];
  return { id: docData.id, ...(docData.data() as any) } as DailyAttendanceSession;
}

export async function getDailyAttendanceRecords(
  uid: string,
  academicYearId: string,
  classId: string,
  date: string
): Promise<DailyAttendanceRecord[]> {
  const colRef = collection(db, 'users', uid, 'dailyAttendanceRecords');
  const q = academicYearId
    ? query(
        colRef,
        where('academicYearId', '==', academicYearId),
        where('classId', '==', classId),
        where('date', '==', date)
      )
    : query(
        colRef,
        where('classId', '==', classId),
        where('date', '==', date)
      );
  const snap = await getDocs(q);
  const records = snap.docs.map(d => ({ id: d.id, ...(d.data() as any) } as DailyAttendanceRecord));
  return records.sort((a, b) => (a.rollNumber || 0) - (b.rollNumber || 0));
}

export async function getMonthlyDailyAttendanceRecords(
  uid: string,
  academicYearId: string,
  classId: string,
  yearMonthPrefix: string // e.g. "2026-08"
): Promise<DailyAttendanceRecord[]> {
  const colRef = collection(db, 'users', uid, 'dailyAttendanceRecords');
  const startDate = `${yearMonthPrefix}-01`;
  const endDate = `${yearMonthPrefix}-31`;
  const q = academicYearId
    ? query(
        colRef,
        where('academicYearId', '==', academicYearId),
        where('classId', '==', classId),
        where('date', '>=', startDate),
        where('date', '<=', endDate)
      )
    : query(
        colRef,
        where('classId', '==', classId),
        where('date', '>=', startDate),
        where('date', '<=', endDate)
      );
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...(d.data() as any) } as DailyAttendanceRecord));
}

export async function getAllDailyAttendanceRecordsForClass(
  uid: string,
  classId: string,
  academicYearId?: string
): Promise<DailyAttendanceRecord[]> {
  const colRef = collection(db, 'users', uid, 'dailyAttendanceRecords');
  const q = academicYearId
    ? query(colRef, where('academicYearId', '==', academicYearId), where('classId', '==', classId))
    : query(colRef, where('classId', '==', classId));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...(d.data() as any) } as DailyAttendanceRecord));
}

export async function saveDailyAttendance(
  uid: string,
  academicYearId: string,
  classId: string,
  className: string,
  date: string,
  items: SaveDailyAttendanceItem[],
  sessionNotes?: string
): Promise<AttendanceSummary> {
  return trackSync((async () => {
    // 1. Check if academic year is archived
    if (academicYearId) {
      const ayDoc = await getDoc(doc(db, 'users', uid, 'academicYears', academicYearId));
      if (ayDoc.exists() && ayDoc.data()?.isArchived) {
        throw new Error('Tidak dapat mengubah presensi pada Tahun Ajaran yang telah diarsipkan (read-only).');
      }
    }

    // 2. Validate class relationship
    if (classId) {
      const classDoc = await getDoc(doc(db, 'users', uid, 'classes', classId));
      if (classDoc.exists()) {
        const classData = classDoc.data();
        if (classData?.isArchived) {
          throw new Error('Kelas telah diarsipkan (read-only).');
        }
        if (classData?.academicYearId && classData.academicYearId !== academicYearId) {
          throw new Error('Relasi tidak konsisten: Kelas terdaftar pada tahun ajaran yang berbeda.');
        }
      }
    }

    const sessionsColRef = collection(db, 'users', uid, 'dailyAttendanceSessions');
    const recordsColRef = collection(db, 'users', uid, 'dailyAttendanceRecords');

    const now = serverTimestamp();

    let present = 0;
    let sick = 0;
    let permitted = 0;
    let absent = 0;
    let dispensation = 0;

    // Validate and write each student record deterministically
    const sessionId = `${academicYearId}_${classId}_${date}`;

    for (const item of items) {
      if (item.status === 'PRESENT') present++;
      else if (item.status === 'SICK') sick++;
      else if (item.status === 'PERMITTED') permitted++;
      else if (item.status === 'ABSENT') absent++;
      else if (item.status === 'DISPENSATION') dispensation++;
    }

    // Chunking writes in batches of safe threshold 300
    const chunkSize = 300;
    for (let i = 0; i < items.length; i += chunkSize) {
      const chunk = items.slice(i, i + chunkSize);
      const batch = writeBatch(db);

      for (const item of chunk) {
        const recordId = `${academicYearId}_${classId}_${date}_${item.studentId}`;
        const recordDocRef = doc(recordsColRef, recordId);

        batch.set(recordDocRef, {
          sessionId,
          academicYearId,
          classId,
          date,
          studentId: item.studentId,
          rollNumber: item.rollNumber || 0,
          studentName: item.studentName || '',
          gender: item.gender || 'L',
          status: item.status || 'PRESENT',
          note: item.note || '',
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

    // Upsert Daily Attendance Session Document with deterministic ID
    const sessionDocRef = doc(sessionsColRef, sessionId);
    const sessionBatch = writeBatch(db);
    sessionBatch.set(sessionDocRef, {
      academicYearId,
      classId,
      className,
      date,
      inputMethod: 'DIRECT',
      notes: sessionNotes || '',
      summary,
      updatedAt: now,
      createdAt: now,
    }, { merge: true });
    await sessionBatch.commit();

    return summary;
  })(), {
    startMessage: 'Menyimpan presensi harian kelas...',
    successMessage: 'Presensi harian berhasil tersimpan!'
  });
}
