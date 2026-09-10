import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  query,
  where,
  serverTimestamp,
  writeBatch,
} from 'firebase/firestore';
import { db } from '../firebase/config';
import {
  TeacherAttendanceRecord,
  TeacherAttendanceStatus,
  TeacherAttendanceSummaryItem,
  TeacherAttendanceEntryType,
  TeacherMonthlyAttendanceItem,
  TeacherMonthlyAttendanceRecord,
  TeachingAssignment,
  SemesterType,
} from '../../types';
import { trackSync } from '../../utils/syncEvents';

export interface SaveTeacherAttendanceItem {
  teachingAssignmentId?: string; // Dapat kosong/manual jika di luar penugasan rutin
  teacherId: string;
  teacherName?: string;
  subjectId: string;
  subjectName?: string;
  subjectCode?: string;
  dayOfWeek?: number;
  status: TeacherAttendanceStatus;
  notes?: string;
  isManualEntry?: boolean;
  isSubstitute?: boolean;
  substituteForTeacherName?: string;
  entryType?: TeacherAttendanceEntryType;
}

export interface SaveTeacherAttendancePayload {
  academicYearId: string;
  academicYearLabel?: string;
  semester: SemesterType;
  classId: string;
  className?: string;
  date: string; // YYYY-MM-DD
  items: SaveTeacherAttendanceItem[];
}

/**
 * Mengambil penugasan mengajar (Teaching Assignments) untuk kelas binaan
 * pada tahun ajaran dan semester aktif.
 */
export async function getHomeroomTeachingAssignments(
  uid: string,
  academicYearId: string,
  semester: SemesterType,
  classId: string,
  includeArchived: boolean = false
): Promise<TeachingAssignment[]> {
  const colRef = collection(db, 'users', uid, 'teachingAssignments');
  const q = query(
    colRef,
    where('academicYearId', '==', academicYearId),
    where('semester', '==', semester),
    where('classId', '==', classId)
  );

  const snap = await getDocs(q);
  const list = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) } as TeachingAssignment));

  if (includeArchived) {
    return list;
  }
  return list.filter((item) => !item.isArchived && item.isActive !== false);
}

/**
 * Mengambil record kehadiran guru mapel pada tanggal tertentu di kelas binaan.
 */
export async function getTeacherAttendanceRecordsForDate(
  uid: string,
  academicYearId: string,
  semester: SemesterType,
  classId: string,
  date: string
): Promise<TeacherAttendanceRecord[]> {
  const colRef = collection(db, 'users', uid, 'teacherAttendanceRecords');
  const q = query(
    colRef,
    where('classId', '==', classId),
    where('academicYearId', '==', academicYearId),
    where('semester', '==', semester),
    where('date', '==', date)
  );

  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) } as TeacherAttendanceRecord));
}

/**
 * Mengambil record kehadiran guru mapel bulanan (misal: 2026-09-01 s/d 2026-09-31)
 */
export async function getMonthlyTeacherAttendanceRecords(
  uid: string,
  academicYearId: string,
  semester: SemesterType,
  classId: string,
  yearMonthPrefix: string // Format: YYYY-MM
): Promise<TeacherAttendanceRecord[]> {
  const colRef = collection(db, 'users', uid, 'teacherAttendanceRecords');
  const startDate = `${yearMonthPrefix}-01`;
  const endDate = `${yearMonthPrefix}-31`;

  const q = query(
    colRef,
    where('classId', '==', classId),
    where('academicYearId', '==', academicYearId),
    where('semester', '==', semester),
    where('date', '>=', startDate),
    where('date', '<=', endDate)
  );

  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) } as TeacherAttendanceRecord));
}

/**
 * Menyimpan atau memperbarui (upsert idempotent) kehadiran guru mapel satu tanggal.
 * Menggunakan deterministic ID: {academicYearId}_{semester}_{classId}_{date}_{teachingAssignmentId}
 */
