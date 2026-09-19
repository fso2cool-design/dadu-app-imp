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
  limit,
  startAfter,
  QueryConstraint,
  QueryDocumentSnapshot,
  DocumentData
} from 'firebase/firestore';
import { db } from '../firebase/config';
import { Student, StudentPaginationOptions, PaginatedStudentsResult } from '../../types';

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

/**
 * Native Firestore pagination for Master Students listing.
 * Menggunakan orderBy('fullName', 'asc') dengan limit + startAfter cursor.
 * Mengambil (pageSize + 1) item untuk menentukan ketersediaan halaman berikutnya (hasMore)
 * tanpa read query count tambahan.
 */
export async function getStudentsPaginated(
  uid: string,
  options?: StudentPaginationOptions
): Promise<PaginatedStudentsResult> {
  const colRef = collection(db, 'users', uid, 'students');
  const pageSize = options?.pageSize || 25;
  const constraints: QueryConstraint[] = [];

  // Filter status jika spesifik
  if (options?.status && options.status !== 'ALL') {
    constraints.push(where('status', '==', options.status));
  }

  // Filter gender jika spesifik
  if (options?.gender && options.gender !== 'ALL') {
    constraints.push(where('gender', '==', options.gender));
  }

  // Default ordering konsisten by fullName lalu by document ID (deterministic)
  constraints.push(orderBy('fullName', 'asc'));

  // Gunakan cursor startAfter jika ada
  if (options?.cursorDoc) {
    constraints.push(startAfter(options.cursorDoc));
  }

  // Fetch pageSize + 1 untuk mengetahui apakah masih ada data setelah halaman ini
  constraints.push(limit(pageSize + 1));

  const q = query(colRef, ...constraints);
  const snap = await getDocs(q);

  const docs = snap.docs;
  const hasMore = docs.length > pageSize;
  const pageDocs = hasMore ? docs.slice(0, pageSize) : docs;

  const students: Student[] = pageDocs.map(d => ({
    id: d.id,
    ...(d.data() as any),
  } as Student));

  return {
    students,
    hasMore,
    firstDoc: pageDocs.length > 0 ? pageDocs[0] : null,
    lastDoc: pageDocs.length > 0 ? pageDocs[pageDocs.length - 1] : null,
  };
}

export async function getStudentById(uid: string, studentId: string): Promise<Student | null> {
  const docRef = doc(db, 'users', uid, 'students', studentId);
  const snap = await getDoc(docRef);
  if (!snap.exists()) return null;
  return { id: snap.id, ...(snap.data() as any) } as Student;
}

/**
 * Helper terpusat untuk membangkitkan word-prefix search tokens dari fullName dan parentName.
 * Spesifikasi token:
 * - Minimum prefix length = 2
 * - Maximum prefix length = 20
 * - Full token tetap dimasukkan jika panjangnya <= 20
 * - Kata lebih panjang dari 20 karakter menghasilkan prefix sampai 20 karakter
 * - Normalisasi: lowercase, trim, collapse multiple whitespace
 * - Tidak menghasilkan prefix 1 karakter ("a") dan tidak membuat arbitrary substring/n-gram
 */
export function buildStudentSearchTokens(fullName?: string, parentName?: string): string[] {
  const tokenSet = new Set<string>();

  const processText = (text?: string) => {
    if (!text) return;
    const normalized = text
      .toLowerCase()
      .trim()
      .replace(/\s+/g, ' ');
    if (!normalized) return;

    // Pecah per kata
    const words = normalized.split(' ').filter(Boolean);
    for (const word of words) {
      // Hasilkan prefix bertahap dengan min length 2 dan max length 20
      const maxLen = Math.min(word.length, 20);
      for (let i = 2; i <= maxLen; i++) {
        tokenSet.add(word.substring(0, i));
      }
    }
  };

  processText(fullName);
  processText(parentName);

  return Array.from(tokenSet);
}

export interface StudentSearchFilterOptions {
  status?: string;
  gender?: string;
  maxResults?: number;
  limitPerToken?: number;
}

