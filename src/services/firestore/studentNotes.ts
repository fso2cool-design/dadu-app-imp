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
  serverTimestamp 
} from 'firebase/firestore';
import { db } from '../firebase/config';
import { StudentNote, StudentNoteCategory } from '../../types';
import { trackSync } from '../../utils/syncEvents';

export async function getStudentNotesByClass(
  uid: string,
  academicYearId: string,
  classId: string
): Promise<StudentNote[]> {
  const colRef = collection(db, 'users', uid, 'studentNotes');
  const q = query(
    colRef,
    where('classId', '==', classId),
    where('academicYearId', '==', academicYearId),
    orderBy('date', 'desc')
  );
  try {
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...(d.data() as any) } as StudentNote));
  } catch (error) {
    // Fallback without combined index if needed
    const fallbackQ = query(colRef, where('classId', '==', classId));
    const snap = await getDocs(fallbackQ);
    const notes = snap.docs
      .map(d => ({ id: d.id, ...(d.data() as any) } as StudentNote))
      .filter(n => !academicYearId || n.academicYearId === academicYearId);
    return notes.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  }
}

export async function getStudentNotesByStudent(
  uid: string,
  studentId: string
): Promise<StudentNote[]> {
  const colRef = collection(db, 'users', uid, 'studentNotes');
  const q = query(colRef, where('studentId', '==', studentId));
  const snap = await getDocs(q);
  const notes = snap.docs.map(d => ({ id: d.id, ...(d.data() as any) } as StudentNote));
  return notes.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
}

export async function createStudentNote(
  uid: string,
  data: Omit<StudentNote, 'id' | 'createdAt' | 'updatedAt'>
): Promise<StudentNote> {
  return trackSync((async () => {
    const ayDoc = await getDoc(doc(db, 'users', uid, 'academicYears', data.academicYearId));
    if (ayDoc.exists() && ayDoc.data()?.isArchived) {
      throw new Error('Tidak dapat membuat catatan siswa pada Tahun Ajaran yang telah diarsipkan (read-only).');
    }

    const colRef = collection(db, 'users', uid, 'studentNotes');
    const now = serverTimestamp();
    const noteData = {
      studentId: data.studentId,
      studentName: data.studentName || '',
      rollNumber: data.rollNumber || 0,
      classId: data.classId,
      className: data.className || '',
      academicYearId: data.academicYearId,
      date: data.date,
      category: data.category,
      note: data.note,
      actionPlan: data.actionPlan || '',
      parentFollowUp: data.parentFollowUp || '',
      isImportant: !!data.isImportant,
      createdAt: now,
      updatedAt: now,
    };
    const docRef = await addDoc(colRef, noteData);
    return { id: docRef.id, ...noteData } as StudentNote;
  })(), {
    startMessage: 'Menyimpan catatan pembinaan...',
    successMessage: 'Catatan siswa tersimpan!'
  });
}

export async function updateStudentNote(
  uid: string,
  id: string,
  data: Partial<StudentNote>
): Promise<void> {
  return trackSync((async () => {
    const docRef = doc(db, 'users', uid, 'studentNotes', id);
    const snap = await getDoc(docRef);
    if (!snap.exists()) {
      throw new Error('Catatan siswa tidak ditemukan.');
    }
    const existing = snap.data() as StudentNote;

    if (data.academicYearId && data.academicYearId !== existing.academicYearId) {
      throw new Error('Tahun ajaran pada catatan siswa bersifat tetap dan tidak dapat diubah.');
    }
    if (data.classId && data.classId !== existing.classId) {
      throw new Error('Kelas pada catatan siswa bersifat tetap dan tidak dapat diubah.');
    }
    if (data.studentId && data.studentId !== existing.studentId) {
      throw new Error('Siswa pada catatan siswa bersifat tetap dan tidak dapat diubah.');
    }

    const ayDoc = await getDoc(doc(db, 'users', uid, 'academicYears', existing.academicYearId));
    if (ayDoc.exists() && ayDoc.data()?.isArchived) {
      throw new Error('Tidak dapat memperbarui catatan siswa pada Tahun Ajaran yang telah diarsipkan (read-only).');
    }

    const updatePayload: Record<string, any> = {
      updatedAt: serverTimestamp(),
    };
    if (data.studentName !== undefined) updatePayload.studentName = data.studentName;
    if (data.rollNumber !== undefined) updatePayload.rollNumber = data.rollNumber;
    if (data.className !== undefined) updatePayload.className = data.className;
    if (data.date !== undefined) updatePayload.date = data.date;
    if (data.category !== undefined) updatePayload.category = data.category;
    if (data.note !== undefined) updatePayload.note = data.note;
    if (data.actionPlan !== undefined) updatePayload.actionPlan = data.actionPlan;
    if (data.parentFollowUp !== undefined) updatePayload.parentFollowUp = data.parentFollowUp;
    if (data.isImportant !== undefined) updatePayload.isImportant = !!data.isImportant;

    await updateDoc(docRef, updatePayload);
  })(), {
    startMessage: 'Memperbarui catatan siswa...',
    successMessage: 'Perubahan catatan tersimpan!'
  });
}

export async function deleteStudentNote(uid: string, id: string): Promise<void> {
  return trackSync((async () => {
    const docRef = doc(db, 'users', uid, 'studentNotes', id);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      const existing = snap.data() as StudentNote;
      if (existing?.academicYearId) {
        const ayDoc = await getDoc(doc(db, 'users', uid, 'academicYears', existing.academicYearId));
        if (ayDoc.exists() && ayDoc.data()?.isArchived) {
          throw new Error('Tidak dapat menghapus catatan siswa pada Tahun Ajaran yang telah diarsipkan (read-only).');
        }
      }
    }
    await deleteDoc(docRef);
  })(), {
    startMessage: 'Menghapus catatan...',
    successMessage: 'Catatan berhasil dihapus!'
  });
}
