import { 
  doc, 
  getDoc, 
  getDocs, 
  collection, 
  query, 
  where, 
  serverTimestamp, 
  runTransaction 
} from 'firebase/firestore';
import { db } from '../firebase/config';
import { Student, Enrollment } from '../../types';
import { trackSync } from '../../utils/syncEvents';

export interface RelinkClassParams {
  enrollmentId: string;
  targetClassId: string;
  performedBy: string;
  reason?: string;
}

export interface RelinkStudentParams {
  targetType: 'ENROLLMENT' | 'SCORE' | 'ATTENDANCE' | 'DAILY_ATTENDANCE' | 'STUDENT_NOTE';
  documentId: string;
  targetStudentId: string;
  performedBy: string;
  expectedNisn?: string;
  reason?: string;
}

/**
 * Mencari kandidat master siswa berdasarkan kesamaan NISN secara persis.
 * PERINGATAN: Sesuai prinsip Student Identity Governance, TIDAK menggunakan
 * pencocokan otomatis kabur (fuzzy matching) berdasarkan nama.
 * Hasil dikembalikan kepada admin/guru untuk verifikasi eksplisit sebelum re-link.
 */
export async function findStudentCandidatesByNisn(
  uid: string,
  nisn: string
): Promise<Student[]> {
  const cleanNisn = nisn?.trim();
  if (!cleanNisn) return [];

  const colRef = collection(db, 'users', uid, 'students');
  const q = query(colRef, where('nisn', '==', cleanNisn));
  const snap = await getDocs(q);

  return snap.docs
    .map(d => ({ id: d.id, ...(d.data() as any) } as Student))
    .filter(s => !s.isArchived);
}

/**
 * Memulihkan relasi kelas pada penempatan siswa (Enrollment) yang putus (misal kelas lama hilang/terhapus).
 * Dijalankan dalam transaksi atomik Firestore:
 * 1. Validasi keberadaan enrollment & target class
 * 2. Validasi kesesuaian Tahun Ajaran (Pemulihan lintas Tahun Ajaran DITOLAK)
 * 3. Validasi status arsip kelas target
 * 4. Validasi pencegahan duplicate ACTIVE enrollment
 * 5. Update atomik dengan pencatatan audit trail (relinkedAt, relinkedBy, relinkedFromId, relinkedToId, relinkReason)
 * 6. Mempertahankan seluruh histori akademik siswa (nilai, presensi, catatan).
 */
export async function relinkEnrollmentClass(
  uid: string,
  params: RelinkClassParams
): Promise<void> {
  const { enrollmentId, targetClassId, performedBy, reason } = params;

  if (!enrollmentId || !targetClassId) {
    throw new Error('ID Penempatan dan ID Kelas target wajib diisi.');
  }

  return trackSync(
    runTransaction(db, async (transaction) => {
      // 1. ALL READS FIRST
      const enrollmentRef = doc(db, 'users', uid, 'enrollments', enrollmentId);
      const enrollmentSnap = await transaction.get(enrollmentRef);
      if (!enrollmentSnap.exists()) {
        throw new Error('Dokumen penempatan siswa (Enrollment) tidak ditemukan.');
      }
      const enrollmentData = enrollmentSnap.data() as Enrollment;

      const targetClassRef = doc(db, 'users', uid, 'classes', targetClassId);
      const targetClassSnap = await transaction.get(targetClassRef);
      if (!targetClassSnap.exists()) {
        throw new Error('Kelas tujuan pemulihan tidak ditemukan di database.');
      }
      const targetClassData = targetClassSnap.data() as any;

      // 2. VALIDASI: Academic Year harus sama (Pemulihan lintas Academic Year diblokir)
      if (enrollmentData.academicYearId && targetClassData.academicYearId !== enrollmentData.academicYearId) {
        throw new Error(
          `Pemulihan lintas Tahun Ajaran diblokir! Kelas tujuan (${targetClassData.name}) berada di Tahun Ajaran berbeda dengan data penempatan siswa.`
        );
      }

      // 3. VALIDASI: Target class tidak boleh diarsipkan jika enrollment berstatus ACTIVE
      if (enrollmentData.status === 'ACTIVE' && targetClassData.isArchived) {
        throw new Error('Tidak dapat memulihkan penempatan aktif ke kelas yang telah diarsipkan.');
      }

      // 4. VALIDASI: Cek pencegahan duplicate ACTIVE enrollment
      if (enrollmentData.status === 'ACTIVE' && enrollmentData.studentId) {
        const enrollmentsColRef = collection(db, 'users', uid, 'enrollments');
        const activeCheckQ = query(
          enrollmentsColRef,
          where('academicYearId', '==', enrollmentData.academicYearId),
          where('studentId', '==', enrollmentData.studentId),
          where('classId', '==', targetClassId),
          where('status', '==', 'ACTIVE')
        );
        const activeSnap = await getDocs(activeCheckQ);
        const duplicateDocs = activeSnap.docs.filter(d => d.id !== enrollmentId);
        if (duplicateDocs.length > 0) {
          throw new Error(
            `Siswa sudah memiliki penempatan aktif di kelas ${targetClassData.name}. Pemulihan dibatalkan demi mencegah duplicate ACTIVE enrollment.`
          );
        }
      }

      // 5. ATOMIC WRITE dengan Audit Trail
      const now = serverTimestamp();
      transaction.update(enrollmentRef, {
        classId: targetClassId,
        className: targetClassData.name || '',
        relinkedAt: now,
        relinkedBy: performedBy || 'admin',
        relinkedFromId: enrollmentData.classId || 'ORPHANED_CLASS',
        relinkedToId: targetClassId,
        relinkReason: reason || 'Koreksi relasi kelas penempatan siswa (Re-link)',
        isOrphaned: false,
        updatedAt: now,
      });
    }),
    {
      startMessage: 'Memulihkan relasi kelas penempatan...',
      successMessage: 'Relasi kelas berhasil dipulihkan secara aman!'
    }
  );
}

