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
  writeBatch
} from 'firebase/firestore';
import { db } from '../firebase/config';
import { Student } from '../../types';

export async function getStudents(uid: string, status?: string): Promise<Student[]> {
  const colRef = collection(db, 'users', uid, 'students');
  let q;
  if (status && status !== 'ALL') {
    q = query(colRef, where('status', '==', status), orderBy('fullName', 'asc'));
  } else {
    q = query(colRef, orderBy('fullName', 'asc'));
  }
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...(d.data() as any) } as Student));
}

export async function getStudentById(uid: string, studentId: string): Promise<Student | null> {
  const docRef = doc(db, 'users', uid, 'students', studentId);
  const snap = await getDoc(docRef);
  if (!snap.exists()) return null;
  return { id: snap.id, ...(snap.data() as any) } as Student;
}

/**
 * Validasi ketersediaan NISN untuk siswa aktif di ruang kerja pengguna.
 * Jika NISN kosong/belum ada, dianggap valid (tidak dipaksakan unik).
 */
export async function checkNisnAvailability(
  uid: string,
  nisn: string,
  excludeStudentId?: string
): Promise<{ isAvailable: boolean; conflictingStudent?: Student }> {
  const cleanNisn = nisn?.trim();
  if (!cleanNisn) {
    return { isAvailable: true };
  }

  const colRef = collection(db, 'users', uid, 'students');
  const q = query(colRef, where('nisn', '==', cleanNisn));
  const snap = await getDocs(q);

  for (const docSnap of snap.docs) {
    if (excludeStudentId && docSnap.id === excludeStudentId) {
      continue;
    }
    const student = { id: docSnap.id, ...(docSnap.data() as any) } as Student;
    if (!student.isArchived) {
      return { isAvailable: false, conflictingStudent: student };
    }
  }

  return { isAvailable: true };
}

export async function createStudent(
  uid: string, 
  data: Omit<Student, 'id' | 'createdAt' | 'updatedAt'>
): Promise<Student> {
  const cleanNisn = data.nisn?.trim() || '';
  if (cleanNisn) {
    const check = await checkNisnAvailability(uid, cleanNisn);
    if (!check.isAvailable) {
      throw new Error(
        `NISN "${cleanNisn}" sudah terdaftar pada siswa "${check.conflictingStudent?.fullName || ''}". Setiap siswa aktif harus memiliki NISN unik.`
      );
    }
  }

  const colRef = collection(db, 'users', uid, 'students');
  const now = serverTimestamp();
  const studentData = {
    nis: data.nis?.trim() || '',
    nisn: cleanNisn,
    fullName: data.fullName.trim(),
    gender: data.gender || 'L',
    birthPlace: data.birthPlace?.trim() || '',
    birthDate: data.birthDate?.trim() || '',
    phone: data.phone?.trim() || '',
    parentName: data.parentName?.trim() || '',
    parentPhone: data.parentPhone?.trim() || '',
    email: data.email?.trim() || '',
    religion: data.religion?.trim() || 'Islam',
    address: data.address?.trim() || '',
    notes: data.notes?.trim() || '',
    status: data.status || 'ACTIVE',
    nikSiswa: data.nikSiswa?.trim() || '',
    nikIbu: data.nikIbu?.trim() || '',
    nkk: data.nkk?.trim() || '',
    createdAt: now,
    updatedAt: now,
  };
  const docRef = await addDoc(colRef, studentData);
  return { id: docRef.id, ...studentData } as Student;
}

export interface StudentUsageSummary {
  isUsed: boolean;
  canDelete: boolean;
  reasons: string[];
  counts: {
    enrollments: number;
    scores: number;
    attendanceRecords: number;
    dailyAttendanceRecords: number;
    studentNotes: number;
  };
}

