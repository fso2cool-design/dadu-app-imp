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
  writeBatch,
  runTransaction
} from 'firebase/firestore';
import { db } from '../firebase/config';
import { Meeting, SemesterType, AttendanceSummary } from '../../types';
import { getMeetingSlotId, getMeetingDateSlotId, isValidMeetingNumber } from '../../domain/academic/meetingPolicy';
import { getTodayISO } from '../../utils/date';
import { trackSync } from '../../utils/syncEvents';

/**
 * Menghasilkan ID dokumen deterministik untuk reservasi nomor pertemuan.
 * Format: slot_{teachingAssignmentId}_{semester}_{meetingNumber}
 */
export { getMeetingSlotId, getMeetingDateSlotId } from '../../domain/academic/meetingPolicy';

/**
 * Filter options for querying meetings.
 */
export interface MeetingFilterOptions {
  academicYearId?: string;
  semester?: SemesterType;
  teachingAssignmentId?: string;
  classId?: string;
}

/**
 * Mengambil daftar jurnal pertemuan mengajar guru berdasar filter akademik.
 * Memanfaatkan composite index bila tersedia, dengan fallback ke sort in-memory.
 *
 * @param uid - ID Pengguna (guru) pemilik data.
 * @param options - Opsi penyaringan (teachingAssignmentId, semester, academicYearId, classId).
 * @returns Array objek Meeting yang telah diurutkan berdasarkan meetingNumber asc.
 */
export async function getMeetings(
  uid: string, 
  options?: MeetingFilterOptions
): Promise<Meeting[]> {
  const colRef = collection(db, 'users', uid, 'meetings');
  let q = query(colRef, orderBy('meetingNumber', 'asc'));

  try {
    if (options?.teachingAssignmentId && options?.semester) {
      q = query(
        colRef, 
        where('teachingAssignmentId', '==', options.teachingAssignmentId),
        where('semester', '==', options.semester),
        orderBy('meetingNumber', 'asc')
      );
    } else if (options?.teachingAssignmentId) {
      q = query(colRef, where('teachingAssignmentId', '==', options.teachingAssignmentId), orderBy('meetingNumber', 'asc'));
    } else if (options?.academicYearId && options?.semester) {
      q = query(
        colRef, 
        where('academicYearId', '==', options.academicYearId),
        where('semester', '==', options.semester),
        orderBy('meetingNumber', 'asc')
      );
    } else if (options?.academicYearId) {
      q = query(colRef, where('academicYearId', '==', options.academicYearId), orderBy('meetingNumber', 'asc'));
    }

    const snap = await getDocs(q);
    let results = snap.docs.map(d => ({ id: d.id, ...(d.data() as any) } as Meeting));

    if (options?.classId) {
      results = results.filter(m => m.classId === options.classId);
    }

    return results;
  } catch (err) {
    // Fallback: in case composite index is still building, query by teachingAssignmentId and sort in-memory
    console.warn('Index query notice, falling back to base filter:', err);
    let fallbackQuery = query(colRef);
    if (options?.teachingAssignmentId) {
      fallbackQuery = query(colRef, where('teachingAssignmentId', '==', options.teachingAssignmentId));
    } else if (options?.academicYearId) {
      fallbackQuery = query(colRef, where('academicYearId', '==', options.academicYearId));
    }
    const snap = await getDocs(fallbackQuery);
    let results = snap.docs.map(d => ({ id: d.id, ...(d.data() as any) } as Meeting));
    
    if (options?.semester) {
      results = results.filter(m => m.semester === options.semester);
    }
    if (options?.classId) {
      results = results.filter(m => m.classId === options.classId);
    }
    return results.sort((a, b) => (a.meetingNumber || 0) - (b.meetingNumber || 0));
  }
}

