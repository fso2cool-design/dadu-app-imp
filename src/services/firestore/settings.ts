import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase/config';
import { SchoolSettings, DocumentSettings, UserPreferences, AttendanceSettings } from '../../types';
import { trackSync } from '../../utils/syncEvents';

export const DEFAULT_ATTENDANCE_SETTINGS: AttendanceSettings = {
  schoolDaysOption: 6, // Default 6 Hari (Senin - Sabtu) untuk Madrasah/Sekolah
  holidays: [],
};

export async function getSchoolSettings(uid: string): Promise<SchoolSettings | null> {
  const docRef = doc(db, 'users', uid, 'settings', 'school');
  const snap = await getDoc(docRef);
  if (snap.exists()) {
    return snap.data() as SchoolSettings;
  }
  return null;
}

export async function saveSchoolSettings(uid: string, data: SchoolSettings): Promise<void> {
  return trackSync((async () => {
    const docRef = doc(db, 'users', uid, 'settings', 'school');
    await setDoc(docRef, {
      ...data,
      updatedAt: serverTimestamp(),
    }, { merge: true });
  })(), {
    startMessage: 'Menyimpan identitas sekolah...',
    successMessage: 'Identitas sekolah tersimpan!'
  });
}

export async function getDocumentSettings(uid: string): Promise<DocumentSettings | null> {
  const docRef = doc(db, 'users', uid, 'settings', 'document');
  const snap = await getDoc(docRef);
  if (snap.exists()) {
    return snap.data() as DocumentSettings;
  }
  return null;
}

export async function saveDocumentSettings(uid: string, data: DocumentSettings): Promise<void> {
  return trackSync((async () => {
    const docRef = doc(db, 'users', uid, 'settings', 'document');
    await setDoc(docRef, {
      ...data,
      updatedAt: serverTimestamp(),
    }, { merge: true });
  })(), {
    startMessage: 'Menyimpan pengaturan dokumen cetak...',
    successMessage: 'Format dokumen berhasil diperbarui!'
  });
}

export async function getUserPreferences(uid: string): Promise<UserPreferences | null> {
  const docRef = doc(db, 'users', uid, 'settings', 'preferences');
  const snap = await getDoc(docRef);
  if (snap.exists()) {
    return snap.data() as UserPreferences;
  }
  return null;
}

export async function saveUserPreferences(uid: string, data: UserPreferences): Promise<void> {
  return trackSync((async () => {
    const docRef = doc(db, 'users', uid, 'settings', 'preferences');
    await setDoc(docRef, {
      ...data,
    }, { merge: true });
  })(), {
    startMessage: 'Menyimpan preferensi tampilan...',
    successMessage: 'Preferensi berhasil disimpan!'
  });
}

export async function getAttendanceSettings(uid: string): Promise<AttendanceSettings> {
  try {
    const docRef = doc(db, 'users', uid, 'settings', 'attendance');
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      const data = snap.data() as AttendanceSettings;
      return {
        schoolDaysOption: data.schoolDaysOption || 6,
        holidays: Array.isArray(data.holidays) ? data.holidays : [],
      };
    }
  } catch (err) {
    console.error('Error fetching attendance settings:', err);
  }
  return DEFAULT_ATTENDANCE_SETTINGS;
}

export async function saveAttendanceSettings(uid: string, data: AttendanceSettings): Promise<void> {
  return trackSync((async () => {
    const docRef = doc(db, 'users', uid, 'settings', 'attendance');
    await setDoc(docRef, {
      schoolDaysOption: data.schoolDaysOption || 6,
      holidays: data.holidays || [],
      updatedAt: serverTimestamp(),
    }, { merge: true });
  })(), {
    startMessage: 'Menyimpan pengaturan hari belajar & kalender libur...',
    successMessage: 'Pengaturan hari belajar & libur berhasil disimpan!'
  });
}