export async function saveTeacherAttendanceRecords(
  uid: string,
  payload: SaveTeacherAttendancePayload
): Promise<{ count: number }> {
  return trackSync((async () => {
    const { academicYearId, academicYearLabel, semester, classId, className, date, items } = payload;

    if (!academicYearId || !semester || !classId || !date) {
      throw new Error('Parameter academicYearId, semester, classId, dan date wajib diisi.');
    }

    // 1. Verifikasi apakah tahun ajaran dalam status diarsipkan (read-only)
    const ayDoc = await getDoc(doc(db, 'users', uid, 'academicYears', academicYearId));
    if (ayDoc.exists() && ayDoc.data()?.isArchived) {
      throw new Error('Tidak dapat mengubah kehadiran pada Tahun Ajaran yang telah diarsipkan (read-only).');
    }

    // 2. Verifikasi kelas
    const classDoc = await getDoc(doc(db, 'users', uid, 'classes', classId));
    if (classDoc.exists() && classDoc.data()?.isArchived) {
      throw new Error('Tidak dapat mengubah kehadiran pada Kelas yang telah diarsipkan (read-only).');
    }

    const colRef = collection(db, 'users', uid, 'teacherAttendanceRecords');
    const batch = writeBatch(db);
    const now = serverTimestamp();

    // 3. Ambil record yang sudah ada di tanggal ini untuk membersihkan record yang sengaja dihapus barisnya
    const existingOnDate = await getTeacherAttendanceRecordsForDate(uid, academicYearId, semester, classId, date);
    const existingMap = new Map(existingOnDate.map(r => [r.id, r]));
    const targetIds = new Set<string>();

    for (const item of items) {
      // Deterministic document ID agar idempotent dan anti-duplikasi
      const asgKey = item.teachingAssignmentId || `manual_${item.teacherId}_${item.subjectId}`;
      const deterministicId = `${academicYearId}_${semester}_${classId}_${date}_${asgKey}`;
      targetIds.add(deterministicId);
      const recordDocRef = doc(colRef, deterministicId);

      const recordData: Record<string, any> = {
        id: deterministicId,
        academicYearId,
        semester,
        classId,
        date,
        teachingAssignmentId: asgKey,
        teacherId: item.teacherId,
        subjectId: item.subjectId,
        status: item.status,
        updatedAt: now,
        updatedBy: uid,
      };

      if (academicYearLabel) recordData.academicYearLabel = academicYearLabel;
      if (className) recordData.className = className;
      if (item.teacherName) recordData.teacherName = item.teacherName;
      if (item.subjectName) recordData.subjectName = item.subjectName;
      if (item.subjectCode) recordData.subjectCode = item.subjectCode;
      if (item.dayOfWeek !== undefined) recordData.dayOfWeek = item.dayOfWeek;
      if (item.notes !== undefined) recordData.notes = item.notes.trim();
      if (item.isManualEntry !== undefined) recordData.isManualEntry = item.isManualEntry;
      if (item.isSubstitute !== undefined) recordData.isSubstitute = item.isSubstitute;
      if (item.substituteForTeacherName !== undefined) recordData.substituteForTeacherName = item.substituteForTeacherName.trim();
      if (item.entryType) recordData.entryType = item.entryType;

      // Gunakan merge: true sehingga jika dokumen baru createdAt dibuat, jika update tidak menimpa createdAt
      batch.set(
        recordDocRef,
        {
          ...recordData,
          createdAt: now,
          createdBy: uid,
        },
        { merge: true }
      );
    }

    // 4. Hapus record lama pada tanggal ini yang barisnya telah dihapus oleh pengguna
    for (const [existId] of existingMap.entries()) {
      if (!targetIds.has(existId)) {
        batch.delete(doc(colRef, existId));
      }
    }

    await batch.commit();
    return { count: items.length };
  })(), {
    startMessage: 'Menyimpan kehadiran guru mapel...',
    successMessage: 'Kehadiran guru mapel berhasil disimpan!',
    errorMessage: 'Gagal menyimpan kehadiran guru mapel',
  });
}