/**
 * Mengambil satu dokumen jurnal pertemuan berdasarkan ID uniknya.
 *
 * @param uid - ID Pengguna (guru).
 * @param meetingId - ID dokumen pertemuan yang dicari.
 * @returns Objek Meeting jika ditemukan, atau null jika tidak ada.
 */
export async function getMeetingById(uid: string, meetingId: string): Promise<Meeting | null> {
  const docRef = doc(db, 'users', uid, 'meetings', meetingId);
  const snap = await getDoc(docRef);
  if (!snap.exists()) return null;
  return { id: snap.id, ...(snap.data() as any) } as Meeting;
}

/**
 * Membuat entri jurnal pertemuan baru secara atomik dengan kunci deterministik.
 * Melakukan validasi relasi akademik, integritas status tahun ajaran, dan mencegah tabrakan konkurensi.
 *
 * @param uid - ID Pengguna (guru).
 * @param data - Payload data pertemuan baru tanpa field id dan timestamps.
 * @returns Objek Meeting yang berhasil disimpan ke Firestore.
 * @throws Error jika relasi akademik tidak lengkap atau tahun ajaran diarsipkan.
 */
export async function createMeeting(
  uid: string, 
  data: Omit<Meeting, 'id' | 'createdAt' | 'updatedAt'>
): Promise<Meeting> {
  // 1. Validate semantic relationship integrity
  if (!data.teachingAssignmentId || !data.classId || !data.subjectId || !data.academicYearId || !data.semester) {
    throw new Error('Relasi akademik tidak lengkap: ID Tugas Mengajar, Kelas, Mapel, Tahun Ajaran, dan Semester wajib diisi.');
  }

  // 2. Active Academic Year & Entity Governance
  const ayDoc = await getDoc(doc(db, 'users', uid, 'academicYears', data.academicYearId));
  if (!ayDoc.exists()) {
    throw new Error('Tahun ajaran tidak ditemukan.');
  }
  const ayData = ayDoc.data();
  if (ayData?.isArchived || ayData?.isActive === false) {
    throw new Error('Tidak dapat membuat jurnal pertemuan pada Tahun Ajaran yang tidak aktif atau telah diarsipkan.');
  }

  const taDocRef = doc(db, 'users', uid, 'teachingAssignments', data.teachingAssignmentId);
  const taDoc = await getDoc(taDocRef);
  if (!taDoc.exists()) {
    throw new Error('Penugasan mengajar tidak ditemukan.');
  }
  const taData = taDoc.data();
  if (taData?.isArchived) {
    throw new Error('Penugasan mengajar ini telah diarsipkan dan tidak dapat menerima pertemuan KBM baru.');
  }
  if (taData?.isActive === false) {
    throw new Error('Penugasan mengajar ini tidak aktif dan tidak dapat menerima pertemuan KBM baru.');
  }
  if (!taData?.academicYearId || taData.academicYearId !== data.academicYearId) {
    throw new Error('Relasi tidak konsisten: Tahun ajaran tugas mengajar tidak sesuai dengan tahun ajaran pertemuan.');
  }
  if (!taData?.semester || taData.semester !== data.semester) {
    throw new Error(`Relasi tidak konsisten: Semester tugas mengajar (${taData?.semester || 'tidak terdefinisi'}) tidak sesuai dengan semester pertemuan (${data.semester}).`);
  }
  if (!taData?.classId || taData.classId !== data.classId) {
    throw new Error('Relasi tidak konsisten: Kelas tugas mengajar tidak sesuai dengan kelas pertemuan.');
  }
  if (!taData?.subjectId || taData.subjectId !== data.subjectId) {
    throw new Error('Relasi tidak konsisten: Mata pelajaran tugas mengajar tidak sesuai dengan mata pelajaran pertemuan.');
  }

  const classDoc = await getDoc(doc(db, 'users', uid, 'classes', data.classId));
  if (!classDoc.exists()) {
    throw new Error('Kelas tidak ditemukan.');
  }
  const classData = classDoc.data();
  if (classData?.isArchived) {
    throw new Error('Kelas telah diarsipkan.');
  }
  if (classData?.academicYearId && classData.academicYearId !== data.academicYearId) {
    throw new Error('Relasi tidak konsisten: Kelas terdaftar pada tahun ajaran yang berbeda.');
  }

  const colRef = collection(db, 'users', uid, 'meetings');
  const meetingNumber = Number(data.meetingNumber);
  if (!isValidMeetingNumber(meetingNumber)) {
    throw new Error('Nomor pertemuan harus berupa bilangan bulat positif (minimal 1).');
  }

  const targetDate = data.date || getTodayISO();

  // 3. Pre-flight check for duplicate legacy meetings
  const duplicateQ = query(
    colRef,
    where('teachingAssignmentId', '==', data.teachingAssignmentId),
    where('semester', '==', data.semester),
    where('meetingNumber', '==', meetingNumber)
  );
  const dupSnap = await getDocs(duplicateQ);
  if (!dupSnap.empty) {
    throw new Error(`Pertemuan ke-${meetingNumber} untuk kelas dan mata pelajaran ini pada ${data.semester} sudah ada dalam jurnal.`);
  }

  const duplicateDateQ = query(
    colRef,
    where('teachingAssignmentId', '==', data.teachingAssignmentId),
    where('semester', '==', data.semester),
    where('date', '==', targetDate)
  );
  const dupDateSnap = await getDocs(duplicateDateQ);
  if (!dupDateSnap.empty) {
    throw new Error(`Pertemuan pada tanggal ${targetDate} untuk kelas dan mata pelajaran ini pada ${data.semester} sudah ada dalam jurnal.`);
  }

  // 4. Generate stable document ID independent of meetingNumber
  const meetingDocRef = doc(colRef);
  const slotId = getMeetingSlotId(data.teachingAssignmentId, data.semester, meetingNumber);
  const slotDocRef = doc(db, 'users', uid, 'meetingSlots', slotId);
  const dateSlotId = getMeetingDateSlotId(data.teachingAssignmentId, data.semester, targetDate);
  const dateSlotDocRef = doc(db, 'users', uid, 'meetingDateSlots', dateSlotId);
  const legacyDeterministicDocRef = doc(colRef, `${data.teachingAssignmentId}_${data.semester}_${meetingNumber}`);

  const now = serverTimestamp();
  
  const meetingData = {
    academicYearId: data.academicYearId,
    semester: data.semester,
    teachingAssignmentId: data.teachingAssignmentId,
    classId: data.classId,
    subjectId: data.subjectId,
    date: targetDate,
    timeSlot: data.timeSlot?.trim() || '',
    meetingNumber,
    topic: data.topic.trim(),
    learningObjectives: data.learningObjectives?.trim() || '',
    activities: data.activities?.trim() || '',
    method: data.method?.trim() || '',
    notes: data.notes?.trim() || '',
    status: data.status || 'COMPLETED',
    className: data.className || '',
    subjectName: data.subjectName || '',
    subjectCode: data.subjectCode || '',
    attendanceSummary: data.attendanceSummary || null,
    createdAt: now,
    updatedAt: now,
  };

  // 5. Run atomic transaction for slot reservation and meeting creation
  await runTransaction(db, async (transaction) => {
    // Re-verify teaching assignment within transaction to guard against concurrent race conditions
    const taTxSnap = await transaction.get(taDocRef);
    if (!taTxSnap.exists()) {
      throw new Error('Penugasan mengajar tidak ditemukan.');
    }
    const taDataTx = taTxSnap.data();
    if (taDataTx?.isArchived) {
      throw new Error('Penugasan mengajar ini telah diarsipkan dan tidak dapat menerima pertemuan KBM baru.');
    }
    if (taDataTx?.isActive === false) {
      throw new Error('Penugasan mengajar ini tidak aktif dan tidak dapat menerima pertemuan KBM baru.');
    }
    if (!taDataTx?.academicYearId || taDataTx.academicYearId !== data.academicYearId) {
      throw new Error('Relasi tidak konsisten: Tahun ajaran tugas mengajar tidak sesuai dengan tahun ajaran pertemuan.');
    }
    if (!taDataTx?.semester || taDataTx.semester !== data.semester) {
      throw new Error(`Relasi tidak konsisten: Semester tugas mengajar (${taDataTx?.semester || 'tidak terdefinisi'}) tidak sesuai dengan semester pertemuan (${data.semester}).`);
    }
    if (!taDataTx?.classId || taDataTx.classId !== data.classId) {
      throw new Error('Relasi tidak konsisten: Kelas tugas mengajar tidak sesuai dengan kelas pertemuan.');
    }
    if (!taDataTx?.subjectId || taDataTx.subjectId !== data.subjectId) {
      throw new Error('Relasi tidak konsisten: Mata pelajaran tugas mengajar tidak sesuai dengan mata pelajaran pertemuan.');
    }

    // Check slot document reservation
    const slotSnap = await transaction.get(slotDocRef);
    if (slotSnap.exists()) {
      throw new Error(`Pertemuan ke-${meetingNumber} untuk kelas dan mata pelajaran ini pada ${data.semester} sudah ada dalam jurnal.`);
    }

    // Check date slot document reservation
    const dateSlotSnap = await transaction.get(dateSlotDocRef);
    if (dateSlotSnap.exists()) {
      throw new Error(`Pertemuan pada tanggal ${targetDate} untuk kelas dan mata pelajaran ini pada ${data.semester} sudah ada dalam jurnal.`);
    }

    // Check legacy deterministic document ID
    const legacySnap = await transaction.get(legacyDeterministicDocRef);
    if (legacySnap.exists()) {
      const legData = legacySnap.data() as Meeting;
      if (legData?.meetingNumber === meetingNumber) {
        throw new Error(`Pertemuan ke-${meetingNumber} untuk kelas dan mata pelajaran ini pada ${data.semester} sudah ada dalam jurnal.`);
      }
    }

    transaction.set(meetingDocRef, meetingData);
    transaction.set(slotDocRef, {
      meetingId: meetingDocRef.id,
      teachingAssignmentId: data.teachingAssignmentId,
      semester: data.semester,
      meetingNumber,
      createdAt: now,
      updatedAt: now,
    });
    transaction.set(dateSlotDocRef, {
      meetingId: meetingDocRef.id,
      teachingAssignmentId: data.teachingAssignmentId,
      semester: data.semester,
      date: targetDate,
      createdAt: now,
      updatedAt: now,
    });
  });

  return { id: meetingDocRef.id, ...meetingData } as Meeting;
}

