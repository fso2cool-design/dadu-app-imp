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

export async function atomicImportStudentsWithEnrollment(
  uid: string,
  studentsList: ImportStudentItem[],
  enrollmentConfig?: {
    academicYearId: string;
    classId?: string;
    className?: string;
    academicYearLabel?: string;
  }
): Promise<{ count: number; enrolledCount: number }> {
  if (studentsList.length === 0) return { count: 0, enrolledCount: 0 };

  // 1. Validasi duplikasi NISN internal di dalam berkas impor
  const seenNisns = new Set<string>();
  for (const item of studentsList) {
    const cleanNisn = item.nisn?.trim();
    if (cleanNisn) {
      if (seenNisns.has(cleanNisn)) {
        throw new Error(`Terdapat duplikasi NISN "${cleanNisn}" di dalam berkas impor. Pastikan setiap siswa memiliki NISN unik.`);
      }
      seenNisns.add(cleanNisn);
    }
  }

  // 2. Validasi duplikasi NISN terhadap data master siswa yang sudah ada di database
  if (seenNisns.size > 0) {
    const existingStudents = await getStudents(uid);
    const existingNisnMap = new Map<string, Student>();
    existingStudents.forEach(s => {
      if (s.nisn && !s.isArchived) {
        existingNisnMap.set(s.nisn.trim(), s);
      }
    });

    for (const nisn of Array.from(seenNisns)) {
      if (existingNisnMap.has(nisn)) {
        const existing = existingNisnMap.get(nisn)!;
        throw new Error(
          `NISN "${nisn}" sudah terdaftar di database atas nama siswa "${existing.fullName}". Impor dibatalkan untuk mencegah data siswa ganda.`
        );
      }
    }
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
        // Update current highest counter if provided rollNumber is larger
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

  // Process in chunks of 200 (since 200 students + 200 enrollments = 400 operations, well within 500 limit)
  const chunkSize = 200;
  for (let i = 0; i < preparedList.length; i += chunkSize) {
    const chunk = preparedList.slice(i, i + chunkSize);
    const batch = writeBatch(db);

    chunk.forEach((item) => {
      const studentDocRef = doc(studentsColRef);
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
        createdAt: now,
        updatedAt: now,
      };
      batch.set(studentDocRef, studentData);

      if (item.targetClassId && enrollmentConfig?.academicYearId) {
        const enrollmentDocRef = doc(enrollmentsColRef);
        const enrollmentData = {
          academicYearId: enrollmentConfig.academicYearId,
          classId: item.targetClassId,
          studentId: studentDocRef.id,
          rollNumber: item.assignedRollNumber,
          status: 'ACTIVE',
          className: item.targetClassName,
          academicYearLabel: enrollmentConfig.academicYearLabel || '',
          createdAt: now,
          updatedAt: now,
        };
        batch.set(enrollmentDocRef, enrollmentData);
      }
    });

    await batch.commit();
  }

  return { count: studentsList.length, enrolledCount };
}