export async function checkStudentUsage(uid: string, studentId: string): Promise<StudentUsageSummary> {
  const [enrSnap, scoreSnap, attSnap, dailyAttSnap, notesSnap] = await Promise.all([
    getDocs(query(collection(db, 'users', uid, 'enrollments'), where('studentId', '==', studentId))),
    getDocs(query(collection(db, 'users', uid, 'scores'), where('studentId', '==', studentId))),
    getDocs(query(collection(db, 'users', uid, 'attendanceRecords'), where('studentId', '==', studentId))),
    getDocs(query(collection(db, 'users', uid, 'dailyAttendanceRecords'), where('studentId', '==', studentId))),
    getDocs(query(collection(db, 'users', uid, 'studentNotes'), where('studentId', '==', studentId))),
  ]);

  const counts = {
    enrollments: enrSnap.size,
    scores: scoreSnap.size,
    attendanceRecords: attSnap.size,
    dailyAttendanceRecords: dailyAttSnap.size,
    studentNotes: notesSnap.size,
  };

  const reasons: string[] = [];
  if (counts.enrollments > 0) reasons.push(`Terdaftar dalam ${counts.enrollments} rombongan belajar`);
  if (counts.scores > 0) reasons.push(`Memiliki ${counts.scores} data nilai asesmen`);
  if (counts.attendanceRecords > 0) reasons.push(`Memiliki ${counts.attendanceRecords} rekam presensi mapel`);
  if (counts.dailyAttendanceRecords > 0) reasons.push(`Memiliki ${counts.dailyAttendanceRecords} rekam presensi harian`);
  if (counts.studentNotes > 0) reasons.push(`Memiliki ${counts.studentNotes} catatan pembinaan siswa`);

  const isUsed = reasons.length > 0;
  return {
    isUsed,
    canDelete: !isUsed,
    reasons,
    counts,
  };
}

export async function updateStudent(
  uid: string, 
  id: string, 
  data: Partial<Student>
): Promise<void> {
  const docRef = doc(db, 'users', uid, 'students', id);
  const currentSnap = await getDoc(docRef);
  if (!currentSnap.exists()) {
    throw new Error('Data siswa tidak ditemukan.');
  }
  const currentData = currentSnap.data() as Student;

  // Validasi keunikan NISN jika diubah dan tidak kosong
  if (data.nisn !== undefined) {
    const cleanNisn = data.nisn.trim();
    if (cleanNisn && cleanNisn !== (currentData.nisn || '').trim()) {
      const check = await checkNisnAvailability(uid, cleanNisn, id);
      if (!check.isAvailable) {
        throw new Error(
          `NISN "${cleanNisn}" sudah terdaftar pada siswa "${check.conflictingStudent?.fullName || ''}". Koreksi NISN dibatalkan demi mencegah duplikasi data.`
        );
      }
    }
  }

  // Student Identity Governance:
  // studentId adalah immutable internal identity.
  // Koreksi nama dan NISN diperbolehkan tanpa memutus relasi transaksi akademik
  // karena seluruh transaksi (enrollment, nilai, presensi) terikat pada studentId.
  const cleanData: any = { ...data };
  if (cleanData.fullName) cleanData.fullName = cleanData.fullName.trim();
  if (cleanData.nis !== undefined) cleanData.nis = cleanData.nis.trim();
  if (cleanData.nisn !== undefined) cleanData.nisn = cleanData.nisn.trim();
  if (cleanData.nikSiswa !== undefined) cleanData.nikSiswa = cleanData.nikSiswa.trim();
  if (cleanData.nikIbu !== undefined) cleanData.nikIbu = cleanData.nikIbu.trim();
  if (cleanData.nkk !== undefined) cleanData.nkk = cleanData.nkk.trim();
  cleanData.updatedAt = serverTimestamp();

  await updateDoc(docRef, cleanData);
}

