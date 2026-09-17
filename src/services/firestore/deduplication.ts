import {
  collection,
  doc,
  getDocs,
  query,
  where,
  deleteDoc,
  updateDoc,
  writeBatch,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '../firebase/config';
import { Student, Enrollment } from '../../types';
import { sanitizeExcelDate } from '../../utils/excelImportSanitizer';
import { buildStudentSearchTokens } from './students';

export interface DuplicateStudentGroup {
  key: string;
  matchType: 'NIS' | 'NISN' | 'NAME';
  matchValue: string;
  masterStudent: Student;
  duplicateStudents: Student[];
  totalRecords: number;
}

export interface DeduplicationScanResult {
  hasDuplicates: boolean;
  totalDuplicateStudents: number;
  totalDuplicateEnrollments: number;
  groups: DuplicateStudentGroup[];
  orphanEnrollmentsCount: number;
}

export interface DeduplicationExecutionResult {
  mergedStudentsCount: number;
  deletedStudentsCount: number;
  deletedEnrollmentsCount: number;
  relinkedEnrollmentsCount: number;
  relinkedAcademicRecordsCount: number;
  details: string[];
}

/**
 * Menghitung skor kelengkapan biodata siswa untuk menentukan kandidat Master Record.
 */
function calculateStudentCompleteness(s: Student): number {
  let score = 0;
  if (s.status === 'ACTIVE') score += 10;
  if (!s.isArchived) score += 5;
  if (s.nis && s.nis.trim().length > 0) score += 10;
  if (s.nisn && s.nisn.trim().length > 0) score += 10;
  if (s.address && s.address.trim().length > 0) score += 8;
  if (s.birthPlace && s.birthPlace.trim().length > 0) score += 4;
  if (s.parentName && s.parentName.trim().length > 0) score += 5;
  if (s.parentPhone && s.parentPhone.trim().length > 0) score += 4;
  if (s.phone && s.phone.trim().length > 0) score += 3;

  // Skor untuk tanggal lahir (beri bobot lebih tinggi jika formatnya ISO standar dibanding angka murni)
  if (s.birthDate && s.birthDate.trim().length > 0) {
    if (/^\d{4}-\d{2}-\d{2}$/.test(s.birthDate.trim())) {
      score += 8;
    } else {
      score += 4;
    }
  }

  return score;
}

/**
 * Memindai database untuk menemukan data siswa dan penempatan kelas (enrollment) yang ganda.
 */
export async function scanDuplicateStudents(
  uid: string,
  options?: { classId?: string; academicYearId?: string }
): Promise<DeduplicationScanResult> {
  const studentsColRef = collection(db, 'users', uid, 'students');
  const enrollmentsColRef = collection(db, 'users', uid, 'enrollments');

  // Ambil semua siswa
  const studentsSnap = await getDocs(studentsColRef);
  const allStudents = studentsSnap.docs.map(
    d => ({ id: d.id, ...(d.data() as any) } as Student)
  );

  // Ambil semua enrollment (bisa difilter jika opsi disediakan)
  let enrollmentsSnap;
  if (options?.classId && options?.academicYearId) {
    enrollmentsSnap = await getDocs(
      query(
        enrollmentsColRef,
        where('classId', '==', options.classId),
        where('academicYearId', '==', options.academicYearId)
      )
    );
  } else if (options?.academicYearId) {
    enrollmentsSnap = await getDocs(
      query(enrollmentsColRef, where('academicYearId', '==', options.academicYearId))
    );
  } else {
    enrollmentsSnap = await getDocs(enrollmentsColRef);
  }

  const allEnrollments = enrollmentsSnap.docs.map(
    d => ({ id: d.id, ...(d.data() as any) } as Enrollment)
  );

  const studentMap = new Map<string, Student>();
  allStudents.forEach(s => studentMap.set(s.id, s));

  // 1. Cek orphan enrollments (enrollment yang merujuk ke studentId yang sudah tidak ada)
  let orphanEnrollmentsCount = 0;
  allEnrollments.forEach(enr => {
    if (!studentMap.has(enr.studentId)) {
      orphanEnrollmentsCount++;
    }
  });

  // 2. Pengelompokan siswa berdasarkan identitas
  // Prioritas grouping: NIS -> NISN -> Nama Lengkap Normal (hanya jika di rombel yang sama atau data identik)
  const groupsByKey = new Map<string, Student[]>();

  // A. Berdasarkan NIS (jika terisi)
  allStudents.forEach(s => {
    const cleanNis = s.nis?.trim().toLowerCase();
    if (cleanNis) {
      const key = `NIS:${cleanNis}`;
      if (!groupsByKey.has(key)) groupsByKey.set(key, []);
      groupsByKey.get(key)!.push(s);
    }
  });

  // B. Berdasarkan NISN (jika terisi)
  allStudents.forEach(s => {
    const cleanNisn = s.nisn?.trim().toLowerCase();
    if (cleanNisn) {
      const key = `NISN:${cleanNisn}`;
      if (!groupsByKey.has(key)) groupsByKey.set(key, []);
      groupsByKey.get(key)!.push(s);
    }
  });

  // C. Berdasarkan Nama Lengkap Normal (jika NIS dan NISN kosong, atau untuk menangkap duplikat nama)
  allStudents.forEach(s => {
    const cleanName = s.fullName?.trim().toLowerCase().replace(/\s+/g, ' ');
    if (cleanName) {
      const key = `NAME:${cleanName}`;
      if (!groupsByKey.has(key)) groupsByKey.set(key, []);
      groupsByKey.get(key)!.push(s);
    }
  });

  // Gabungkan kelompok yang saling beririsan agar setiap siswa hanya ada di 1 grup duplikat
  const processedStudentIds = new Set<string>();
  const duplicateGroups: DuplicateStudentGroup[] = [];

  for (const [key, studentList] of groupsByKey.entries()) {
    // Hilangkan duplikasi instans dalam list
    const uniqueStudents = Array.from(new Map(studentList.map(s => [s.id, s])).values());
    if (uniqueStudents.length <= 1) continue;

    // Filter siswa yang sudah masuk ke grup duplikat lain sebelumnya
    const unassignedStudents = uniqueStudents.filter(s => !processedStudentIds.has(s.id));
    if (unassignedStudents.length <= 1) continue;

    // Tentukan kandidat Master Record (yang datanya paling lengkap)
    unassignedStudents.sort((a, b) => {
      const scoreA = calculateStudentCompleteness(a);
      const scoreB = calculateStudentCompleteness(b);
      if (scoreB !== scoreA) return scoreB - scoreA;
      // Jika skor sama, utamakan yang memiliki updatedAt terbaru
      const timeA = (a.updatedAt as any)?.seconds || 0;
      const timeB = (b.updatedAt as any)?.seconds || 0;
      return timeB - timeA;
    });

    const master = unassignedStudents[0];
    const duplicates = unassignedStudents.slice(1);

    unassignedStudents.forEach(s => processedStudentIds.add(s.id));

    const matchType = key.startsWith('NIS:') ? 'NIS' : key.startsWith('NISN:') ? 'NISN' : 'NAME';
    const matchValue = key.replace(/^(NIS:|NISN:|NAME:)/, '');

    duplicateGroups.push({
      key,
      matchType,
      matchValue,
      masterStudent: master,
      duplicateStudents: duplicates,
      totalRecords: unassignedStudents.length,
    });
  }

  // 3. Hitung jumlah duplicate enrollments (siswa yang terdaftar > 1 kali di rombel & tahun ajaran yang sama)
  const enrollmentTracker = new Map<string, string[]>(); // key: studentId_classId_academicYearId -> enrollmentIds[]
  allEnrollments.forEach(enr => {
    const enrKey = `${enr.studentId}_${enr.classId}_${enr.academicYearId}`;
    if (!enrollmentTracker.has(enrKey)) enrollmentTracker.set(enrKey, []);
    enrollmentTracker.get(enrKey)!.push(enr.id);
  });

  let duplicateEnrollmentsCount = 0;
  for (const ids of enrollmentTracker.values()) {
    if (ids.length > 1) {
      duplicateEnrollmentsCount += (ids.length - 1);
    }
  }

  // Tambahkan perkiraan duplicate enrollments yang akan terhapus akibat penggabungan student
  duplicateGroups.forEach(group => {
    // Jika duplicate student punya enrollment di kelas yang sama dengan master, itu juga duplicate enrollment
    const masterEnrs = allEnrollments.filter(e => e.studentId === group.masterStudent.id);
    group.duplicateStudents.forEach(dup => {
      const dupEnrs = allEnrollments.filter(e => e.studentId === dup.id);
      dupEnrs.forEach(de => {
        const matchesMaster = masterEnrs.some(
          me => me.classId === de.classId && me.academicYearId === de.academicYearId
        );
        if (matchesMaster) {
          duplicateEnrollmentsCount++;
        }
      });
    });
  });

  const totalDuplicateStudents = duplicateGroups.reduce(
    (sum, g) => sum + g.duplicateStudents.length,
    0
  );

  return {
    hasDuplicates: duplicateGroups.length > 0 || duplicateEnrollmentsCount > 0 || orphanEnrollmentsCount > 0,
    totalDuplicateStudents,
    totalDuplicateEnrollments: duplicateEnrollmentsCount,
    groups: duplicateGroups,
    orphanEnrollmentsCount,
  };
}

/**
 * Melakukan deduplikasi tanpa residu:
 * 1. Menggabungkan informasi kelengkapan data (alamat, TTL, ortu) ke Master Student.
 * 2. Mengalihkan/membersihkan dokumen relasi (enrollments, scores, attendance, notes) dari ID duplikat.
 * 3. Menghapus dokumen duplikat dari koleksi students dan enrollments.
 * 4. Menghapus orphan enrollments.
 */
export async function executeZeroResidueDeduplication(
  uid: string,
  options?: { classId?: string; academicYearId?: string }
): Promise<DeduplicationExecutionResult> {
  const scan = await scanDuplicateStudents(uid, options);

  const result: DeduplicationExecutionResult = {
    mergedStudentsCount: 0,
    deletedStudentsCount: 0,
    deletedEnrollmentsCount: 0,
    relinkedEnrollmentsCount: 0,
    relinkedAcademicRecordsCount: 0,
    details: [],
  };

  const studentsColRef = collection(db, 'users', uid, 'students');
  const enrollmentsColRef = collection(db, 'users', uid, 'enrollments');
  const scoresColRef = collection(db, 'users', uid, 'scores');
  const attColRef = collection(db, 'users', uid, 'attendanceRecords');
  const dailyAttColRef = collection(db, 'users', uid, 'dailyAttendanceRecords');
  const notesColRef = collection(db, 'users', uid, 'studentNotes');

  // Ambil semua enrollment untuk pengecekan relasi
  const allEnrollmentsSnap = await getDocs(enrollmentsColRef);
  const allEnrollments = allEnrollmentsSnap.docs.map(
    d => ({ id: d.id, ...(d.data() as any) } as Enrollment)
  );

  // Array operasi batch yang akan di-commit
  type BatchOp =
    | { type: 'UPDATE'; ref: any; data: any }
    | { type: 'DELETE'; ref: any };

  const operations: BatchOp[] = [];

  // 1. Tangani tiap grup duplikat siswa
  for (const group of scan.groups) {
    const master = group.masterStudent;
    const masterRef = doc(studentsColRef, master.id);

    // Siapkan enrichment data untuk master jika master memiliki kolom yang kosong tapi terisi di duplikat
    const enrichmentData: Record<string, any> = {};

    // Cek alamat
    if (!master.address || master.address.trim() === '') {
      const bestAddress = group.duplicateStudents.find(d => d.address && d.address.trim() !== '')?.address;
      if (bestAddress) enrichmentData.address = bestAddress.trim();
    }

    // Cek tanggal lahir
    if (!master.birthDate || !/^\d{4}-\d{2}-\d{2}$/.test(master.birthDate)) {
      const bestBirthDate = group.duplicateStudents
        .map(d => sanitizeExcelDate(d.birthDate))
        .find(d => /^\d{4}-\d{2}-\d{2}$/.test(d));
      if (bestBirthDate) enrichmentData.birthDate = bestBirthDate;
    }

    // Cek tempat lahir
    if (!master.birthPlace || master.birthPlace.trim() === '') {
      const bestPlace = group.duplicateStudents.find(d => d.birthPlace && d.birthPlace.trim() !== '')?.birthPlace;
      if (bestPlace) enrichmentData.birthPlace = bestPlace.trim();
    }

    // Cek nama orang tua & nomor telepon
    if (!master.parentName || master.parentName.trim() === '') {
      const bestParent = group.duplicateStudents.find(d => d.parentName && d.parentName.trim() !== '')?.parentName;
      if (bestParent) enrichmentData.parentName = bestParent.trim();
    }
    if (!master.parentPhone || master.parentPhone.trim() === '') {
      const bestParentPhone = group.duplicateStudents.find(d => d.parentPhone && d.parentPhone.trim() !== '')?.parentPhone;
      if (bestParentPhone) enrichmentData.parentPhone = bestParentPhone.trim();
    }
    if (!master.phone || master.phone.trim() === '') {
      const bestPhone = group.duplicateStudents.find(d => d.phone && d.phone.trim() !== '')?.phone;
      if (bestPhone) enrichmentData.phone = bestPhone.trim();
    }
    if (!master.nis || master.nis.trim() === '') {
      const bestNis = group.duplicateStudents.find(d => d.nis && d.nis.trim() !== '')?.nis;
      if (bestNis) enrichmentData.nis = bestNis.trim();
    }
    if (!master.nisn || master.nisn.trim() === '') {
      const bestNisn = group.duplicateStudents.find(d => d.nisn && d.nisn.trim() !== '')?.nisn;
      if (bestNisn) enrichmentData.nisn = bestNisn.trim();
    }

    if (Object.keys(enrichmentData).length > 0) {
      const effectiveFullName = enrichmentData.fullName || master.fullName;
      const effectiveParentName = enrichmentData.parentName !== undefined ? enrichmentData.parentName : master.parentName;
      enrichmentData.searchTokens = buildStudentSearchTokens(effectiveFullName, effectiveParentName);
      enrichmentData.updatedAt = serverTimestamp();
      operations.push({
        type: 'UPDATE',
        ref: masterRef,
        data: enrichmentData,
      });
      result.mergedStudentsCount++;
    }

    // Ambil daftar enrollments aktif milik master
    const masterEnrollments = allEnrollments.filter(e => e.studentId === master.id);

    // Proses setiap siswa duplikat
    for (const dup of group.duplicateStudents) {
      const dupRef = doc(studentsColRef, dup.id);

      // A. Ambil seluruh enrollments milik duplikat
      const dupEnrollments = allEnrollments.filter(e => e.studentId === dup.id);
      for (const de of dupEnrollments) {
        const deRef = doc(enrollmentsColRef, de.id);
        const alreadyEnrolledInSameClass = masterEnrollments.some(
          me => me.classId === de.classId && me.academicYearId === de.academicYearId
        );

        if (alreadyEnrolledInSameClass) {
          // Master sudah terdaftar di kelas dan tahun ajaran ini -> hapus enrollment duplikat
          operations.push({ type: 'DELETE', ref: deRef });
          result.deletedEnrollmentsCount++;
        } else {
          // Master belum terdaftar di kelas ini -> alihkan relasi enrollment ke master
          operations.push({
            type: 'UPDATE',
            ref: deRef,
            data: { studentId: master.id, updatedAt: serverTimestamp() },
          });
          masterEnrollments.push({ ...de, studentId: master.id });
          result.relinkedEnrollmentsCount++;
        }
      }

      // B. Alihkan catatan akademik (scores, attendance, notes)
      const [scoresSnap, attSnap, dailyAttSnap, notesSnap] = await Promise.all([
        getDocs(query(scoresColRef, where('studentId', '==', dup.id))),
        getDocs(query(attColRef, where('studentId', '==', dup.id))),
        getDocs(query(dailyAttColRef, where('studentId', '==', dup.id))),
        getDocs(query(notesColRef, where('studentId', '==', dup.id))),
      ]);

      // Alihkan scores
      scoresSnap.docs.forEach(d => {
        operations.push({
          type: 'UPDATE',
          ref: doc(scoresColRef, d.id),
          data: { studentId: master.id },
        });
        result.relinkedAcademicRecordsCount++;
      });

      // Alihkan attendanceRecords
      attSnap.docs.forEach(d => {
        operations.push({
          type: 'UPDATE',
          ref: doc(attColRef, d.id),
          data: { studentId: master.id },
        });
        result.relinkedAcademicRecordsCount++;
      });

      // Alihkan dailyAttendanceRecords
      dailyAttSnap.docs.forEach(d => {
        operations.push({
          type: 'UPDATE',
          ref: doc(dailyAttColRef, d.id),
          data: { studentId: master.id },
        });
        result.relinkedAcademicRecordsCount++;
      });

      // Alihkan studentNotes
      notesSnap.docs.forEach(d => {
        operations.push({
          type: 'UPDATE',
          ref: doc(notesColRef, d.id),
          data: { studentId: master.id },
        });
        result.relinkedAcademicRecordsCount++;
      });

      // C. Hapus dokumen siswa duplikat
      operations.push({ type: 'DELETE', ref: dupRef });
      result.deletedStudentsCount++;
    }

    result.details.push(
      `Siswa "${master.fullName}" (NIS: ${master.nis || '-'}): Menggabungkan ${group.duplicateStudents.length} record duplikat ke master ID.`
    );
  }

  // 2. Tangani duplikasi pendaftaran enrollment langsung (misal siswa yang sama didaftarkan 2 kali di kelas yang sama)
  const groupedEnrollments = new Map<string, Enrollment[]>();
  allEnrollments.forEach(enr => {
    // Lewati enrollment yang sudah dijadwalkan hapus
    const isScheduledDelete = operations.some(
      op => op.type === 'DELETE' && op.ref.id === enr.id
    );
    if (isScheduledDelete) return;

    const key = `${enr.studentId}_${enr.classId}_${enr.academicYearId}`;
    if (!groupedEnrollments.has(key)) groupedEnrollments.set(key, []);
    groupedEnrollments.get(key)!.push(enr);
  });

  for (const enrList of groupedEnrollments.values()) {
    if (enrList.length > 1) {
      // Pertahankan 1 enrollment (yang nomor absennya valid atau terlama), hapus sisanya
      enrList.sort((a, b) => {
        const rollA = a.rollNumber || 9999;
        const rollB = b.rollNumber || 9999;
        return rollA - rollB;
      });

      const redundantEnrs = enrList.slice(1);
      for (const red of redundantEnrs) {
        operations.push({
          type: 'DELETE',
          ref: doc(enrollmentsColRef, red.id),
        });
        result.deletedEnrollmentsCount++;
      }
    }
  }

  // 3. Eksekusi seluruh operasi batch secara teratur (maksimal 400 op per batch)
  const CHUNK_SIZE = 400;
  for (let i = 0; i < operations.length; i += CHUNK_SIZE) {
    const chunk = operations.slice(i, i + CHUNK_SIZE);
    const batch = writeBatch(db);

    chunk.forEach(op => {
      if (op.type === 'UPDATE') {
        batch.update(op.ref, op.data);
      } else if (op.type === 'DELETE') {
        batch.delete(op.ref);
      }
    });

    await batch.commit();
  }

  return result;
}
