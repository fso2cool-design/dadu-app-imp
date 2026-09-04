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
import { AssessmentItem, Score, SemesterType, AssessmentCategory } from '../../types';
import { trackSync } from '../../utils/syncEvents';

export interface AssessmentFilterOptions {
  academicYearId?: string;
  semester?: SemesterType;
  teachingAssignmentId?: string;
  classId?: string;
  subjectId?: string;
}

export async function getAssessmentItems(
  uid: string, 
  options?: AssessmentFilterOptions
): Promise<AssessmentItem[]> {
  const colRef = collection(db, 'users', uid, 'assessmentItems');
  let q = query(colRef);

  if (options?.teachingAssignmentId) {
    q = query(colRef, where('teachingAssignmentId', '==', options.teachingAssignmentId));
  } else if (options?.classId && options?.subjectId && options?.academicYearId && options?.semester) {
    q = query(
      colRef,
      where('classId', '==', options.classId),
      where('subjectId', '==', options.subjectId),
      where('academicYearId', '==', options.academicYearId),
      where('semester', '==', options.semester)
    );
  } else if (options?.classId && options?.academicYearId) {
    q = query(
      colRef,
      where('classId', '==', options.classId),
      where('academicYearId', '==', options.academicYearId)
    );
  }

  const snap = await getDocs(q);
  const items = snap.docs.map(d => ({ id: d.id, ...(d.data() as any) } as AssessmentItem));
  
  // Sort in memory by date or creation
  items.sort((a, b) => {
    if (a.assessmentDate && b.assessmentDate) {
      return a.assessmentDate.localeCompare(b.assessmentDate);
    }
    return (a.name || '').localeCompare(b.name || '');
  });

  return items;
}

export async function getAssessmentItemById(
  uid: string, 
  itemId: string
): Promise<AssessmentItem | null> {
  const docRef = doc(db, 'users', uid, 'assessmentItems', itemId);
  const snap = await getDoc(docRef);
  if (!snap.exists()) return null;
  return { id: snap.id, ...(snap.data() as any) } as AssessmentItem;
}

