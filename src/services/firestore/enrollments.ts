import { 
  collection, 
  doc, 
  getDocs, 
  getDoc,
  addDoc, 
  setDoc,
  updateDoc, 
  deleteDoc,
  query, 
  where, 
  orderBy, 
  serverTimestamp,
  writeBatch,
  runTransaction
} from 'firebase/firestore';
import { db } from '../firebase/config';
import { Enrollment, Student } from '../../types';
import { getStudents } from './students';

export async function getEnrollmentsByClass(
  uid: string, 
  academicYearId: string, 
  classId: string
): Promise<Enrollment[]> {
  const colRef = collection(db, 'users', uid, 'enrollments');
  const q = query(
    colRef, 
    where('academicYearId', '==', academicYearId),
    where('classId', '==', classId),
    orderBy('rollNumber', 'asc')
  );
  
  const [snap, allStudents] = await Promise.all([
    getDocs(q),
    getStudents(uid)
  ]);

  const studentMap = new Map<string, Student>();
  allStudents.forEach(s => studentMap.set(s.id, s));

  return snap.docs.map(d => {
    const data = d.data() as any;
    return {
      id: d.id,
      ...data,
      student: studentMap.get(data.studentId),
    } as Enrollment;
  });
}

export async function getEnrollmentsByAcademicYear(
  uid: string,
  academicYearId: string
): Promise<Enrollment[]> {
  const colRef = collection(db, 'users', uid, 'enrollments');
  const q = query(
    colRef,
    where('academicYearId', '==', academicYearId)
  );
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...(d.data() as any) } as Enrollment));
}

export async function createEnrollment(
  uid: string,
  data: Omit<Enrollment, 'id' | 'createdAt' | 'updatedAt' | 'student'>
): Promise<Enrollment> {
  if (!data.academicYearId || !data.classId || !data.studentId) {
    throw new Error('Relasi penempatan siswa tidak lengkap (ID Tahun Ajaran, Kelas, atau Siswa kosong).');
  }

  const colRef = collection(db, 'users', uid, 'enrollments');
  const now = serverTimestamp();
  const newDocRef = doc(colRef);

  const enrollmentData = {
    academicYearId: data.academicYearId,
    classId: data.classId,
    studentId: data.studentId,
    rollNumber: Number(data.rollNumber) || 1,
    status: data.status || 'ACTIVE',
    className: data.className || '',
    academicYearLabel: data.academicYearLabel || '',
    createdAt: now,
    updatedAt: now,
  };

  // Enforce single active enrollment per student per academic year via atomic batch
  if (enrollmentData.status === 'ACTIVE') {
    const existingActiveQ = query(
      colRef,
      where('academicYearId', '==', data.academicYearId),
      where('studentId', '==', data.studentId),
      where('status', '==', 'ACTIVE')
    );
    const activeSnap = await getDocs(existingActiveQ);
    const batch = writeBatch(db);

    for (const d of activeSnap.docs) {
      if (d.data().classId !== data.classId) {
        // Mark previous class enrollment as TRANSFERRED to preserve academic history
        batch.update(d.ref, {
          status: 'TRANSFERRED',
          updatedAt: now,
        });
      }
    }
    batch.set(newDocRef, enrollmentData);
    await batch.commit();
  } else {
    await setDoc(newDocRef, enrollmentData);
  }

  return { id: newDocRef.id, ...enrollmentData } as Enrollment;
}

/**
 * Mutasi / Pindah kelas siswa dengan transaksi atomik.
 * Menandai penempatan lama sebagai 'TRANSFERRED' dan membuat penempatan baru 'ACTIVE'.
 * Tidak menghapus data lama untuk menjaga riwayat akademik.
 */
export async function transferStudentEnrollment(
  uid: string,
  currentEnrollmentId: string,
  targetClassId: string,
  targetClassName: string,
  newRollNumber: number
): Promise<Enrollment> {
  const currentDocRef = doc(db, 'users', uid, 'enrollments', currentEnrollmentId);
  const colRef = collection(db, 'users', uid, 'enrollments');
  const now = serverTimestamp();

  return await runTransaction(db, async (transaction) => {
    const currentDoc = await transaction.get(currentDocRef);
    if (!currentDoc.exists()) {
      throw new Error('Data penempatan kelas asal tidak ditemukan.');
    }
    const currentData = currentDoc.data() as Enrollment;
    if (currentData.classId === targetClassId) {
      throw new Error('Siswa sudah berada di kelas tujuan.');
    }
    if (currentData.status !== 'ACTIVE') {
      throw new Error('Hanya penempatan siswa berstatus AKTIF yang dapat dimutasi.');
    }

    // Atomically mark old active enrollment as TRANSFERRED to preserve academic history
    transaction.update(currentDocRef, {
      status: 'TRANSFERRED',
      updatedAt: now,
    });

    // Create new ACTIVE enrollment in target class
    const newDocRef = doc(colRef);
    const newEnrollmentData = {
      academicYearId: currentData.academicYearId,
      classId: targetClassId,
      studentId: currentData.studentId,
      rollNumber: Number(newRollNumber) || 1,
      status: 'ACTIVE',
      className: targetClassName || '',
      academicYearLabel: currentData.academicYearLabel || '',
      createdAt: now,
      updatedAt: now,
    };

    transaction.set(newDocRef, newEnrollmentData);

    return {
      id: newDocRef.id,
      ...newEnrollmentData,
    } as Enrollment;
  });
}