/**
 * Targeted exact search untuk NIS atau NISN.
 * Tidak melakukan full collection getStudents().
 * Menggunakan query equality ('==') langsung terhadap field 'nis' dan 'nisn',
 * dilengkapi filter 'status' dan 'gender' secara langsung di Firestore constraint jika ditentukan.
 */
export async function searchStudentsByExactIdentifier(
  uid: string,
  rawQuery: string,
  options?: StudentSearchFilterOptions
): Promise<Student[]> {
  const clean = rawQuery?.trim();
  if (!clean) {
    return [];
  }

  const colRef = collection(db, 'users', uid, 'students');

  const baseConstraints: QueryConstraint[] = [];
  if (options?.status && options.status !== 'ALL') {
    baseConstraints.push(where('status', '==', options.status));
  }
  if (options?.gender && options.gender !== 'ALL') {
    baseConstraints.push(where('gender', '==', options.gender));
  }

  const maxRes = options?.maxResults || 10;

  // Query exact match paralel terhadap NIS dan NISN
  const [nisSnap, nisnSnap] = await Promise.all([
    getDocs(query(colRef, where('nis', '==', clean), ...baseConstraints, limit(maxRes))),
    getDocs(query(colRef, where('nisn', '==', clean), ...baseConstraints, limit(maxRes))),
  ]);

  const map = new Map<string, Student>();

  nisSnap.docs.forEach(d => {
    map.set(d.id, { id: d.id, ...(d.data() as any) } as Student);
  });

  nisnSnap.docs.forEach(d => {
    if (!map.has(d.id)) {
      map.set(d.id, { id: d.id, ...(d.data() as any) } as Student);
    }
  });

  return Array.from(map.values());
}

/**
 * Targeted name/parent prefix search menggunakan array searchTokens di Firestore.
 * Tidak melakukan full collection scan maupun getStudents(uid).
 * 
 * Target behavior:
 * - Filter status/gender diaplikasikan langsung sebagai Firestore query constraint.
 * - Multi-word search menjalankan targeted query untuk setiap token pencarian (min length 2, max 20).
 * - Hasil dari setiap targeted token query digabungkan ke candidate pool, lalu diverifikasi
 *   bahwa dokumen memenuhi seluruh token pencarian (AND semantics), tanpa false negative.
 * - Batas hasil (maxResults) dan batas per token query (limitPerToken) terdefinisi jelas untuk
 *   menjaga kuota read Firestore sekaligus menjamin correctness.
 */
