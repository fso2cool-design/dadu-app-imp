import { 
  collection, 
  doc, 
  getDocs, 
  addDoc, 
  updateDoc, 
  deleteDoc,
  query, 
  where, 
  serverTimestamp 
} from 'firebase/firestore';
import { db } from '../firebase/config';
import { TeachingAssignment, SemesterType } from '../../types';

export async function getTeachingAssignments(
  uid: string, 
  academicYearId?: string, 
  semester?: SemesterType
): Promise<TeachingAssignment[]> {
  const colRef = collection(db, 'users', uid, 'teachingAssignments');
  let q;
  if (academicYearId && semester) {
    q = query(colRef, where('academicYearId', '==', academicYearId), where('semester', '==', semester));
  } else if (academicYearId) {
    q = query(colRef, where('academicYearId', '==', academicYearId));
  } else {
    q = query(colRef);
  }

  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...(d.data() as any) } as TeachingAssignment));
}

export async function createTeachingAssignment(
  uid: string, 
  data: Omit<TeachingAssignment, 'id' | 'createdAt' | 'updatedAt'>
): Promise<TeachingAssignment> {
  const colRef = collection(db, 'users', uid, 'teachingAssignments');
  const now = serverTimestamp();
  
  const assignmentData = {
    academicYearId: data.academicYearId,
    semester: data.semester,
    classId: data.classId,
    subjectId: data.subjectId,
    teacherId: uid, // Strictly from authenticated user
    isActive: data.isActive ?? true,
    dayOfWeek: data.dayOfWeek || '',
    timeSlot: data.timeSlot || '',
    room: data.room || '',
    className: data.className || '',
    subjectName: data.subjectName || '',
    subjectCode: data.subjectCode || '',
    createdAt: now,
    updatedAt: now,
  };

  const docRef = await addDoc(colRef, assignmentData);
  return { id: docRef.id, ...assignmentData } as TeachingAssignment;
}

export async function updateTeachingAssignment(
  uid: string, 
  id: string, 
  data: Partial<TeachingAssignment>
): Promise<void> {
  const docRef = doc(db, 'users', uid, 'teachingAssignments', id);
  await updateDoc(docRef, {
    ...data,
    teacherId: uid, // Ensure teacherId is not tampered
    updatedAt: serverTimestamp(),
  });
}

export async function archiveTeachingAssignment(uid: string, id: string): Promise<void> {
  const docRef = doc(db, 'users', uid, 'teachingAssignments', id);
  await updateDoc(docRef, {
    isActive: false,
    updatedAt: serverTimestamp(),
  });
}

export async function canDeleteTeachingAssignment(
  uid: string, 
  assignmentId: string
): Promise<{ canDelete: boolean; reason?: string }> {
  // Check meetings
  const meetSnap = await getDocs(
    query(collection(db, 'users', uid, 'meetings'), where('teachingAssignmentId', '==', assignmentId))
  );
  if (!meetSnap.empty) {
    return {
      canDelete: false,
      reason: `Tugas mengajar memiliki ${meetSnap.size} rekam jurnal tatap muka. Nonaktifkan tugas mengajar untuk menjaga riwayat pembelajaran.`
    };
  }

  // Check assessment items
  const aiSnap = await getDocs(
    query(collection(db, 'users', uid, 'assessmentItems'), where('teachingAssignmentId', '==', assignmentId))
  );
  if (!aiSnap.empty) {
    return {
      canDelete: false,
      reason: `Tugas mengajar memiliki ${aiSnap.size} format penilaian siswa. Nonaktifkan tugas mengajar untuk melindungi nilai siswa.`
    };
  }

  return { canDelete: true };
}

export async function deleteTeachingAssignment(
  uid: string,
  id: string
): Promise<void> {
  const check = await canDeleteTeachingAssignment(uid, id);
  if (!check.canDelete) {
    throw new Error(check.reason || 'Tugas mengajar memiliki data terkait dan tidak dapat dihapus.');
  }

  const docRef = doc(db, 'users', uid, 'teachingAssignments', id);
  await deleteDoc(docRef);
}