/**
 * Memperbarui atribut jurnal pertemuan yang dapat diedit (topic, objectives, activities, dll).
 * Mengamankan field struktural (academicYearId, semester, classId, subjectId, meetingNumber) agar tetap immutable.
 *
 * @param uid - ID Pengguna (guru).
 * @param id - ID dokumen pertemuan yang akan diperbarui.
 * @param data - Atribut pertemuan yang akan diubah.
 * @throws Error jika dokumen tidak ditemukan atau tahun ajaran telah diarsipkan.
 */
export async function updateMeeting(
  uid: string, 
  id: string, 
  data: Partial<Meeting>
): Promise<void> {
  const docRef = doc(db, 'users', uid, 'meetings', id);
  const snap = await getDoc(docRef);
  if (!snap.exists()) {
    throw new Error('Jurnal pertemuan tidak ditemukan.');
  }
  const existingData = snap.data() as Meeting;

  // 1. Check if academic year is archived (Historical Read-Only Protection)
  if (existingData.academicYearId) {
    const ayDoc = await getDoc(doc(db, 'users', uid, 'academicYears', existingData.academicYearId));
    if (ayDoc.exists() && ayDoc.data()?.isArchived) {
      throw new Error('Jurnal pertemuan ini berada pada Tahun Ajaran yang telah diarsipkan dan bersifat historis (read-only).');
    }
  }

  // 2. Reject date changes if any attendance records remain linked to this meeting
  if (data.date !== undefined && data.date !== existingData.date) {
    if (existingData.attendanceSummary !== null && existingData.attendanceSummary !== undefined) {
      throw new Error('Tanggal jurnal tidak dapat diubah karena masih terhubung dengan presensi siswa. Lepaskan tautan presensi dan simpan terlebih dahulu untuk mengubah tanggal.');
    }

    const attColRef = collection(db, 'users', uid, 'attendanceRecords');
    const attQ = query(attColRef, where('meetingId', '==', id));
    const attSnap = await getDocs(attQ);
    if (!attSnap.empty) {
      throw new Error('Tanggal jurnal tidak dapat diubah karena masih terhubung dengan presensi siswa. Lepaskan tautan presensi dan simpan terlebih dahulu untuk mengubah tanggal.');
    }

    const colRef = collection(db, 'users', uid, 'meetings');
    const duplicateDateQ = query(
      colRef,
      where('teachingAssignmentId', '==', existingData.teachingAssignmentId),
      where('semester', '==', existingData.semester),
      where('date', '==', data.date)
    );
    const dupDateSnap = await getDocs(duplicateDateQ);
    if (!dupDateSnap.empty && dupDateSnap.docs.some(d => d.id !== id)) {
      throw new Error(`Pertemuan pada tanggal ${data.date} untuk kelas dan mata pelajaran ini pada ${existingData.semester} sudah ada dalam jurnal.`);
    }
  }

  // 3. Meeting number validation & pre-flight duplicate check
  let targetNumber: number | undefined = undefined;
  if (data.meetingNumber !== undefined) {
    targetNumber = Number(data.meetingNumber);
    if (!isValidMeetingNumber(targetNumber)) {
      throw new Error('Nomor pertemuan harus berupa bilangan bulat positif (minimal 1).');
    }

    if (targetNumber !== existingData.meetingNumber) {
      const colRef = collection(db, 'users', uid, 'meetings');
      const duplicateQ = query(
        colRef,
        where('teachingAssignmentId', '==', existingData.teachingAssignmentId),
        where('semester', '==', existingData.semester),
        where('meetingNumber', '==', targetNumber)
      );
      const dupSnap = await getDocs(duplicateQ);
      if (!dupSnap.empty && dupSnap.docs.some(d => d.id !== id)) {
        throw new Error(`Pertemuan ke-${targetNumber} untuk kelas dan mata pelajaran ini pada ${existingData.semester} sudah ada dalam jurnal.`);
      }
    }
  }

  // 4. Strict Edit Governance:
  // Fields that are strictly IMMUTABLE on update:
  // - academicYearId, semester, teachingAssignmentId, classId, subjectId
  const identityFields: Array<{ key: keyof Meeting; name: string }> = [
    { key: 'semester', name: 'Semester' },
    { key: 'teachingAssignmentId', name: 'Tugas mengajar' },
    { key: 'academicYearId', name: 'Tahun ajaran' },
    { key: 'classId', name: 'Kelas' },
    { key: 'subjectId', name: 'Mata pelajaran' },
  ];

  for (const { key, name } of identityFields) {
    const val = data[key];
    if (val !== undefined) {
      if (typeof val !== 'string' || !val.trim() || val !== existingData[key]) {
        throw new Error(`Relasi tidak konsisten: ${name} pertemuan tidak dapat diubah.`);
      }
    }
  }

  // meetingNumber is mutable ordinal governed by reservation protocol.
  const {
    academicYearId,
    semester,
    teachingAssignmentId,
    classId,
    subjectId,
    meetingNumber: _ignoredNumber,
    ...safeEditableData
  } = data;

  return trackSync((async () => {
    await runTransaction(db, async (transaction) => {
      const freshSnap = await transaction.get(docRef);
      if (!freshSnap.exists()) {
        throw new Error('Jurnal pertemuan tidak ditemukan.');
      }
      const freshData = freshSnap.data() as Meeting;

      // In-transaction guard: If date is changing, ensure no attendance was attached concurrently
      const isDateChanging = data.date !== undefined && data.date !== freshData.date;
      if (isDateChanging) {
        if (freshData.attendanceSummary !== null && freshData.attendanceSummary !== undefined) {
          throw new Error('Tanggal jurnal tidak dapat diubah karena masih terhubung dengan presensi siswa. Lepaskan tautan presensi dan simpan terlebih dahulu untuk mengubah tanggal.');
        }
      }

      let targetDateSlotRef: any = null;
      let oldDateSlotRef: any = null;
      let shouldDeleteOldDateSlot = false;

      if (isDateChanging && data.date) {
        const targetDate = data.date;
        const targetDateSlotId = getMeetingDateSlotId(freshData.teachingAssignmentId, freshData.semester, targetDate);
        targetDateSlotRef = doc(db, 'users', uid, 'meetingDateSlots', targetDateSlotId);
        const targetDateSlotSnap = await transaction.get(targetDateSlotRef);
        if (targetDateSlotSnap.exists()) {
          const slotData = targetDateSlotSnap.data() as any;
          if (slotData?.meetingId !== id) {
            throw new Error(`Pertemuan pada tanggal ${targetDate} untuk kelas dan mata pelajaran ini pada ${freshData.semester} sudah ada dalam jurnal.`);
          }
        }

        if (freshData.date) {
          const oldDateSlotId = getMeetingDateSlotId(freshData.teachingAssignmentId, freshData.semester, freshData.date);
          oldDateSlotRef = doc(db, 'users', uid, 'meetingDateSlots', oldDateSlotId);
          const oldDateSlotSnap = await transaction.get(oldDateSlotRef);
          if (oldDateSlotSnap.exists()) {
            const oldData = oldDateSlotSnap.data() as any;
            if (oldData?.meetingId === id) {
              shouldDeleteOldDateSlot = true;
            }
          }
        }
      }

      const currentNumber = freshData.meetingNumber;
      const desiredNumber = targetNumber !== undefined ? targetNumber : currentNumber;
      const isNumberChanging = desiredNumber !== currentNumber;

      let targetSlotRef: any = null;
      let oldSlotRef: any = null;
      let shouldDeleteOldSlot = false;

      if (isNumberChanging) {
        // A. Check legacy deterministic document
        const legacyTargetRef = doc(db, 'users', uid, 'meetings', `${freshData.teachingAssignmentId}_${freshData.semester}_${desiredNumber}`);
        if (legacyTargetRef.id !== id) {
          const legacyTargetSnap = await transaction.get(legacyTargetRef);
          if (legacyTargetSnap.exists()) {
            const legData = legacyTargetSnap.data() as Meeting;
            if (legData?.meetingNumber === desiredNumber) {
              throw new Error(`Pertemuan ke-${desiredNumber} untuk kelas dan mata pelajaran ini pada ${freshData.semester} sudah ada dalam jurnal.`);
            }
          }
        }

        // B. Read target reservation slot
        const targetSlotId = getMeetingSlotId(freshData.teachingAssignmentId, freshData.semester, desiredNumber);
        targetSlotRef = doc(db, 'users', uid, 'meetingSlots', targetSlotId);
        const targetSlotSnap = await transaction.get(targetSlotRef);
        if (targetSlotSnap.exists()) {
          const slotData = targetSlotSnap.data() as any;
          if (slotData?.meetingId !== id) {
            throw new Error(`Pertemuan ke-${desiredNumber} untuk kelas dan mata pelajaran ini pada ${freshData.semester} sudah ada dalam jurnal.`);
          }
        }

        // C. Read old reservation slot to verify ownership before releasing
        const oldSlotId = getMeetingSlotId(freshData.teachingAssignmentId, freshData.semester, currentNumber);
        oldSlotRef = doc(db, 'users', uid, 'meetingSlots', oldSlotId);
        const oldSlotSnap = await transaction.get(oldSlotRef);
        if (oldSlotSnap.exists()) {
          const oldData = oldSlotSnap.data() as any;
          if (oldData?.meetingId === id) {
            shouldDeleteOldSlot = true;
          }
        }
      }

      const now = serverTimestamp();

      // D. Atomically transfer reservations and update meeting
      if (isNumberChanging && targetSlotRef) {
        transaction.set(targetSlotRef, {
          meetingId: id,
          teachingAssignmentId: freshData.teachingAssignmentId,
          semester: freshData.semester,
          meetingNumber: desiredNumber,
          createdAt: now,
          updatedAt: now,
        });

        if (shouldDeleteOldSlot && oldSlotRef) {
          transaction.delete(oldSlotRef);
        }
      }

      if (isDateChanging && targetDateSlotRef && data.date) {
        transaction.set(targetDateSlotRef, {
          meetingId: id,
          teachingAssignmentId: freshData.teachingAssignmentId,
          semester: freshData.semester,
          date: data.date,
          createdAt: now,
          updatedAt: now,
        });

        if (shouldDeleteOldDateSlot && oldDateSlotRef) {
          transaction.delete(oldDateSlotRef);
        }
      }

      transaction.update(docRef, {
        ...safeEditableData,
        meetingNumber: desiredNumber,
        updatedAt: now,
      });
    });
  })(), {
    startMessage: 'Memperbarui jurnal pertemuan...',
    successMessage: 'Jurnal pertemuan tersimpan!'
  });
}

