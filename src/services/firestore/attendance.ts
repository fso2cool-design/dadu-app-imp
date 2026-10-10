export type { SaveAttendanceItem, SaveSubjectAttendancePayload } from '../../domain/attendance.types';
import type { SaveAttendanceItem, SaveSubjectAttendancePayload } from '../../domain/attendance.types';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  serverTimestamp,
  runTransaction
} from 'firebase/firestore';
import { db } from '../firebase/config';
import { AttendanceRecord, AttendanceSummary, AttendanceStatus, SemesterType, MeetingStatus } from '../../types';
import { trackSync } from '../../utils/syncEvents';

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
 * Menyimpan data presensi mata pelajaran secara mandiri dan konsisten (atomik via runTransaction).
 * Menjamin integritas relasi, validasi drift check optimistik, exhaustive status check meeting,
 * dan kalkulasi ringkasan presensi tanpa side-effect parsial.
 *
 * @param uid - ID Pengguna (guru).
 * @param payload - Payload presensi lengkap dengan meetingId dan expectedPreviousMeetingId eksplisit.
 * @returns Ringkasan kalkulasi kehadiran (hadir, sakit, izin, alpa, persentase kehadiran).
 * @throws Error bila payload tidak lengkap, status tidak sah, atau terjadi konflik konkurensi.
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
    meetingId,
    expectedPreviousMeetingId,
    meetingNumber,
    items
  } = payload;

  // 1. Pre-validation: metadata sesi wajib
  if (!academicYearId || !classId || !teachingAssignmentId || !date || !semester) {
    throw new Error('Data sesi presensi tidak lengkap (Tahun Ajaran, Semester, Kelas, Tugas Mengajar, dan Tanggal wajib diisi).');
  }

  // 2. Pre-validation: roster tidak boleh kosong
  if (!items || items.length === 0) {
    throw new Error('Data presensi tidak valid: Roster siswa tidak boleh kosong.');
  }

  // 3. Pre-validation: batas kapasitas transaksi maksimal 200 siswa
  if (items.length > 200) {
    throw new Error('Data presensi melebihi batas kapasitas maksimal transaksi (maksimum 200 siswa).');
  }

  // 4. Pre-validation: ID siswa unik & status presensi sah (tanpa fallback diam-diam)
  const studentIds = new Set<string>();
  const validStatuses = new Set<AttendanceStatus>(['PRESENT', 'SICK', 'PERMITTED', 'ABSENT', 'DISPENSATION']);

  for (const item of items) {
    if (!item.studentId || !item.studentId.trim()) {
      throw new Error('Data presensi tidak valid: ID Siswa wajib diisi.');
    }
    if (studentIds.has(item.studentId)) {
      throw new Error(`Data presensi tidak valid: Duplikasi ID Siswa terdeteksi (${item.studentId}).`);
    }
    studentIds.add(item.studentId);

    if (!validStatuses.has(item.status)) {
      throw new Error(`Data presensi tidak valid: Status presensi tidak sah (${String(item.status)}).`);
    }
  }

  // 5. Hitung ringkasan hanya dari status yang telah divalidasi
  let present = 0;
  let sick = 0;
  let permitted = 0;
  let absent = 0;
  let dispensation = 0;

  for (const item of items) {
    if (item.status === 'PRESENT') present++;
    else if (item.status === 'SICK') sick++;
    else if (item.status === 'PERMITTED') permitted++;
    else if (item.status === 'ABSENT') absent++;
    else if (item.status === 'DISPENSATION') dispensation++;
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

  // 6. Archive Governance: periksa tahun ajaran tidak diarsipkan
  const ayDoc = await getDoc(doc(db, 'users', uid, 'academicYears', academicYearId));
  if (ayDoc.exists() && ayDoc.data()?.isArchived) {
    throw new Error('Tidak dapat mengubah presensi pada Tahun Ajaran yang telah diarsipkan (read-only).');
  }

  // 7. Validasi cross-relationship teaching assignment
  const taDoc = await getDoc(doc(db, 'users', uid, 'teachingAssignments', teachingAssignmentId));
  if (taDoc.exists()) {
    const taData = taDoc.data();
    if (taData?.isArchived) {
      throw new Error('Penugasan mengajar ini telah diarsipkan dan tidak dapat menerima presensi baru.');
    }
    if (taData?.academicYearId && taData.academicYearId !== academicYearId) {
      throw new Error('Relasi tidak konsisten: Tahun ajaran tugas mengajar tidak sesuai dengan sesi presensi.');
    }
    if (taData?.classId && taData.classId !== classId) {
      throw new Error('Relasi tidak konsisten: Kelas tugas mengajar tidak sesuai dengan sesi presensi.');
    }
  }

  // 8. Pemeriksaan Roster Pra-Transaksi (Query di Luar Transaksi)
  // Catatan Risiko Residual: Operasi ini berlangsung di luar transaksi client-side SDK sehingga tidak dapat mengunci
  // penyisipan dokumen baru di luar `items` secara atomik selama transaksi berlangsung.
  const existingSessionRecords = await getAttendanceRecordsByDate(uid, teachingAssignmentId, date);
  const extraRecords = existingSessionRecords.filter(r => !studentIds.has(r.studentId));
  if (extraRecords.length > 0) {
    throw new Error(`Rekonsiliasi gagal: Ditemukan ${extraRecords.length} data presensi siswa tersimpan yang tidak tercantum dalam form saat ini. Harap muat ulang halaman.`);
  }

  // 9. Transaksi Atomik Tunggal
  return trackSync((async () => {
    await runTransaction(db, async (transaction) => {
      // === FASE PEMBACAAN (READS FIRST) ===

      // A. Baca dan validasi target meeting jika ada
      let targetMeetingData: any = null;
      let targetMeetingDocRef: any = null;
      let nextTargetStatus: MeetingStatus | null = null;

      if (meetingId) {
        targetMeetingDocRef = doc(db, 'users', uid, 'meetings', meetingId);
        const targetMeetingSnap = await transaction.get(targetMeetingDocRef);
        if (!targetMeetingSnap.exists()) {
          throw new Error(`Pertemuan target (${meetingId}) tidak ditemukan.`);
        }
        targetMeetingData = targetMeetingSnap.data();

        // Validasi relasi target meeting terhadap sesi
        if (targetMeetingData.teachingAssignmentId && targetMeetingData.teachingAssignmentId !== teachingAssignmentId) {
          throw new Error('Relasi pertemuan tidak valid: Penugasan mengajar pertemuan tidak cocok dengan sesi presensi.');
        }
        if (targetMeetingData.date && targetMeetingData.date !== date) {
          throw new Error('Relasi pertemuan tidak valid: Tanggal pertemuan tidak cocok dengan tanggal sesi presensi.');
        }

        // Validasi exhaustive status target meeting
        const currentStatus: MeetingStatus = targetMeetingData.status;
        if (currentStatus === 'SCHEDULED' || currentStatus === 'COMPLETED') {
          nextTargetStatus = 'COMPLETED';
        } else if (currentStatus === 'SUBSTITUTE') {
          nextTargetStatus = 'SUBSTITUTE';
        } else if (currentStatus === 'DRAFT' || currentStatus === 'CANCELLED') {
          throw new Error(`Pertemuan tidak dapat ditautkan karena berstatus ${currentStatus}.`);
        } else {
          throw new Error(`Pertemuan memiliki status tidak sah (${String(currentStatus)}).`);
        }
      }

      // B. Baca dokumen kanonikal yang mewakili setiap siswa pada payload
      const colRef = collection(db, 'users', uid, 'attendanceRecords');
      const recordDocRefs: Array<{ docRef: any; item: SaveAttendanceItem; existingSnap: any }> = [];

      for (const item of items) {
        const recordId = getDeterministicAttendanceId(
          academicYearId,
          semester,
          classId,
          date,
          teachingAssignmentId,
          item.studentId
        );
        const recordDocRef = doc(colRef, recordId);
        const existingSnap = await transaction.get(recordDocRef);
        recordDocRefs.push({ docRef: recordDocRef, item, existingSnap });
      }

      // C. Validasi hubungan seluruh rekaman yang dibaca
      const existingMeetingIds = new Set<string>();
      let hasNullMeeting = false;

      for (const { existingSnap } of recordDocRefs) {
        if (existingSnap.exists()) {
          const data = existingSnap.data();
          if (data?.meetingId) {
            existingMeetingIds.add(data.meetingId);
          } else {
            hasNullMeeting = true;
          }
        }
      }

      // Jika rekaman tersimpan terpecah/bercampur pada beberapa meeting berbeda atau campuran meeting & null
      if (existingMeetingIds.size > 1 || (existingMeetingIds.size === 1 && hasNullMeeting)) {
        throw new Error('Integritas data terganggu: Rekaman presensi sesi ini memiliki relasi pertemuan yang bercampur/terpecah. Operasi dibatalkan.');
      }

      // Tentukan relasi persisten aktual
      const actualPreviousMeetingId: string | null = existingMeetingIds.size === 1
        ? Array.from(existingMeetingIds)[0]
        : null;

      // D. Optimistic Drift Check: Bandingkan relasi aktual dengan expectedPreviousMeetingId
      if (actualPreviousMeetingId !== expectedPreviousMeetingId) {
        throw new Error(`OPTIMISTIC_CONCURRENCY_ERROR: Relasi sesi telah berubah oleh pengguna lain (sebelumnya ${expectedPreviousMeetingId || 'tidak ditautkan'}, sekarang ${actualPreviousMeetingId || 'tidak ditautkan'}). Harap muat ulang.`);
      }

      // E. Baca dan validasi meeting lama jika ringkasannya perlu dibersihkan
      let oldMeetingDocRef: any = null;
      if (actualPreviousMeetingId && actualPreviousMeetingId !== meetingId) {
        oldMeetingDocRef = doc(db, 'users', uid, 'meetings', actualPreviousMeetingId);
        const oldMeetingSnap = await transaction.get(oldMeetingDocRef);
        if (oldMeetingSnap.exists()) {
          const oldData = oldMeetingSnap.data() as any;
          if (oldData.teachingAssignmentId && oldData.teachingAssignmentId !== teachingAssignmentId) {
            throw new Error('Pertemuan lama yang ditautkan tidak sesuai dengan penugasan sesi ini.');
          }
        }
      }

      // === FASE PENULISAN (WRITES AFTER ALL READS) ===
      const now = serverTimestamp();

      // F. Tulis semua rekaman siswa
      for (const { docRef: recordDocRef, item, existingSnap } of recordDocRefs) {
        if (existingSnap.exists()) {
          const oldData = existingSnap.data();
          const updatePayload: Record<string, any> = {
            academicYearId,
            semester,
            classId,
            teachingAssignmentId,
            subjectId: subjectId || oldData.subjectId || '',
            studentId: item.studentId,
            date,
            rollNumber: item.rollNumber !== undefined ? item.rollNumber : (oldData.rollNumber ?? 0),
            studentName: item.studentName !== undefined ? item.studentName : (oldData.studentName ?? ''),
            gender: item.gender !== undefined ? item.gender : (oldData.gender ?? 'L'),
            status: item.status,
            note: item.note !== undefined ? item.note : (oldData.note ?? ''),
            meetingId: meetingId || null,
            meetingNumber: (meetingId && meetingNumber !== undefined && meetingNumber !== null)
              ? meetingNumber
              : (meetingId ? (targetMeetingData?.meetingNumber ?? null) : null),
            recordedBy: oldData.recordedBy || uid,
            updatedAt: now,
          };
          if (oldData.createdAt) {
            updatePayload.createdAt = oldData.createdAt;
          }

          transaction.set(recordDocRef, updatePayload, { merge: true });
        } else {
          // Dokumen baru: sertakan createdAt
          const createPayload: Record<string, any> = {
            academicYearId,
            semester,
            classId,
            teachingAssignmentId,
            subjectId: subjectId || '',
            studentId: item.studentId,
            date,
            rollNumber: item.rollNumber ?? 0,
            studentName: item.studentName ?? '',
            gender: item.gender ?? 'L',
            status: item.status,
            note: item.note ?? '',
            meetingId: meetingId || null,
            meetingNumber: (meetingId && meetingNumber !== undefined && meetingNumber !== null)
              ? meetingNumber
              : (meetingId ? (targetMeetingData?.meetingNumber ?? null) : null),
            recordedBy: uid,
            createdAt: now,
            updatedAt: now,
          };

          transaction.set(recordDocRef, createPayload);
        }
      }

      // G. Bersihkan ringkasan meeting lama jika tautan dipindahkan atau dilepas
      if (oldMeetingDocRef) {
        transaction.update(oldMeetingDocRef, {
          attendanceSummary: null,
          updatedAt: now,
        });
      }

      // H. Perbarui ringkasan dan status meeting target jika ditautkan
      if (targetMeetingDocRef && nextTargetStatus) {
        transaction.update(targetMeetingDocRef, {
          attendanceSummary: summary,
          status: nextTargetStatus,
          updatedAt: now,
        });
      }
    });

    return summary;
  })(), {
    startMessage: 'Menyimpan presensi siswa ke cloud...',
    successMessage: 'Presensi mata pelajaran berhasil disimpan!'
  });
}