export async function updateEnrollment(
  uid: string,
  id: string,
  data: Partial<Enrollment>
): Promise<void> {
  const docRef = doc(db, 'users', uid, 'enrollments', id);
  await updateDoc(docRef, {
    ...data,
    updatedAt: serverTimestamp(),
  });
}

export async function archiveEnrollment(
  uid: string, 
  id: string, 
  status: 'INACTIVE' | 'TRANSFERRED' | 'GRADUATED' = 'INACTIVE'
): Promise<void> {
  const docRef = doc(db, 'users', uid, 'enrollments', id);
  await updateDoc(docRef, {
    status,
    updatedAt: serverTimestamp(),
  });
}

export async function canDeleteEnrollment(
  uid: string, 
  enrollmentId: string
): Promise<{ canDelete: boolean; reason?: string }> {
  const enrDoc = await getDoc(doc(db, 'users', uid, 'enrollments', enrollmentId));
  if (!enrDoc.exists()) return { canDelete: true };
  const enr = enrDoc.data() as Enrollment;

  // Check if student has daily attendance records in this class
  const attSnap = await getDocs(
    query(
      collection(db, 'users', uid, 'dailyAttendanceRecords'),
      where('classId', '==', enr.classId),
      where('studentId', '==', enr.studentId)
    )
  );
  if (!attSnap.empty) {
    return {
      canDelete: false,
      reason: `Siswa memiliki ${attSnap.size} rekam presensi kelas ini. Ubah status menjadi Pindah/Nonaktif alih-alih menghapus.`
    };
  }

  return { canDelete: true };
}

export async function deleteEnrollment(uid: string, id: string): Promise<void> {
  const check = await canDeleteEnrollment(uid, id);
  if (!check.canDelete) {
    throw new Error(check.reason || 'Penempatan siswa memiliki riwayat akademik dan tidak dapat dihapus. Silakan arsipkan/nonaktifkan.');
  }
  const docRef = doc(db, 'users', uid, 'enrollments', id);
  await deleteDoc(docRef);
}

export async function batchEnrollStudents(
  uid: string,
  items: Array<Omit<Enrollment, 'id' | 'createdAt' | 'updatedAt' | 'student'>>
): Promise<void> {
  if (items.length === 0) return;
  const colRef = collection(db, 'users', uid, 'enrollments');
  const now = serverTimestamp();

  // Find existing active enrollments for these students in this academic year
  const academicYearId = items[0].academicYearId;
  const studentIds = items.map(i => i.studentId);

  // Query in chunks of 30 for studentIds
  const existingActiveSnapDocs: any[] = [];
  for (let i = 0; i < studentIds.length; i += 30) {
    const chunk = studentIds.slice(i, i + 30);
    const q = query(
      colRef,
      where('academicYearId', '==', academicYearId),
      where('studentId', 'in', chunk),
      where('status', '==', 'ACTIVE')
    );
    const snap = await getDocs(q);
    existingActiveSnapDocs.push(...snap.docs);
  }

  const batch = writeBatch(db);

  // Deactivate prior active enrollments if class differs
  for (const docSnap of existingActiveSnapDocs) {
    const d = docSnap.data();
    const targetItem = items.find(it => it.studentId === d.studentId);
    if (targetItem && targetItem.classId !== d.classId) {
      batch.update(docSnap.ref, {
        status: 'TRANSFERRED',
        updatedAt: now,
      });
    }
  }

  for (const item of items) {
    const docRef = doc(colRef);
    batch.set(docRef, {
      academicYearId: item.academicYearId,
      classId: item.classId,
      studentId: item.studentId,
      rollNumber: Number(item.rollNumber),
      status: item.status || 'ACTIVE',
      className: item.className || '',
      academicYearLabel: item.academicYearLabel || '',
      createdAt: now,
      updatedAt: now,
    });
  }

  await batch.commit();
}

export async function batchReorderRollNumbers(
  uid: string,
  orderedEnrollmentIds: string[]
): Promise<void> {
  const batch = writeBatch(db);
  const now = serverTimestamp();

  orderedEnrollmentIds.forEach((id, index) => {
    const docRef = doc(db, 'users', uid, 'enrollments', id);
    batch.update(docRef, {
      rollNumber: index + 1,
      updatedAt: now,
    });
  });

  await batch.commit();
}