export interface CanDeleteMeetingResult {
  canDelete: boolean;
  reason?: string;
  hasAttendance: boolean;
  attendanceCount: number;
}

/**
 * Memeriksa apakah pertemuan aman untuk dihapus dan menghitung jumlah record absensi terkait.
 *
 * @param uid - ID Pengguna (guru).
 * @param id - ID dokumen pertemuan.
 * @returns Status kelayakan hapus beserta jumlah absensi yang terhubung.
 */
export async function canDeleteMeeting(
  uid: string, 
  id: string
): Promise<CanDeleteMeetingResult> {
  const docRef = doc(db, 'users', uid, 'meetings', id);
  const snap = await getDoc(docRef);
  if (!snap.exists()) {
    return { canDelete: false, reason: 'Pertemuan tidak ditemukan.', hasAttendance: false, attendanceCount: 0 };
  }
  const meetingData = snap.data() as Meeting;

  // Check if historical/archived
  if (meetingData.academicYearId) {
    const ayDoc = await getDoc(doc(db, 'users', uid, 'academicYears', meetingData.academicYearId));
    if (ayDoc.exists() && ayDoc.data()?.isArchived) {
      return { 
        canDelete: false, 
        reason: 'Jurnal pertemuan berada pada Tahun Ajaran yang telah diarsipkan (arsip historis dilindungi).',
        hasAttendance: false,
        attendanceCount: 0 
      };
    }
  }

  // Count attendance records
  const attColRef = collection(db, 'users', uid, 'attendanceRecords');
  const attQ = query(attColRef, where('meetingId', '==', id));
  const attSnap = await getDocs(attQ);
  const attendanceCount = attSnap.docs.length;

  return {
    canDelete: true,
    hasAttendance: attendanceCount > 0,
    attendanceCount
  };
}