/**
 * Memulihkan relasi transaksi (Enrollment / Score / Attendance / Note) ke master siswa yang benar.
 * Dijalankan dalam transaksi atomik:
 * 1. Membaca dokumen relasi terbaru
 * 2. Membaca data target Student
 * 3. Memeriksa NISN jika diharapkan (expectedNisn)
 * 4. Memeriksa konflik
 * 5. Memastikan workspace/user terisolasi
 * 6. Update atomik dokumen
 * 7. Mencatat audit trail lengkap tanpa menghapus histori original.
 */
export async function relinkStudentRelationship(
  uid: string,
  params: RelinkStudentParams
): Promise<void> {
  const { targetType, documentId, targetStudentId, performedBy, expectedNisn, reason } = params;

  if (!documentId || !targetStudentId) {
    throw new Error('ID Dokumen transaksi dan ID Siswa target wajib diisi.');
  }

  let collectionName: string;
  switch (targetType) {
    case 'ENROLLMENT':
      collectionName = 'enrollments';
      break;
    case 'SCORE':
      collectionName = 'scores';
      break;
    case 'ATTENDANCE':
      collectionName = 'attendanceRecords';
      break;
    case 'DAILY_ATTENDANCE':
      collectionName = 'dailyAttendanceRecords';
      break;
    case 'STUDENT_NOTE':
      collectionName = 'studentNotes';
      break;
    default:
      throw new Error(`Tipe transaksi "${targetType}" tidak didukung untuk re-link.`);
  }

  return trackSync(
    runTransaction(db, async (transaction) => {
      // 1. ALL READS FIRST
      const docRef = doc(db, 'users', uid, collectionName, documentId);
      const docSnap = await transaction.get(docRef);
      if (!docSnap.exists()) {
        throw new Error(`Dokumen transaksi pada koleksi ${collectionName} (${documentId}) tidak ditemukan.`);
      }
      const transData = docSnap.data() as any;

      const studentRef = doc(db, 'users', uid, 'students', targetStudentId);
      const studentSnap = await transaction.get(studentRef);
      if (!studentSnap.exists()) {
        throw new Error('Siswa tujuan tidak ditemukan di Master Siswa.');
      }
      const studentData = studentSnap.data() as Student;

      // 2. Validasi status siswa target
      if (studentData.isArchived) {
        throw new Error('Siswa tujuan berada dalam status ARSIP. Tidak dapat menautkan transaksi ke siswa arsip.');
      }

      // 3. Validasi NISN jika diharapkan
      if (expectedNisn && expectedNisn.trim()) {
        const cleanExpected = expectedNisn.trim();
        const studentNisn = (studentData.nisn || '').trim();
        if (studentNisn !== cleanExpected) {
          throw new Error(
            `Verifikasi NISN gagal: NISN siswa tujuan (${studentNisn || 'Kosong'}) tidak sesuai dengan NISN referensi (${cleanExpected}).`
          );
        }
      }

      // 4. Validasi Konflik khusus Enrollment (duplicate ACTIVE enrollment)
      if (targetType === 'ENROLLMENT' && transData.status === 'ACTIVE' && transData.academicYearId && transData.classId) {
        const existingActiveQ = query(
          collection(db, 'users', uid, 'enrollments'),
          where('academicYearId', '==', transData.academicYearId),
          where('studentId', '==', targetStudentId),
          where('status', '==', 'ACTIVE')
        );
        const activeSnap = await getDocs(existingActiveQ);
        const conflicting = activeSnap.docs.filter(d => d.id !== documentId);
        if (conflicting.length > 0) {
          throw new Error(
            `Siswa target "${studentData.fullName}" sudah memiliki penempatan aktif lain pada Tahun Ajaran ini. Re-link dibatalkan untuk mencegah duplicate ACTIVE enrollment.`
          );
        }
      }

      // 5. ATOMIC WRITE dengan Audit Trail
      const now = serverTimestamp();
      const oldStudentId = transData.studentId || 'ORPHANED_STUDENT';

      const updatePayload: any = {
        studentId: targetStudentId,
        relinkedAt: now,
        relinkedBy: performedBy || 'admin',
        relinkedFromId: oldStudentId,
        relinkedToId: targetStudentId,
        relinkReason: reason || 'Pemulihan relasi transaksi ke identitas siswa valid',
        updatedAt: now,
      };

      // Perbarui nama siswa jika dicache pada dokumen transaksi
      if (studentData.fullName) {
        if ('studentName' in transData || targetType === 'ATTENDANCE' || targetType === 'DAILY_ATTENDANCE' || targetType === 'STUDENT_NOTE') {
          updatePayload.studentName = studentData.fullName;
        }
      }

      transaction.update(docRef, updatePayload);
    }),
    {
      startMessage: 'Menautkan ulang relasi siswa...',
      successMessage: 'Relasi siswa berhasil dipulihkan dengan audit trail!'
    }
  );
}
