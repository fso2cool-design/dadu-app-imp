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
  runTransaction,
  limit,
  documentId
} from 'firebase/firestore';
import { db } from '../firebase/config';
import { Enrollment, Student } from '../../types';

export interface GetEnrollmentsOptions {
  status?: 'ACTIVE' | 'TRANSFERRED' | 'INACTIVE' | 'GRADUATED' | 'ALL';
}

/**
 * Mendapatkan daftar penempatan siswa dalam suatu kelas.
 * Default: hanya memuat siswa berstatus 'ACTIVE'.
 * Gunakan options: { status: 'ALL' } untuk melihat seluruh histori (termasuk mutasi/alumni).
 */
export async function getEnrollmentsByClass(
  uid: string, 
  academicYearId: string, 
  classId: string,
  options?: GetEnrollmentsOptions
): Promise<Enrollment[]> {
  const colRef = collection(db, 'users', uid, 'enrollments');
  const q = query(
    colRef, 
    where('academicYearId', '==', academicYearId),
    where('classId', '==', classId),
    orderBy('rollNumber', 'asc')
  );
  
  const snap = await getDocs(q);

  // Filter based on options.status early if requested (default: ACTIVE)
  const targetStatus = options?.status ?? 'ACTIVE';
  const filteredDocs = targetStatus === 'ALL'
    ? snap.docs
    : snap.docs.filter(d => (d.data() as any).status === targetStatus);

  // Collect unique valid studentIds
  const studentIdSet = new Set<string>();
  filteredDocs.forEach(d => {
    const sId = (d.data() as any).studentId;
    if (sId && typeof sId === 'string') {
      studentIdSet.add(sId);
    }
  });

  const studentIds = Array.from(studentIdSet);
  const studentMap = new Map<string, Student>();

  if (studentIds.length > 0) {
    const studentsColRef = collection(db, 'users', uid, 'students');
    // Firestore 'in' query limit is 30 items per batch
    const CHUNK_SIZE = 30;
    const chunks: string[][] = [];
    for (let i = 0; i < studentIds.length; i += CHUNK_SIZE) {
      chunks.push(studentIds.slice(i, i + CHUNK_SIZE));
    }

    const chunkResults = await Promise.all(
      chunks.map(chunk => {
        const studentQuery = query(
          studentsColRef,
          where(documentId(), 'in', chunk)
        );
        return getDocs(studentQuery);
      })
    );

    chunkResults.forEach(chunkSnap => {
      chunkSnap.docs.forEach(docSnap => {
        studentMap.set(docSnap.id, {
          id: docSnap.id,
          ...(docSnap.data() as any),
        } as Student);
      });
    });
  }

  const enrollments: Enrollment[] = filteredDocs.map(d => {
    const data = d.data() as any;
    return {
      id: d.id,
      ...data,
      student: studentMap.get(data.studentId),
    } as Enrollment;
  });

  return enrollments;
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

/**
 * Mendaftarkan siswa ke kelas dengan garansi satu penempatan aktif per tahun ajaran.
 * Mencegah duplikasi aktif pada kelas yang sama.
 */
export async function createEnrollment(
  uid: string,
  data: Omit<Enrollment, 'id' | 'createdAt' | 'updatedAt' | 'student'>
): Promise<Enrollment> {
  if (!data.academicYearId || !data.classId || !data.studentId) {
    throw new Error('Relasi penempatan siswa tidak lengkap (ID Tahun Ajaran, Kelas, atau Siswa kosong).');
  }

  const colRef = collection(db, 'users', uid, 'enrollments');
  const now = serverTimestamp();

  // Validasi kelas tujuan ada dan dalam tahun ajaran yang cocok
  const targetClassSnap = await getDoc(doc(db, 'users', uid, 'classes', data.classId));
  if (!targetClassSnap.exists()) {
    throw new Error('Kelas tujuan penempatan tidak ditemukan.');
  }
  const targetClassData = targetClassSnap.data();
  if (targetClassData.academicYearId !== data.academicYearId) {
    throw new Error('Kelas tujuan tidak berada dalam Tahun Ajaran yang dipilih.');
  }
  if (targetClassData.isArchived) {
    throw new Error('Tidak dapat menempatkan siswa pada kelas yang telah diarsipkan.');
  }

  // Validasi data siswa ada
  const studentSnap = await getDoc(doc(db, 'users', uid, 'students', data.studentId));
  if (!studentSnap.exists()) {
    throw new Error('Data siswa tidak ditemukan.');
  }
  const studentData = studentSnap.data() as Student;

  // Use deterministic ID {academicYearId}_{classId}_{studentId} for idempotency
  const deterministicId = `${data.academicYearId}_${data.classId}_${data.studentId}`;
  const newDocRef = doc(colRef, deterministicId);
  const enrollmentData = {
    academicYearId: data.academicYearId,
    classId: data.classId,
    studentId: data.studentId,
    rollNumber: Number(data.rollNumber) || 1,
    status: data.status || 'ACTIVE',
    className: targetClassData.name || data.className || '',
    academicYearLabel: data.academicYearLabel || '',
    createdAt: now,
    updatedAt: now,
  };

  // Enforce single active enrollment per student per academic year
  if (enrollmentData.status === 'ACTIVE') {
    const existingActiveQ = query(
      colRef,
      where('academicYearId', '==', data.academicYearId),
      where('studentId', '==', data.studentId),
      where('status', '==', 'ACTIVE')
    );
    const activeSnap = await getDocs(existingActiveQ);
    const batch = writeBatch(db);
    let hasUpdatedOld = false;

    for (const d of activeSnap.docs) {
      const activeData = d.data() as Enrollment;
      if (activeData.classId === data.classId) {
        // Mencegah duplikasi aktif di kelas yang sama
        throw new Error(`Siswa ${studentData.fullName} sudah terdaftar dan aktif di kelas ini (No. Absen #${activeData.rollNumber}).`);
      } else {
        // Tandai penempatan lama sebagai TRANSFERRED untuk menjaga histori akademik
        batch.update(d.ref, {
          status: 'TRANSFERRED',
          transferredAt: now,
          transferredToClassId: data.classId,
          transferredToClassName: targetClassData.name || data.className || '',
          transferReason: 'Dipindahkan ke kelas baru',
          updatedAt: now,
        });
        hasUpdatedOld = true;
      }
    }

    if (hasUpdatedOld && activeSnap.docs.length > 0) {
      const prev = activeSnap.docs[0].data() as Enrollment;
      (enrollmentData as any).transferredFromClassId = prev.classId;
      (enrollmentData as any).transferredFromClassName = prev.className || '';
      (enrollmentData as any).transferredAt = now;
      (enrollmentData as any).transferReason = 'Dipindahkan dari kelas sebelumnya';
    }

    batch.set(newDocRef, enrollmentData, { merge: true });
    await batch.commit();
  } else {
    await setDoc(newDocRef, enrollmentData, { merge: true });
  }

  return { id: newDocRef.id, ...enrollmentData } as Enrollment;
}

/**
 * Mutasi / Pindah kelas siswa dengan transaksi atomik (runTransaction).
 * - Menandai penempatan lama sebagai 'TRANSFERRED' dengan jejak waktu & kelas tujuan.
 * - Membuat penempatan baru berstatus 'ACTIVE' dengan jejak waktu & kelas asal.
 * - Tidak menghapus data lama untuk menjaga riwayat absensi dan nilai siswa.
 * - Memastikan kelas tujuan berada pada tahun ajaran yang sama.
 */
export async function transferStudentEnrollment(
  uid: string,
  currentEnrollmentId: string,
  targetClassId: string,
  targetClassName: string,
  newRollNumber: number,
  transferReason?: string
): Promise<Enrollment> {
  const currentDocRef = doc(db, 'users', uid, 'enrollments', currentEnrollmentId);
  const targetClassDocRef = doc(db, 'users', uid, 'classes', targetClassId);
  const colRef = collection(db, 'users', uid, 'enrollments');
  const now = serverTimestamp();

  return await runTransaction(db, async (transaction) => {
    // 1. ALL READS FIRST
    const currentDoc = await transaction.get(currentDocRef);
    if (!currentDoc.exists()) {
      throw new Error('Data penempatan kelas asal tidak ditemukan.');
    }
    const currentData = currentDoc.data() as Enrollment;

    if (currentData.status !== 'ACTIVE') {
      throw new Error('Hanya penempatan siswa berstatus AKTIF yang dapat dimutasi.');
    }

    if (currentData.classId === targetClassId) {
      throw new Error('Siswa sudah berada di kelas tujuan.');
    }

    const targetClassDoc = await transaction.get(targetClassDocRef);
    if (!targetClassDoc.exists()) {
      throw new Error('Kelas tujuan mutasi tidak ditemukan.');
    }
    const targetClassData = targetClassDoc.data();

    if (targetClassData.isArchived) {
      throw new Error('Tidak dapat memutasi siswa ke kelas yang telah diarsipkan.');
    }

    // Validasi keselarasan tahun ajaran (Tolak jika beda tahun ajaran)
    if (targetClassData.academicYearId !== currentData.academicYearId) {
      throw new Error('Mutasi gagal: Kelas tujuan tidak berada dalam tahun ajaran yang sama dengan rombel asal.');
    }

    // 2. ALL WRITES AFTER READS
    const reason = transferReason?.trim() || 'Mutasi rombel / penataan kelas';
    const effectiveTargetClassName = targetClassData.name || targetClassName || '';

    // Mark old active enrollment as TRANSFERRED to preserve academic history
    transaction.update(currentDocRef, {
      status: 'TRANSFERRED',
      transferredAt: now,
      transferredToClassId: targetClassId,
      transferredToClassName: effectiveTargetClassName,
      transferReason: reason,
      updatedAt: now,
    });

    // Create new ACTIVE enrollment in target class with deterministic ID
    const targetDocId = `${currentData.academicYearId}_${targetClassId}_${currentData.studentId}`;
    const newDocRef = doc(colRef, targetDocId);
    const newEnrollmentData = {
      academicYearId: currentData.academicYearId,
      classId: targetClassId,
      studentId: currentData.studentId,
      rollNumber: Number(newRollNumber) || 1,
      status: 'ACTIVE' as const,
      className: effectiveTargetClassName,
      academicYearLabel: currentData.academicYearLabel || '',
      transferredFromClassId: currentData.classId,
      transferredFromClassName: currentData.className || '',
      transferredAt: now,
      transferReason: reason,
      createdAt: now,
      updatedAt: now,
    };

    transaction.set(newDocRef, newEnrollmentData, { merge: true });

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
  const snap = await getDoc(docRef);
  if (!snap.exists()) {
    throw new Error('Data penempatan siswa tidak ditemukan.');
  }
  const existing = snap.data() as Enrollment;

  // Immutability checks:
  if (data.academicYearId && data.academicYearId !== existing.academicYearId) {
    throw new Error('Tahun ajaran pada penempatan siswa bersifat tetap dan tidak dapat diubah.');
  }

  if (data.classId && data.classId !== existing.classId) {
    throw new Error(
      'Perubahan kelas tidak dapat dilakukan melalui pembaruan langsung penempatan. Harap gunakan alur mutasi siswa (transferStudentEnrollment) untuk menjaga integritas riwayat akademik.'
    );
  }

  if (data.studentId && data.studentId !== existing.studentId) {
    if (!data.relinkedAt) {
      throw new Error('ID siswa pada penempatan bersifat tetap dan tidak dapat diubah kecuali melalui alur perbaikan relasi (relinkedAt).');
    }
  }

  // Validate status if provided
  const validStatuses = ['ACTIVE', 'INACTIVE', 'TRANSFERRED', 'GRADUATED', 'DROPOUT', 'ARCHIVED'];
  if (data.status && !validStatuses.includes(data.status)) {
    throw new Error(`Status penempatan '${data.status}' tidak valid.`);
  }

  // Build clean payload with only permitted mutable fields
  const payload: Record<string, any> = {
    updatedAt: serverTimestamp(),
  };

  if (data.rollNumber !== undefined) payload.rollNumber = Number(data.rollNumber) || 1;
  if (data.status !== undefined) payload.status = data.status;
  if (data.className !== undefined) payload.className = data.className;
  if (data.academicYearLabel !== undefined) payload.academicYearLabel = data.academicYearLabel;
  if (data.transferReason !== undefined) payload.transferReason = data.transferReason;
  if (data.relinkReason !== undefined) payload.relinkReason = data.relinkReason;
  if (data.relinkedAt !== undefined) {
    payload.relinkedAt = data.relinkedAt;
    if (data.studentId) payload.studentId = data.studentId;
  }

  await updateDoc(docRef, payload);
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

/**
 * Memeriksa apakah penempatan siswa aman untuk dihapus (hanya jika unused).
 * Menghalangi penghapusan jika ada rekam presensi, catatan siswa, atau nilai.
 */
export async function canDeleteEnrollment(
  uid: string, 
  enrollmentId: string
): Promise<{ canDelete: boolean; reason?: string }> {
  const enrDoc = await getDoc(doc(db, 'users', uid, 'enrollments', enrollmentId));
  if (!enrDoc.exists()) return { canDelete: true };
  const enr = enrDoc.data() as Enrollment;

  if (enr.status === 'TRANSFERRED') {
    return {
      canDelete: false,
      reason: 'Penempatan ini merupakan rekaman riwayat mutasi siswa dan dilindungi demi integritas histori akademik kelas.',
    };
  }

  // 1. Periksa presensi harian di kelas ini
  const dailySnap = await getDocs(
    query(
      collection(db, 'users', uid, 'dailyAttendanceRecords'),
      where('classId', '==', enr.classId),
      where('studentId', '==', enr.studentId),
      limit(1)
    )
  );
  if (!dailySnap.empty) {
    return {
      canDelete: false,
      reason: 'Siswa memiliki rekam presensi harian di kelas ini. Ubah status menjadi Pindah / Nonaktif alih-alih menghapus data.',
    };
  }

  // 2. Periksa catatan bimbingan / BK di kelas ini
  const notesSnap = await getDocs(
    query(
      collection(db, 'users', uid, 'studentNotes'),
      where('classId', '==', enr.classId),
      where('studentId', '==', enr.studentId),
      limit(1)
    )
  );
  if (!notesSnap.empty) {
    return {
      canDelete: false,
      reason: 'Siswa memiliki catatan pembinaan/BK di kelas ini. Ubah status menjadi Pindah / Nonaktif alih-alih menghapus data.',
    };
  }

  // 3. Periksa presensi tatap muka/KBM mapel
  const attSnap = await getDocs(
    query(
      collection(db, 'users', uid, 'attendanceRecords'),
      where('studentId', '==', enr.studentId),
      limit(1)
    )
  );
  if (!attSnap.empty) {
    return {
      canDelete: false,
      reason: 'Siswa memiliki rekam presensi pertemuan KBM. Data penempatan dilindungi demi integritas laporan kehadiran.',
    };
  }

  // 4. Periksa nilai asesmen
  const scoreSnap = await getDocs(
    query(
      collection(db, 'users', uid, 'scores'),
      where('studentId', '==', enr.studentId),
      limit(1)
    )
  );
  if (!scoreSnap.empty) {
    return {
      canDelete: false,
      reason: 'Siswa memiliki catatan nilai asesmen di sistem. Data penempatan dilindungi dari penghapusan.',
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

/**
 * Batch penempatan siswa (misal dari impor Excel).
 * - Mencegah duplikasi data siswa di dalam payload input yang sama.
 * - Memastikan keselarasan kelas dan tahun ajaran.
 * - Memperbarui enrollment yang sudah ada alih-alih membuat duplikat aktif.
 * - Menandai enrollment kelas lama sebagai TRANSFERRED jika dipindahkan.
 */
export async function batchEnrollStudents(
  uid: string,
  items: Array<Omit<Enrollment, 'id' | 'createdAt' | 'updatedAt' | 'student'>>
): Promise<void> {
  if (items.length === 0) return;
  const colRef = collection(db, 'users', uid, 'enrollments');
  const now = serverTimestamp();

  // 1. Deduplikasi dalam batch input berdasarkan studentId
  const uniqueItemsMap = new Map<string, Omit<Enrollment, 'id' | 'createdAt' | 'updatedAt' | 'student'>>();
  for (const item of items) {
    if (item.studentId) {
      uniqueItemsMap.set(item.studentId, item);
    }
  }
  const deduplicatedItems = Array.from(uniqueItemsMap.values());
  if (deduplicatedItems.length === 0) return;

  const academicYearId = deduplicatedItems[0].academicYearId;
  const targetClassId = deduplicatedItems[0].classId;

  // 2. Validasi kelas tujuan ada dan sesuai tahun ajaran
  const targetClassSnap = await getDoc(doc(db, 'users', uid, 'classes', targetClassId));
  if (!targetClassSnap.exists()) {
    throw new Error('Kelas tujuan tidak ditemukan.');
  }
  const targetClassData = targetClassSnap.data();
  if (targetClassData.academicYearId !== academicYearId) {
    throw new Error('Kelas tujuan tidak berada dalam Tahun Ajaran yang sesuai.');
  }
  if (targetClassData.isArchived) {
    throw new Error('Tidak dapat menempatkan siswa pada kelas yang telah diarsipkan.');
  }

  const aySnap = await getDoc(doc(db, 'users', uid, 'academicYears', academicYearId));
  if (aySnap.exists() && aySnap.data()?.isArchived) {
    throw new Error('Tidak dapat menempatkan siswa pada Tahun Ajaran yang telah diarsipkan (read-only).');
  }

  const studentIds = deduplicatedItems.map(i => i.studentId);

  // 3. Ambil seluruh penempatan aktif siswa-siswa ini pada tahun ajaran berjalan
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

  const existingMap = new Map<string, any>();
  existingActiveSnapDocs.forEach(d => {
    existingMap.set(d.data().studentId, d);
  });

  const batch = writeBatch(db);

  for (const item of deduplicatedItems) {
    const existingDoc = existingMap.get(item.studentId);
    if (existingDoc) {
      const existingData = existingDoc.data();
      if (existingData.classId === targetClassId) {
        // Sudah aktif di kelas yang sama: perbarui nomor absen jika berbeda, jangan buat duplikat
        if (existingData.rollNumber !== item.rollNumber) {
          batch.update(existingDoc.ref, {
            rollNumber: Number(item.rollNumber) || existingData.rollNumber,
            updatedAt: now,
          });
        }
        continue;
      } else {
        // Berpindah dari kelas lain di tahun ajaran yang sama: tandai lama sebagai TRANSFERRED
        batch.update(existingDoc.ref, {
          status: 'TRANSFERRED',
          transferredAt: now,
          transferredToClassId: targetClassId,
          transferredToClassName: targetClassData.name || item.className || '',
          transferReason: 'Impor / penempatan rombel baru',
          updatedAt: now,
        });

        const docId = `${item.academicYearId}_${item.classId}_${item.studentId}`;
        const docRef = doc(colRef, docId);
        batch.set(docRef, {
          academicYearId: item.academicYearId,
          classId: item.classId,
          studentId: item.studentId,
          rollNumber: Number(item.rollNumber) || 1,
          status: 'ACTIVE',
          className: targetClassData.name || item.className || '',
          academicYearLabel: item.academicYearLabel || '',
          transferredFromClassId: existingData.classId,
          transferredFromClassName: existingData.className || '',
          transferredAt: now,
          transferReason: 'Impor / penempatan rombel baru',
          createdAt: now,
          updatedAt: now,
        }, { merge: true });
        continue;
      }
    }

    // Penempatan baru dengan deterministic ID
    const docId = `${item.academicYearId}_${item.classId}_${item.studentId}`;
    const docRef = doc(colRef, docId);
    batch.set(docRef, {
      academicYearId: item.academicYearId,
      classId: item.classId,
      studentId: item.studentId,
      rollNumber: Number(item.rollNumber) || 1,
      status: item.status || 'ACTIVE',
      className: targetClassData.name || item.className || '',
      academicYearLabel: item.academicYearLabel || '',
      createdAt: now,
      updatedAt: now,
    }, { merge: true });
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