export async function searchStudentsByNameToken(
  uid: string,
  rawQuery: string,
  options?: StudentSearchFilterOptions | number
): Promise<Student[]> {
  const clean = rawQuery?.toLowerCase().trim().replace(/\s+/g, ' ');
  if (!clean) return [];

  const rawTokens = clean.split(' ').filter(Boolean);
  if (rawTokens.length === 0) return [];

  const maxResults = typeof options === 'number' ? options : (options?.maxResults || 50);
  const statusFilter = typeof options === 'object' ? options.status : undefined;
  const genderFilter = typeof options === 'object' ? options.gender : undefined;
  const limitPerToken = typeof options === 'object' && options.limitPerToken ? options.limitPerToken : 100;

  // Ambil token yang memenuhi panjang minimum 2 karakter (karena searchTokens memiliki min prefix 2)
  const validTokens = rawTokens
    .filter(t => t.length >= 2)
    .map(t => t.substring(0, 20));

  // Deduplikasi token
  const uniqueQueryTokens = Array.from(new Set(validTokens));

  // Jika tidak ada satu pun token yang memiliki panjang minimal 2 karakter, belum cukup untuk dicocokkan
  if (uniqueQueryTokens.length === 0) {
    return [];
  }

  const colRef = collection(db, 'users', uid, 'students');

  // Siapkan Firestore constraint untuk status dan gender
  const baseConstraints: QueryConstraint[] = [];
  if (statusFilter && statusFilter !== 'ALL') {
    baseConstraints.push(where('status', '==', statusFilter));
  }
  if (genderFilter && genderFilter !== 'ALL') {
    baseConstraints.push(where('gender', '==', genderFilter));
  }

  // Token berkarakter 1 (misal ketikan sementara "Ahmad B") untuk verifikasi sekunder
  const shortTokens = rawTokens.filter(t => t.length < 2);

  // KASUS 1: Single Token
  if (uniqueQueryTokens.length === 1) {
    const primaryToken = uniqueQueryTokens[0];
    const q = query(
      colRef,
      where('searchTokens', 'array-contains', primaryToken),
      ...baseConstraints,
      limit(maxResults)
    );

    const snap = await getDocs(q);
    const matchedDocs = snap.docs.map(d => ({ id: d.id, ...(d.data() as any) } as Student));

    if (shortTokens.length === 0) {
      return matchedDocs;
    }

    // Jika ada token 1-karakter tambahan, filter sekunder di candidate doc
    return matchedDocs.filter(student => {
      const normName = `${student.fullName || ''} ${student.parentName || ''}`.toLowerCase();
      const words = normName.split(' ').filter(Boolean);
      return shortTokens.every(st => words.some(w => w.startsWith(st)));
    });
  }

  // KASUS 2: Multi-Word Search
  // Untuk setiap token pencarian, jalankan targeted query ke Firestore secara paralel
  // Batasi hingga 4 token terpanjang jika query sangat panjang untuk efisiensi network
  const tokensToQuery = uniqueQueryTokens.slice(0, 4);

  const snaps = await Promise.all(
    tokensToQuery.map(token => {
      const q = query(
        colRef,
        where('searchTokens', 'array-contains', token),
        ...baseConstraints,
        limit(limitPerToken)
      );
      return getDocs(q);
    })
  );

  // Kumpulkan dokumen kandidat unik dari seluruh query token
  const candidateMap = new Map<string, Student>();
  for (const snap of snaps) {
    for (const d of snap.docs) {
      if (!candidateMap.has(d.id)) {
        candidateMap.set(d.id, { id: d.id, ...(d.data() as any) } as Student);
      }
    }
  }

  // Verifikasi bahwa dokumen kandidat memenuhi SELURUH token pencarian (AND semantics)
  const results: Student[] = [];
  for (const student of candidateMap.values()) {
    const studentTokenSet = new Set(
      student.searchTokens && student.searchTokens.length > 0
        ? student.searchTokens
        : buildStudentSearchTokens(student.fullName, student.parentName)
    );

    const matchesAllTokens = uniqueQueryTokens.every(tok => studentTokenSet.has(tok));
    if (!matchesAllTokens) continue;

    if (shortTokens.length > 0) {
      const normName = `${student.fullName || ''} ${student.parentName || ''}`.toLowerCase();
      const words = normName.split(' ').filter(Boolean);
      const matchesShort = shortTokens.every(st => words.some(w => w.startsWith(st)));
      if (!matchesShort) continue;
    }

    results.push(student);
    if (results.length >= maxResults) {
      break;
    }
  }

  return results;
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
  const searchTokens = buildStudentSearchTokens(data.fullName, data.parentName);
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
    searchTokens,
    customAttributes: data.customAttributes || {},
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
  if (cleanData.parentName !== undefined) cleanData.parentName = cleanData.parentName.trim();
  if (cleanData.nis !== undefined) cleanData.nis = cleanData.nis.trim();
  if (cleanData.nisn !== undefined) cleanData.nisn = cleanData.nisn.trim();
  if (cleanData.nikSiswa !== undefined) cleanData.nikSiswa = cleanData.nikSiswa.trim();
  if (cleanData.nikIbu !== undefined) cleanData.nikIbu = cleanData.nikIbu.trim();
  if (cleanData.nkk !== undefined) cleanData.nkk = cleanData.nkk.trim();
  if (cleanData.customAttributes !== undefined) cleanData.customAttributes = cleanData.customAttributes;

  // Sinkronisasi index searchTokens jika fullName atau parentName berubah atau belum ada searchTokens
  const effectiveFullName = cleanData.fullName !== undefined ? cleanData.fullName : currentData.fullName;
  const effectiveParentName = cleanData.parentName !== undefined ? cleanData.parentName : currentData.parentName;
  if (cleanData.fullName !== undefined || cleanData.parentName !== undefined || !currentData.searchTokens) {
    cleanData.searchTokens = buildStudentSearchTokens(effectiveFullName, effectiveParentName);
  }

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
    const searchTokens = buildStudentSearchTokens(item.fullName, item.parentName);
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
      searchTokens,
      customAttributes: item.customAttributes || {},
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
  const existingActiveEnrByStudent = new Map<string, { id: string; classId: string; className: string }>();

  if (enrollmentConfig?.academicYearId) {
    const aySnap = await getDoc(doc(db, 'users', uid, 'academicYears', enrollmentConfig.academicYearId));
    if (aySnap.exists() && aySnap.data()?.isArchived) {
      throw new Error('Tidak dapat mengimpor atau menempatkan siswa pada Tahun Ajaran yang telah diarsipkan (read-only).');
    }

    if (enrollmentConfig.classId) {
      const clsSnap = await getDoc(doc(db, 'users', uid, 'classes', enrollmentConfig.classId));
      if (clsSnap.exists() && clsSnap.data()?.isArchived) {
        throw new Error('Tidak dapat mengimpor atau menempatkan siswa pada Kelas yang telah diarsipkan (read-only).');
      }
    }

    const enrollmentsColRef = collection(db, 'users', uid, 'enrollments');
    const enrSnap = await getDocs(
      query(enrollmentsColRef, where('academicYearId', '==', enrollmentConfig.academicYearId))
    );
    enrSnap.docs.forEach(d => {
      const data = d.data() as any;
      const key = `${data.studentId}_${data.classId}`;
      existingEnrollmentsMap.set(key, { id: d.id, rollNumber: data.rollNumber });
      if (data.status === 'ACTIVE') {
        existingActiveEnrByStudent.set(data.studentId, {
          id: d.id,
          classId: data.classId,
          className: data.className || '',
        });
      }
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
        if (item.customAttributes && Object.keys(item.customAttributes).length > 0) {
          updateData.customAttributes = {
            ...(matchedStudent?.customAttributes || {}),
            ...item.customAttributes,
          };
        }

        // Perbarui searchTokens dengan nama dan wali yang efektif
        const effectiveFullName = updateData.fullName || matchedStudent?.fullName || '';
        const effectiveParentName = updateData.parentName !== undefined ? updateData.parentName : (matchedStudent?.parentName || '');
        updateData.searchTokens = buildStudentSearchTokens(effectiveFullName, effectiveParentName);

        batchTasks.push({ type: 'UPDATE', ref: studentDocRef, data: updateData });
      }

      // Penempatan kelas siswa yang sudah ada
      if (item.targetClassId && enrollmentConfig?.academicYearId) {
        const enrKey = `${matchedStudentId}_${item.targetClassId}`;
        const existingEnr = existingEnrollmentsMap.get(enrKey);
        const deterministicDocId = `${enrollmentConfig.academicYearId}_${item.targetClassId}_${matchedStudentId}`;

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
          // Cek apakah siswa ini sudah aktif di kelas lain pada tahun ajaran yang sama
          const previousActive = existingActiveEnrByStudent.get(matchedStudentId);
          if (previousActive && previousActive.classId !== item.targetClassId) {
            // Tandai kelas sebelumnya sebagai TRANSFERRED untuk menjaga histori akademik
            const prevEnrDocRef = doc(enrollmentsColRef, previousActive.id);
            batchTasks.push({
              type: 'UPDATE',
              ref: prevEnrDocRef,
              data: {
                status: 'TRANSFERRED',
                transferredAt: now,
                transferredToClassId: item.targetClassId,
                transferredToClassName: item.targetClassName,
                transferReason: 'Impor penataan rombel baru',
                updatedAt: now,
              },
            });
          }

          // Tambah enrollment baru dengan deterministic ID
          const newEnrDocRef = doc(enrollmentsColRef, deterministicDocId);
          const newEnrData: Record<string, any> = {
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
          if (previousActive && previousActive.classId !== item.targetClassId) {
            newEnrData.transferredFromClassId = previousActive.classId;
            newEnrData.transferredFromClassName = previousActive.className;
            newEnrData.transferredAt = now;
            newEnrData.transferReason = 'Impor penataan rombel baru';
          }
          batchTasks.push({ type: 'SET', ref: newEnrDocRef, data: newEnrData });
          existingEnrollmentsMap.set(enrKey, { id: deterministicDocId, rollNumber: item.assignedRollNumber });
          existingActiveEnrByStudent.set(matchedStudentId, {
            id: deterministicDocId,
            classId: item.targetClassId,
            className: item.targetClassName,
          });
        }
      }
    } else {
      // 2. SISWA BELUM ADA -> Buat dokumen baru (CREATE)
      createdCount++;
      const studentDocRef = doc(studentsColRef);
      matchedStudentId = studentDocRef.id;

      const searchTokens = buildStudentSearchTokens(item.fullName, item.parentName);
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
        searchTokens,
        customAttributes: item.customAttributes || {},
        createdAt: now,
        updatedAt: now,
      };

      batchTasks.push({ type: 'SET', ref: studentDocRef, data: studentData });

      if (cleanNis) locallyCreatedNis.set(cleanNis, matchedStudentId);
      if (cleanNisn) locallyCreatedNisn.set(cleanNisn, matchedStudentId);
      if (normName) locallyCreatedName.set(normName, matchedStudentId);

      // Pendaftaran kelas baru dengan deterministic ID
      if (item.targetClassId && enrollmentConfig?.academicYearId) {
        const deterministicDocId = `${enrollmentConfig.academicYearId}_${item.targetClassId}_${matchedStudentId}`;
        const enrollmentDocRef = doc(enrollmentsColRef, deterministicDocId);
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
          id: deterministicDocId,
          rollNumber: item.assignedRollNumber,
        });
        existingActiveEnrByStudent.set(matchedStudentId, {
          id: deterministicDocId,
          classId: item.targetClassId,
          className: item.targetClassName,
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

/**
 * Utility untuk backfill searchTokens pada data siswa yang sudah ada.
 * Tidak dipanggil otomatis saat booting agar tidak ada overhead background scan.
 * Dapat dipanggil on-demand melalui panel perbaikan atau console admin jika diperlukan.
 * Membaca siswa tanpa searchTokens, menghitung tokens, dan memperbarui dokumen dalam chunk writeBatch.
 */
export async function backfillStudentSearchTokens(
  uid: string,
  onProgress?: (processed: number, total: number) => void
): Promise<{ processed: number; updated: number }> {
  const colRef = collection(db, 'users', uid, 'students');
  const snap = await getDocs(colRef);

  let updated = 0;
  let processed = 0;
  const total = snap.docs.length;

  const docsToUpdate: Array<{ id: string; tokens: string[] }> = [];

  for (const docSnap of snap.docs) {
    processed++;
    const data = docSnap.data() as Student;
    // Cek apakah searchTokens belum ada atau kosong padahal siswa punya fullName
    if (!data.searchTokens || !Array.isArray(data.searchTokens) || (data.fullName && data.searchTokens.length === 0)) {
      const tokens = buildStudentSearchTokens(data.fullName, data.parentName);
      docsToUpdate.push({ id: docSnap.id, tokens });
    }
  }

  // Tulis per batch maksimal 400 dokumen
  const BATCH_SIZE = 400;
  for (let i = 0; i < docsToUpdate.length; i += BATCH_SIZE) {
    const chunk = docsToUpdate.slice(i, i + BATCH_SIZE);
    const batch = writeBatch(db);
    chunk.forEach(item => {
      const dRef = doc(db, 'users', uid, 'students', item.id);
      batch.update(dRef, {
        searchTokens: item.tokens,
        updatedAt: serverTimestamp(),
      });
    });
    await batch.commit();
    updated += chunk.length;
    if (onProgress) {
      onProgress(processed, total);
    }
  }

  return { processed, updated };
}