export async function archiveStudent(
  uid: string, 
  id: string, 
  status: 'INACTIVE' | 'GRADUATED' | 'TRANSFERRED' = 'INACTIVE'
): Promise<void> {
  const docRef = doc(db, 'users', uid, 'students', id);
  await updateDoc(docRef, {
    status,
    isArchived: true,
    archivedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

export async function unarchiveStudent(
  uid: string, 
  id: string
): Promise<void> {
  const docRef = doc(db, 'users', uid, 'students', id);
  await updateDoc(docRef, {
    status: 'ACTIVE',
    isArchived: false,
    archivedAt: null,
    updatedAt: serverTimestamp(),
  });
}

export async function canDeleteStudent(
  uid: string, 
  studentId: string
): Promise<{ canDelete: boolean; reason?: string; details?: StudentUsageSummary }> {
  const usage = await checkStudentUsage(uid, studentId);
  if (usage.isUsed) {
    return {
      canDelete: false,
      reason: `Siswa tidak dapat dihapus karena memiliki riwayat akademik: ${usage.reasons.join(', ')}. Silakan ubah status menjadi Lulus/Pindah/Nonaktif alih-alih menghapus data.`,
      details: usage,
    };
  }

  return { canDelete: true, details: usage };
}

export async function deleteStudent(uid: string, id: string): Promise<void> {
  const check = await canDeleteStudent(uid, id);
  if (!check.canDelete) {
    throw new Error(check.reason || 'Siswa memiliki rekam jejak akademik dan tidak dapat dihapus. Silakan nonaktifkan status siswa.');
  }

  const docRef = doc(db, 'users', uid, 'students', id);
  await deleteDoc(docRef);
}

export async function batchCreateStudents(
  uid: string,
  studentsList: Array<Omit<Student, 'id' | 'createdAt' | 'updatedAt'>>
): Promise<Student[]> {
  const results: Student[] = [];
  const colRef = collection(db, 'users', uid, 'students');
  const batch = writeBatch(db);
  const now = serverTimestamp();

  for (const item of studentsList) {
    const newDocRef = doc(colRef);
    const studentData = {
      nis: item.nis?.trim() || '',
      nisn: item.nisn?.trim() || '',
      fullName: item.fullName.trim(),
      gender: item.gender || 'L',
      birthPlace: item.birthPlace?.trim() || '',
      birthDate: item.birthDate?.trim() || '',
      phone: item.phone?.trim() || '',
      parentName: item.parentName?.trim() || '',
      parentPhone: item.parentPhone?.trim() || '',
      email: item.email?.trim() || '',
      religion: item.religion?.trim() || 'Islam',
      address: item.address?.trim() || '',
      notes: item.notes?.trim() || '',
      status: item.status || 'ACTIVE',
      nikSiswa: item.nikSiswa?.trim() || '',
      nikIbu: item.nikIbu?.trim() || '',
      nkk: item.nkk?.trim() || '',
      createdAt: now,
      updatedAt: now,
    };
    batch.set(newDocRef, studentData);
    results.push({ id: newDocRef.id, ...studentData } as Student);
  }

  await batch.commit();
  return results;
}

export interface ImportStudentItem extends Omit<Student, 'id' | 'createdAt' | 'updatedAt'> {
  rollNumber?: number;
  classId?: string;
  className?: string;
}

export interface ImportStudentResult {
  count: number;
  enrolledCount: number;
  createdCount: number;
  updatedCount: number;
}

export async function atomicImportStudentsWithEnrollment(
  uid: string,
  studentsList: ImportStudentItem[],
  enrollmentConfig?: {
    academicYearId: string;
    classId?: string;
    className?: string;
    academicYearLabel?: string;
    overwriteExisting?: boolean;
  }
): Promise<ImportStudentResult> {
  if (studentsList.length === 0) {
    return { count: 0, enrolledCount: 0, createdCount: 0, updatedCount: 0 };
  }

  const shouldOverwrite = enrollmentConfig?.overwriteExisting !== false; // Default: true (timpa/update data yang ada)

  // 1. Ambil data master siswa yang sudah ada di database untuk deteksi upsert / pencegahan duplikasi
  const existingStudents = await getStudents(uid);
  const existingByNis = new Map<string, Student>();
  const existingByNisn = new Map<string, Student>();
  const existingByName = new Map<string, Student[]>();

  existingStudents.forEach(s => {
    if (s.nis && s.nis.trim()) {
      existingByNis.set(s.nis.trim().toLowerCase(), s);
    }
    if (s.nisn && s.nisn.trim()) {
      existingByNisn.set(s.nisn.trim().toLowerCase(), s);
    }
    const normName = s.fullName.trim().toLowerCase().replace(/\s+/g, ' ');
    if (normName) {
      if (!existingByName.has(normName)) existingByName.set(normName, []);
      existingByName.get(normName)!.push(s);
    }
  });

  // 2. Ambil penempatan kelas (enrollment) yang sudah ada pada tahun ajaran ini
  const existingEnrollmentsMap = new Map<string, { id: string; rollNumber?: number }>();
  if (enrollmentConfig?.academicYearId) {
    const enrollmentsColRef = collection(db, 'users', uid, 'enrollments');
    const enrSnap = await getDocs(
      query(enrollmentsColRef, where('academicYearId', '==', enrollmentConfig.academicYearId))
    );
    enrSnap.docs.forEach(d => {
      const data = d.data() as any;
      const key = `${data.studentId}_${data.classId}`;
      existingEnrollmentsMap.set(key, { id: d.id, rollNumber: data.rollNumber });
    });
  }

  // 3. Hitung penomoran absen (rollNumber) per-kelas dengan menghormati urutan data berkas (A-Z)
  const rollCounters = new Map<string, number>();
  let enrolledCount = 0;

  const preparedList = studentsList.map((item, globalIdx) => {
    const targetClassId = item.classId || enrollmentConfig?.classId;
    const targetClassName = item.className || enrollmentConfig?.className || '';

    let assignedRollNumber = item.rollNumber;
    if (targetClassId) {
      enrolledCount++;
      if (!assignedRollNumber || assignedRollNumber <= 0) {
        const nextRoll = (rollCounters.get(targetClassId) || 0) + 1;
        rollCounters.set(targetClassId, nextRoll);
        assignedRollNumber = nextRoll;
      } else {
        const currentHighest = rollCounters.get(targetClassId) || 0;
        if (assignedRollNumber > currentHighest) {
          rollCounters.set(targetClassId, assignedRollNumber);
        }
      }
    } else {
      assignedRollNumber = assignedRollNumber && assignedRollNumber > 0 ? assignedRollNumber : globalIdx + 1;
    }

    return {
      ...item,
      targetClassId,
      targetClassName,
      assignedRollNumber,
    };
  });

  const studentsColRef = collection(db, 'users', uid, 'students');
  const enrollmentsColRef = collection(db, 'users', uid, 'enrollments');
  const now = serverTimestamp();

  type BatchTask =
    | { type: 'SET'; ref: any; data: any }
    | { type: 'UPDATE'; ref: any; data: any };

  const batchTasks: BatchTask[] = [];
  let createdCount = 0;
  let updatedCount = 0;

  // Lacak entitas yang baru dibuat di batch ini agar tidak bentrok jika file memiliki entri ganda internal
  const locallyCreatedNis = new Map<string, string>();
  const locallyCreatedNisn = new Map<string, string>();
  const locallyCreatedName = new Map<string, string>();

  for (const item of preparedList) {
    const cleanNis = item.nis?.trim().toLowerCase() || '';
    const cleanNisn = item.nisn?.trim().toLowerCase() || '';
    const normName = item.fullName.trim().toLowerCase().replace(/\s+/g, ' ');

    // Cari kandidat siswa yang sudah ada (Idempotent Matcher)
    let matchedStudent: Student | null = null;
    let matchedStudentId: string | null = null;

    if (cleanNis && existingByNis.has(cleanNis)) {
      matchedStudent = existingByNis.get(cleanNis)!;
      matchedStudentId = matchedStudent.id;
    } else if (cleanNisn && existingByNisn.has(cleanNisn)) {
      matchedStudent = existingByNisn.get(cleanNisn)!;
      matchedStudentId = matchedStudent.id;
    } else if (normName && existingByName.has(normName)) {
      const candidates = existingByName.get(normName)!;
      if (item.targetClassId) {
        // Cocokkan apakah salah satu kandidat sudah terdaftar di kelas target
        const enrolledCandidate = candidates.find(c =>
          existingEnrollmentsMap.has(`${c.id}_${item.targetClassId}`)
        );
        if (enrolledCandidate) {
          matchedStudent = enrolledCandidate;
          matchedStudentId = enrolledCandidate.id;
        } else if (candidates.length === 1) {
          matchedStudent = candidates[0];
          matchedStudentId = candidates[0].id;
        }
      } else if (candidates.length === 1) {
        matchedStudent = candidates[0];
        matchedStudentId = candidates[0].id;
      }
    } else if (cleanNis && locallyCreatedNis.has(cleanNis)) {
      matchedStudentId = locallyCreatedNis.get(cleanNis)!;
    } else if (cleanNisn && locallyCreatedNisn.has(cleanNisn)) {
      matchedStudentId = locallyCreatedNisn.get(cleanNisn)!;
    } else if (normName && locallyCreatedName.has(normName)) {
      matchedStudentId = locallyCreatedName.get(normName)!;
    }

    if (matchedStudentId) {
      // 1. SISWA SUDAH ADA
      if (shouldOverwrite) {
        updatedCount++;
        const studentDocRef = doc(studentsColRef, matchedStudentId);
        const updateData: Record<string, any> = {
          fullName: item.fullName.trim(),
          gender: item.gender || matchedStudent?.gender || 'L',
          updatedAt: now,
        };

        // Selalu timpa / perbarui dengan data dari file impor jika ada
        if (item.nis !== undefined && item.nis.trim() !== '') updateData.nis = item.nis.trim();
        if (item.nisn !== undefined && item.nisn.trim() !== '') updateData.nisn = item.nisn.trim();
        if (item.birthPlace !== undefined && item.birthPlace.trim() !== '') updateData.birthPlace = item.birthPlace.trim();
        if (item.birthDate !== undefined && item.birthDate.trim() !== '') updateData.birthDate = item.birthDate.trim();
        if (item.address !== undefined && item.address.trim() !== '') updateData.address = item.address.trim();
        if (item.parentName !== undefined && item.parentName.trim() !== '') updateData.parentName = item.parentName.trim();
        if (item.parentPhone !== undefined && item.parentPhone.trim() !== '') updateData.parentPhone = item.parentPhone.trim();
        if (item.phone !== undefined && item.phone.trim() !== '') updateData.phone = item.phone.trim();
        if (item.email !== undefined && item.email.trim() !== '') updateData.email = item.email.trim();
        if (item.religion !== undefined && item.religion.trim() !== '') updateData.religion = item.religion.trim();
        if (item.nikSiswa !== undefined && item.nikSiswa.trim() !== '') updateData.nikSiswa = item.nikSiswa.trim();
        if (item.nikIbu !== undefined && item.nikIbu.trim() !== '') updateData.nikIbu = item.nikIbu.trim();
        if (item.nkk !== undefined && item.nkk.trim() !== '') updateData.nkk = item.nkk.trim();

        batchTasks.push({ type: 'UPDATE', ref: studentDocRef, data: updateData });
      }

      // Penempatan kelas siswa yang sudah ada
      if (item.targetClassId && enrollmentConfig?.academicYearId) {
        const enrKey = `${matchedStudentId}_${item.targetClassId}`;
        const existingEnr = existingEnrollmentsMap.get(enrKey);

        if (existingEnr) {
          if (shouldOverwrite) {
            // Enrollment sudah ada -> Update roll number & status aktif
            const enrDocRef = doc(enrollmentsColRef, existingEnr.id);
            batchTasks.push({
              type: 'UPDATE',
              ref: enrDocRef,
              data: {
                rollNumber: item.assignedRollNumber,
                status: 'ACTIVE',
                updatedAt: now,
              },
            });
          }
        } else {
          // Belum terdaftar di kelas ini -> Tambah enrollment baru
          const newEnrDocRef = doc(enrollmentsColRef);
          const newEnrData = {
            academicYearId: enrollmentConfig.academicYearId,
            classId: item.targetClassId,
            studentId: matchedStudentId,
            rollNumber: item.assignedRollNumber,
            status: 'ACTIVE',
            className: item.targetClassName,
            academicYearLabel: enrollmentConfig.academicYearLabel || '',
            createdAt: now,
            updatedAt: now,
          };
          batchTasks.push({ type: 'SET', ref: newEnrDocRef, data: newEnrData });
          existingEnrollmentsMap.set(enrKey, { id: newEnrDocRef.id, rollNumber: item.assignedRollNumber });
        }
      }
    } else {
      // 2. SISWA BELUM ADA -> Buat dokumen baru (CREATE)
      createdCount++;
      const studentDocRef = doc(studentsColRef);
      matchedStudentId = studentDocRef.id;

      const studentData = {
        nis: item.nis?.trim() || '',
        nisn: item.nisn?.trim() || '',
        fullName: item.fullName.trim(),
        gender: item.gender || 'L',
        birthPlace: item.birthPlace?.trim() || '',
        birthDate: item.birthDate?.trim() || '',
        phone: item.phone?.trim() || '',
        parentName: item.parentName?.trim() || '',
        parentPhone: item.parentPhone?.trim() || '',
        email: item.email?.trim() || '',
        religion: item.religion?.trim() || 'Islam',
        address: item.address?.trim() || '',
        notes: item.notes?.trim() || 'Diimpor via Excel',
        status: item.status || 'ACTIVE',
        nikSiswa: item.nikSiswa?.trim() || '',
        nikIbu: item.nikIbu?.trim() || '',
        nkk: item.nkk?.trim() || '',
        createdAt: now,
        updatedAt: now,
      };

      batchTasks.push({ type: 'SET', ref: studentDocRef, data: studentData });

      if (cleanNis) locallyCreatedNis.set(cleanNis, matchedStudentId);
      if (cleanNisn) locallyCreatedNisn.set(cleanNisn, matchedStudentId);
      if (normName) locallyCreatedName.set(normName, matchedStudentId);

      // Pendaftaran kelas baru
      if (item.targetClassId && enrollmentConfig?.academicYearId) {
        const enrollmentDocRef = doc(enrollmentsColRef);
        const enrollmentData = {
          academicYearId: enrollmentConfig.academicYearId,
          classId: item.targetClassId,
          studentId: matchedStudentId,
          rollNumber: item.assignedRollNumber,
          status: 'ACTIVE',
          className: item.targetClassName,
          academicYearLabel: enrollmentConfig.academicYearLabel || '',
          createdAt: now,
          updatedAt: now,
        };
        batchTasks.push({ type: 'SET', ref: enrollmentDocRef, data: enrollmentData });
        existingEnrollmentsMap.set(`${matchedStudentId}_${item.targetClassId}`, {
          id: enrollmentDocRef.id,
          rollNumber: item.assignedRollNumber,
        });
      }
    }
  }

  // Eksekusi batch dalam batas Firestore (maksimal 300 tugas per batch)
  const CHUNK_SIZE = 300;
  for (let i = 0; i < batchTasks.length; i += CHUNK_SIZE) {
    const chunk = batchTasks.slice(i, i + CHUNK_SIZE);
    const batch = writeBatch(db);

    chunk.forEach(task => {
      if (task.type === 'SET') {
        batch.set(task.ref, task.data);
      } else if (task.type === 'UPDATE') {
        batch.update(task.ref, task.data);
      }
    });

    await batch.commit();
  }

  return {
    count: studentsList.length,
    enrolledCount,
    createdCount,
    updatedCount,
  };
}