/**
 * Menghapus dokumen pertemuan dari jurnal mengajar.
 * Secara cerdas memutus tautan (unlink) pada record absensi siswa tanpa menghapusnya,
 * sehingga riwayat kehadiran siswa tetap utuh.
 *
 * @param uid - ID Pengguna (guru).
 * @param id - ID dokumen pertemuan yang akan dihapus.
 * @throws Error jika tahun ajaran berstatus arsip/historis.
 */
export async function deleteMeeting(uid: string, id: string): Promise<void> {
  const docRef = doc(db, 'users', uid, 'meetings', id);
  const snap = await getDoc(docRef);
  if (!snap.exists()) {
    return; // Already deleted
  }
  const meetingData = snap.data() as Meeting;

  // Historical protection
  if (meetingData.academicYearId) {
    const ayDoc = await getDoc(doc(db, 'users', uid, 'academicYears', meetingData.academicYearId));
    if (ayDoc.exists() && ayDoc.data()?.isArchived) {
      throw new Error('Tidak dapat menghapus jurnal pertemuan pada Tahun Ajaran yang telah diarsipkan.');
    }
  }

  return trackSync((async () => {
    // Unlink associated attendance records instead of deleting them to preserve student attendance history
    const attColRef = collection(db, 'users', uid, 'attendanceRecords');
    const attQ = query(attColRef, where('meetingId', '==', id));
    const attSnap = await getDocs(attQ);

    const chunkSize = 400;
    const now = serverTimestamp();
    for (let i = 0; i < attSnap.docs.length; i += chunkSize) {
      const chunk = attSnap.docs.slice(i, i + chunkSize);
      const batch = writeBatch(db);
      chunk.forEach(d => {
        batch.update(d.ref, {
          meetingId: null,
          meetingNumber: null,
          updatedAt: now,
        });
      });
      await batch.commit();
    }

    // Atomically delete meeting document and release reservation slot (if owned by this meeting)
    await runTransaction(db, async (transaction) => {
      const freshSnap = await transaction.get(docRef);
      if (!freshSnap.exists()) return;
      const freshData = freshSnap.data() as Meeting;

      if (freshData.teachingAssignmentId && freshData.semester && freshData.meetingNumber) {
        const slotId = getMeetingSlotId(freshData.teachingAssignmentId, freshData.semester, freshData.meetingNumber);
        const slotRef = doc(db, 'users', uid, 'meetingSlots', slotId);
        const slotSnap = await transaction.get(slotRef);
        if (slotSnap.exists()) {
          const slotData = slotSnap.data() as any;
          if (slotData?.meetingId === id) {
            transaction.delete(slotRef);
          }
        }
      }

      if (freshData.teachingAssignmentId && freshData.semester && freshData.date) {
        const dateSlotId = getMeetingDateSlotId(freshData.teachingAssignmentId, freshData.semester, freshData.date);
        const dateSlotRef = doc(db, 'users', uid, 'meetingDateSlots', dateSlotId);
        const dateSlotSnap = await transaction.get(dateSlotRef);
        if (dateSlotSnap.exists()) {
          const slotData = dateSlotSnap.data() as any;
          if (slotData?.meetingId === id) {
            transaction.delete(dateSlotRef);
          }
        }
      }

      transaction.delete(docRef);
    });
  })(), {
    startMessage: 'Menghapus jurnal pertemuan...',
    successMessage: 'Jurnal pertemuan dihapus (data presensi siswa tetap aman)!'
  });
}

/**
 * Memperbarui rekapitulasi kehadiran (summary HADIR, SAKIT, IZIN, ALFA) pada dokumen pertemuan.
 *
 * @param uid - ID Pengguna (guru).
 * @param meetingId - ID dokumen pertemuan.
 * @param summary - Ringkasan statistik kehadiran siswa.
 */
export async function updateMeetingAttendanceSummary(
  uid: string,
  meetingId: string,
  summary: AttendanceSummary
): Promise<void> {
  const docRef = doc(db, 'users', uid, 'meetings', meetingId);
  await updateDoc(docRef, {
    attendanceSummary: summary,
    status: 'COMPLETED',
    updatedAt: serverTimestamp(),
  });
}