/**
 * Menghapus record kehadiran tanggal tertentu jika wali kelas ingin mereset
 */
export async function deleteTeacherAttendanceForDate(
  uid: string,
  academicYearId: string,
  semester: SemesterType,
  classId: string,
  date: string
): Promise<void> {
  return trackSync((async () => {
    const existing = await getTeacherAttendanceRecordsForDate(
      uid,
      academicYearId,
      semester,
      classId,
      date
    );

    if (existing.length === 0) return;

    const batch = writeBatch(db);
    for (const r of existing) {
      const docRef = doc(db, 'users', uid, 'teacherAttendanceRecords', r.id);
      batch.delete(docRef);
    }

    await batch.commit();
  })(), {
    startMessage: 'Mereset data kehadiran tanggal terpilih...',
    successMessage: 'Data kehadiran tanggal berhasil direset',
    errorMessage: 'Gagal mereset data kehadiran',
  });
}

/**
 * Menghitung rekapitulasi kehadiran per guru & mata pelajaran
 * berdasarkan record aktual yang tersimpan (in-memory aggregation).
 */
export function calculateTeacherAttendanceSummary(
  assignments: TeachingAssignment[],
  records: TeacherAttendanceRecord[]
): TeacherAttendanceSummaryItem[] {
  // Map per teachingAssignmentId
  const summaryMap = new Map<string, TeacherAttendanceSummaryItem>();

  // 1. Inisialisasi dari assignments aktif / yang ada
  assignments.forEach((asg) => {
    summaryMap.set(asg.id, {
      teachingAssignmentId: asg.id,
      teacherId: asg.teacherId || '',
      teacherName: asg.teacherName || 'Guru Mapel',
      subjectId: asg.subjectId || '',
      subjectName: asg.subjectName || 'Mata Pelajaran',
      subjectCode: asg.subjectCode,
      hadir: 0,
      sakit: 0,
      izin: 0,
      alpa: 0,
      dinas: 0,
      total: 0,
      persentaseHadir: 0,
    });
  });

  // 2. Akumulasi dari records
  records.forEach((rec) => {
    let item = summaryMap.get(rec.teachingAssignmentId);
    if (!item) {
      // Jika assignment lama sudah diarsipkan atau entri manual/pengganti (historical & flexible preservation)
      item = {
        teachingAssignmentId: rec.teachingAssignmentId,
        teacherId: rec.teacherId || '',
        teacherName: rec.teacherName || 'Guru Mapel',
        subjectId: rec.subjectId || '',
        subjectName: rec.subjectName || 'Mata Pelajaran',
        subjectCode: rec.subjectCode,
        isManualEntry: Boolean(rec.isManualEntry),
        isSubstitute: Boolean(rec.isSubstitute),
        entryType: rec.entryType,
        hadir: 0,
        sakit: 0,
        izin: 0,
        alpa: 0,
        dinas: 0,
        total: 0,
        persentaseHadir: 0,
      };
      summaryMap.set(rec.teachingAssignmentId, item);
    }

    if (rec.isManualEntry && !item.isManualEntry) item.isManualEntry = true;
    if (rec.isSubstitute && !item.isSubstitute) item.isSubstitute = true;
    if (rec.entryType && !item.entryType) item.entryType = rec.entryType;

    if (rec.status === 'HADIR') item.hadir++;
    else if (rec.status === 'SAKIT') item.sakit++;
    else if (rec.status === 'IZIN') item.izin++;
    else if (rec.status === 'ALPA') item.alpa++;
    else if (rec.status === 'DINAS') item.dinas++;

    item.total++;
  });

  // 3. Hitung persentase kehadiran: (Hadir + Dinas) / Total * 100
  const result: TeacherAttendanceSummaryItem[] = [];
  summaryMap.forEach((item) => {
    const effectivePresent = item.hadir + item.dinas;
    item.persentaseHadir = item.total > 0 ? Math.round((effectivePresent / item.total) * 100) : 0;
    result.push(item);
  });

  // Urutkan berdasarkan nama guru dan mata pelajaran
  return result.sort((a, b) => a.teacherName.localeCompare(b.teacherName) || a.subjectName.localeCompare(b.subjectName));
}

