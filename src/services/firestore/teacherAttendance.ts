import {
  collection,
  doc,
  getDocs,
  getDoc,
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
  TeachingAssignment,
  SemesterType,
} from '../../types';
import { trackSync } from '../../utils/syncEvents';

export interface SaveTeacherAttendanceItem {
  teachingAssignmentId: string;
  teacherId: string;
  teacherName?: string;
  subjectId: string;
  subjectName?: string;
  subjectCode?: string;
  dayOfWeek?: number;
  status: TeacherAttendanceStatus;
  notes?: string;
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

    for (const item of items) {
      // Deterministic document ID agar idempotent dan anti-duplikasi
      const deterministicId = `${academicYearId}_${semester}_${classId}_${date}_${item.teachingAssignmentId}`;
      const recordDocRef = doc(colRef, deterministicId);

      const recordData: Record<string, any> = {
        id: deterministicId,
        academicYearId,
        semester,
        classId,
        date,
        teachingAssignmentId: item.teachingAssignmentId,
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
      // Jika assignment lama sudah diarsipkan tapi record masih ada (historical preservation)
      item = {
        teachingAssignmentId: rec.teachingAssignmentId,
        teacherId: rec.teacherId || '',
        teacherName: rec.teacherName || 'Guru Mapel (Historis)',
        subjectId: rec.subjectId || '',
        subjectName: rec.subjectName || 'Mata Pelajaran',
        subjectCode: rec.subjectCode,
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
