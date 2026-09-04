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

export async function createStudent(
  uid: string, 
  data: Omit<Student, 'id' | 'createdAt' | 'updatedAt'>
): Promise<Student> {
  const colRef = collection(db, 'users', uid, 'students');
  const now = serverTimestamp();
  const studentData = {
    nis: data.nis?.trim() || '',
    nisn: data.nisn?.trim() || '',
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

export async function updateStudent(
  uid: string, 
  id: string, 
  data: Partial<Student>
): Promise<void> {
  const docRef = doc(db, 'users', uid, 'students', id);
  await updateDoc(docRef, {
    ...data,
    updatedAt: serverTimestamp(),
  });
}

export async function archiveStudent(
  uid: string, 
  id: string, 
  status: 'INACTIVE' | 'GRADUATED' | 'TRANSFERRED' = 'INACTIVE'
): Promise<void> {
  const docRef = doc(db, 'users', uid, 'students', id);
  await updateDoc(docRef, {
    status,
    updatedAt: serverTimestamp(),
  });
}

export async function canDeleteStudent(
  uid: string, 
  studentId: string
): Promise<{ canDelete: boolean; reason?: string }> {
  // Check enrollments
  const enrSnap = await getDocs(
    query(collection(db, 'users', uid, 'enrollments'), where('studentId', '==', studentId))
  );
  if (!enrSnap.empty) {
    return {
      canDelete: false,
      reason: `Siswa terdaftar dalam ${enrSnap.size} rombongan belajar. Ubah status menjadi Lulus/Pindah/Nonaktif alih-alih menghapus.`
    };
  }

  // Check scores
  const scoreSnap = await getDocs(
    query(collection(db, 'users', uid, 'scores'), where('studentId', '==', studentId))
  );
  if (!scoreSnap.empty) {
    return {
      canDelete: false,
      reason: `Siswa memiliki ${scoreSnap.size} rekam nilai akademik. Arsipkan data siswa untuk menjaga keabsahan leger/rapor.`
    };
  }

  // Check subject attendance
  const attSnap = await getDocs(
    query(collection(db, 'users', uid, 'attendanceRecords'), where('studentId', '==', studentId))
  );
  if (!attSnap.empty) {
    return {
      canDelete: false,
      reason: `Siswa memiliki riwayat kehadiran mata pelajaran. Arsipkan data siswa untuk melindungi data presensi.`
    };
  }

  return { canDelete: true };
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
}

export async function atomicImportStudentsWithEnrollment(
  uid: string,
  studentsList: ImportStudentItem[],
  enrollmentConfig?: {
    academicYearId: string;
    classId: string;
    className: string;
    academicYearLabel: string;
  }
): Promise<{ count: number }> {
  if (studentsList.length === 0) return { count: 0 };

  const studentsColRef = collection(db, 'users', uid, 'students');
  const enrollmentsColRef = collection(db, 'users', uid, 'enrollments');
  const now = serverTimestamp();

  // Process in chunks of 200 (since 200 students + 200 enrollments = 400 operations, well within 500 limit)
  const chunkSize = 200;
  for (let i = 0; i < studentsList.length; i += chunkSize) {
    const chunk = studentsList.slice(i, i + chunkSize);
    const batch = writeBatch(db);

    chunk.forEach((item, index) => {
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

      if (enrollmentConfig && enrollmentConfig.classId && enrollmentConfig.academicYearId) {
        const enrollmentDocRef = doc(enrollmentsColRef);
        const enrollmentData = {
          academicYearId: enrollmentConfig.academicYearId,
          classId: enrollmentConfig.classId,
          studentId: studentDocRef.id,
          rollNumber: item.rollNumber || (i + index + 1),
          status: 'ACTIVE',
          className: enrollmentConfig.className || '',
          academicYearLabel: enrollmentConfig.academicYearLabel || '',
          createdAt: now,
          updatedAt: now,
        };
        batch.set(enrollmentDocRef, enrollmentData);
      }
    });

    await batch.commit();
  }

  return { count: studentsList.length };
}