export async function createAssessmentItem(
  uid: string, 
  data: Omit<AssessmentItem, 'id' | 'createdAt' | 'updatedAt'>
): Promise<string> {
  // Validate semantic relationship integrity
  if (!data.teachingAssignmentId || !data.classId || !data.subjectId || !data.academicYearId || !data.semester) {
    throw new Error('Relasi penilaian tidak lengkap: ID Tugas Mengajar, Kelas, Mapel, Tahun Ajaran, dan Semester wajib diisi.');
  }

  return trackSync((async () => {
    const colRef = collection(db, 'users', uid, 'assessmentItems');
    const res = await addDoc(colRef, {
      ...data,
      weight: Number(data.weight) || 10,
      maxScore: Number(data.maxScore) || 100,
      isIncludedInFinalScore: data.isIncludedInFinalScore ?? true,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return res.id;
  })(), {
    startMessage: 'Menambahkan kolom asesmen...',
    successMessage: 'Kolom asesmen berhasil dibuat!'
  });
}

export async function updateAssessmentItem(
  uid: string, 
  itemId: string, 
  data: Partial<Omit<AssessmentItem, 'id' | 'createdAt' | 'updatedAt'>>
): Promise<void> {
  return trackSync((async () => {
    const docRef = doc(db, 'users', uid, 'assessmentItems', itemId);
    await updateDoc(docRef, {
      ...data,
      updatedAt: serverTimestamp(),
    });
  })(), {
    startMessage: 'Memperbarui pengaturan asesmen...',
    successMessage: 'Pengaturan asesmen tersimpan!'
  });
}

export async function deleteAssessmentItem(
  uid: string, 
  itemId: string
): Promise<void> {
  return trackSync((async () => {
    // First delete associated scores
    const scoresColRef = collection(db, 'users', uid, 'scores');
    const scoreQuery = query(scoresColRef, where('assessmentItemId', '==', itemId));
    const scoreSnap = await getDocs(scoreQuery);

    const batch = writeBatch(db);
    scoreSnap.docs.forEach(docSnap => {
      batch.delete(docSnap.ref);
    });

    // Delete the item itself
    const itemRef = doc(db, 'users', uid, 'assessmentItems', itemId);
    batch.delete(itemRef);

    await batch.commit();
  })(), {
    startMessage: 'Menghapus kolom asesmen & nilai terkait...',
    successMessage: 'Kolom asesmen berhasil dihapus!'
  });
}

/**
 * Get all scores for a list of assessment item IDs
 */
export async function getScoresByAssessmentItemIds(
  uid: string, 
  assessmentItemIds: string[]
): Promise<Score[]> {
  if (!assessmentItemIds || assessmentItemIds.length === 0) return [];
  
  const scoresColRef = collection(db, 'users', uid, 'scores');
  
  // Firestore 'in' operator supports up to 30 items
  const chunks: string[][] = [];
  for (let i = 0; i < assessmentItemIds.length; i += 30) {
    chunks.push(assessmentItemIds.slice(i, i + 30));
  }

  const allScores: Score[] = [];
  for (const chunk of chunks) {
    const q = query(scoresColRef, where('assessmentItemId', 'in', chunk));
    const snap = await getDocs(q);
    snap.docs.forEach(d => {
      allScores.push({ id: d.id, ...(d.data() as any) } as Score);
    });
  }

  return allScores;
}

/**
 * Save / Update a batch of scores for students in an assessment
 */
export async function saveScoresBatch(
  uid: string,
  assessmentItemId: string,
  scoresData: Array<{
    studentId: string;
    score: number;
    note?: string;
  }>
): Promise<void> {
  if (!assessmentItemId) {
    throw new Error('ID kolom penilaian wajib diisi.');
  }
  if (!scoresData || scoresData.some(s => !s.studentId)) {
    throw new Error('Data nilai tidak lengkap: ID Siswa wajib diisi.');
  }

  return trackSync((async () => {
    const scoresColRef = collection(db, 'users', uid, 'scores');
    const batch = writeBatch(db);
    const now = serverTimestamp();

    for (const item of scoresData) {
      // Validate score integrity (0 to 100)
      let cleanScore = Number(item.score);
      if (isNaN(cleanScore) || cleanScore < 0) cleanScore = 0;
      if (cleanScore > 100) cleanScore = 100;

      const recordId = `${assessmentItemId}_${item.studentId}`;
      const ref = doc(scoresColRef, recordId);

      batch.set(ref, {
        assessmentItemId,
        studentId: item.studentId,
        score: cleanScore,
        note: item.note || '',
        updatedAt: now,
        createdAt: now,
      }, { merge: true });
    }

    await batch.commit();
  })(), {
    startMessage: 'Menyimpan nilai siswa ke database...',
    successMessage: 'Nilai siswa berhasil disimpan!'
  });
}

/**
 * Save multiple scores across multiple assessment items (e.g. full spreadsheet grid save / paste)
 */
export async function saveMatrixScores(
  uid: string,
  scoresToSave: Array<{
    assessmentItemId: string;
    studentId: string;
    score: number;
    note?: string;
  }>
): Promise<void> {
  if (scoresToSave.length === 0) return;
  if (scoresToSave.some(s => !s.assessmentItemId || !s.studentId)) {
    throw new Error('Data matriks nilai tidak lengkap: ID Asesmen dan ID Siswa wajib diisi.');
  }

  return trackSync((async () => {
    const scoresColRef = collection(db, 'users', uid, 'scores');
    const now = serverTimestamp();
    
    // Batch limit in firestore is 500 ops per commit
    const chunkSize = 450;
    for (let i = 0; i < scoresToSave.length; i += chunkSize) {
      const chunk = scoresToSave.slice(i, i + chunkSize);
      const batch = writeBatch(db);

      for (const item of chunk) {
        let cleanScore = Number(item.score);
        if (isNaN(cleanScore) || cleanScore < 0) cleanScore = 0;
        if (cleanScore > 100) cleanScore = 100;

        const recordId = `${item.assessmentItemId}_${item.studentId}`;
        const ref = doc(scoresColRef, recordId);

        batch.set(ref, {
          assessmentItemId: item.assessmentItemId,
          studentId: item.studentId,
          score: cleanScore,
          note: item.note || '',
          updatedAt: now,
          createdAt: now,
        }, { merge: true });
      }

      await batch.commit();
    }
  })(), {
    startMessage: 'Menyimpan nilai matriks...',
    successMessage: 'Data nilai matriks berhasil disimpan!'
  });
}
