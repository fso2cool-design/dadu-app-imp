import { 
  collection, 
  doc, 
  getDoc, 
  setDoc, 
  deleteDoc, 
  serverTimestamp 
} from 'firebase/firestore';
import { db } from '../firebase/config';
import { ClassSchedule, SemesterType } from '../../types';
import { trackSync } from '../../utils/syncEvents';

export function getScheduleDocId(classId: string, academicYearId: string, semester: SemesterType): string {
  return `${classId}_${academicYearId}_${semester}`;
}

export async function getClassSchedule(
  uid: string,
  classId: string,
  academicYearId: string,
  semester: SemesterType
): Promise<ClassSchedule | null> {
  const docId = getScheduleDocId(classId, academicYearId, semester);
  const docRef = doc(db, 'users', uid, 'classSchedules', docId);
  const snap = await getDoc(docRef);
  if (!snap.exists()) return null;
  return { id: snap.id, ...(snap.data() as any) } as ClassSchedule;
}

export async function saveClassSchedule(
  uid: string,
  schedule: Omit<ClassSchedule, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }
): Promise<ClassSchedule> {
  const docId = schedule.id || getScheduleDocId(schedule.classId, schedule.academicYearId, schedule.semester);
  const docRef = doc(db, 'users', uid, 'classSchedules', docId);
  
  const payload = {
    ...schedule,
    id: docId,
    updatedAt: serverTimestamp(),
    updatedBy: uid,
  };

  await trackSync(
    setDoc(docRef, payload, { merge: true }),
    { successMessage: 'Jadwal pelajaran tersimpan' }
  );

  return {
    ...payload,
    id: docId,
  } as ClassSchedule;
}

export async function deleteClassSchedule(uid: string, scheduleId: string): Promise<void> {
  const docRef = doc(db, 'users', uid, 'classSchedules', scheduleId);
  await trackSync(
    deleteDoc(docRef),
    { successMessage: 'Jadwal pelajaran dihapus' }
  );
}