/**
 * Mengambil record rekapitulasi bulanan kehadiran guru mapel
 * Format docId: {classId}_{academicYearId}_{semester}_{year}_{month}
 */
export async function getTeacherMonthlyAttendance(
  uid: string,
  classId: string,
  academicYearId: string,
  semester: SemesterType,
  year: number,
  month: number
): Promise<TeacherMonthlyAttendanceRecord | null> {
  const docId = `${classId}_${academicYearId}_${semester}_${year}_${month}`;
  const docRef = doc(db, 'users', uid, 'teacherMonthlyAttendance', docId);
  const snap = await getDoc(docRef);
  if (!snap.exists()) {
    return null;
  }
  return { id: snap.id, ...(snap.data() as any) } as TeacherMonthlyAttendanceRecord;
}

/**
 * Menyimpan / memperbarui rekapitulasi bulanan kehadiran guru mapel
 */
export async function saveTeacherMonthlyAttendance(
  uid: string,
  record: Omit<TeacherMonthlyAttendanceRecord, 'updatedAt' | 'createdAt'>
): Promise<void> {
  return trackSync((async () => {
    const { classId, academicYearId, semester, year, month, items, className, academicYearLabel } = record;

    if (!classId || !academicYearId || !semester || !year || !month) {
      throw new Error('Parameter classId, academicYearId, semester, year, dan month wajib diisi.');
    }

    // Verifikasi apakah tahun ajaran dalam status diarsipkan (read-only)
    const ayDoc = await getDoc(doc(db, 'users', uid, 'academicYears', academicYearId));
    if (ayDoc.exists() && ayDoc.data()?.isArchived) {
      throw new Error('Tidak dapat menyimpan rekap pada Tahun Ajaran yang telah diarsipkan (read-only).');
    }

    const docId = `${classId}_${academicYearId}_${semester}_${year}_${month}`;
    const docRef = doc(db, 'users', uid, 'teacherMonthlyAttendance', docId);

    const now = serverTimestamp();
    const cleanItems = items.map((item) => ({
      id: item.id,
      teachingAssignmentId: item.teachingAssignmentId || '',
      teacherId: item.teacherId || '',
      teacherName: item.teacherName || 'Guru Mapel',
      subjectId: item.subjectId || '',
      subjectName: item.subjectName || 'Mata Pelajaran',
      subjectCode: item.subjectCode || '',
      targetMeetings: Number(item.targetMeetings) || 0,
      hadir: Number(item.hadir) || 0,
      sakit: Number(item.sakit) || 0,
      izin: Number(item.izin) || 0,
      alpa: Number(item.alpa) || 0,
      dinas: Number(item.dinas) || 0,
      notes: (item.notes || '').trim(),
      isManual: Boolean(item.isManual),
      isSubstitute: Boolean(item.isSubstitute),
      substituteForTeacherName: (item.substituteForTeacherName || '').trim(),
    }));

    const dataToSave: Record<string, any> = {
      id: docId,
      classId,
      academicYearId,
      semester,
      year,
      month,
      items: cleanItems,
      updatedAt: now,
      updatedBy: uid,
    };

    if (className) dataToSave.className = className;
    if (academicYearLabel) dataToSave.academicYearLabel = academicYearLabel;

    await setDoc(docRef, {
      ...dataToSave,
      createdAt: now,
      createdBy: uid,
    }, { merge: true });
  })(), {
    startMessage: 'Menyimpan rekapitulasi kehadiran guru mapel...',
    successMessage: 'Rekapitulasi kehadiran guru mapel berhasil disimpan!',
    errorMessage: 'Gagal menyimpan rekapitulasi kehadiran guru mapel',
  });
}