/**
 * Wrapper kompatibilitas mundur untuk menyimpan presensi yang terikat pada jurnal pertemuan.
 * Mengambil metadata pertemuan dan mendelegasikannya ke schema penyimpanan presensi independen.
 *
 * @deprecated Gunakan saveSubjectAttendance langsung dengan formulir SubjectAttendancePage kanonikal.
 * @param uid - ID Pengguna (guru).
 * @param meetingId - ID dokumen pertemuan terkait.
 * @param items - Daftar presensi kehadiran santri/siswa.
 * @returns Ringkasan statistik absensi siswa.
 * @throws Error bila pertemuan tidak ditemukan atau data siswa tidak lengkap.
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
  const teachingAssignmentId = meetingData.teachingAssignmentId || '';
  const date = meetingData.date || new Date().toISOString().split('T')[0];

  // Pre-fetch data persisten untuk menentukan expectedPreviousMeetingId
  const existingRecords = await getAttendanceRecordsByDate(uid, teachingAssignmentId, date);
  const expectedPreviousMeetingId = existingRecords.length > 0 ? (existingRecords[0].meetingId || null) : null;

  return saveSubjectAttendance(uid, {
    academicYearId: meetingData.academicYearId || '',
    semester: meetingData.semester || 'GANJIL',
    classId: meetingData.classId || '',
    teachingAssignmentId,
    subjectId: meetingData.subjectId || '',
    date,
    meetingId,
    expectedPreviousMeetingId,
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
