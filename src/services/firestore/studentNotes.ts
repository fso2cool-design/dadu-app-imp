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
    await updateDoc(docRef, {
      ...data,
      updatedAt: serverTimestamp(),
    });
  })(), {
    startMessage: 'Memperbarui catatan siswa...',
    successMessage: 'Perubahan catatan tersimpan!'
  });
}

export async function deleteStudentNote(uid: string, id: string): Promise<void> {
  return trackSync((async () => {
    const docRef = doc(db, 'users', uid, 'studentNotes', id);
    await deleteDoc(docRef);
  })(), {
    startMessage: 'Menghapus catatan...',
    successMessage: 'Catatan berhasil dihapus!'
  });
}
