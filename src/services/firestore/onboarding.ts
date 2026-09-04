import { collection, doc, writeBatch, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase/config';
import { UserProfile, SchoolSettings, DocumentSettings, UserPreferences } from '../../types';

export interface OnboardingData {
  profile: {
    displayName: string;
    nip?: string;
    nik?: string;
    phone?: string;
  };
  school: {
    schoolName: string;
    schoolShortName?: string;
    nsm?: string;
    npsn?: string;
    address?: string;
    headmasterName: string;
    headmasterNip?: string;
  };
  academicYear: {
    label: string; // e.g. "2026/2027"
    startYear: number;
    endYear: number;
    currentSemester: 'GANJIL' | 'GENAP';
  };
  classes: Array<{
    name: string; // e.g. "X-A"
    gradeLevel: string; // "10"
    major?: string;
    isHomeroom?: boolean;
  }>;
  subjects: Array<{
    code: string; // "ENG"
    name: string; // "Bahasa Inggris"
  }>;
  assignments: Array<{
    classIndex: number;
    subjectIndex: number;
  }>;
}

export async function submitOnboarding(uid: string, email: string, data: OnboardingData): Promise<void> {
  const batch = writeBatch(db);
  const now = serverTimestamp();

  // 1. Academic Year Doc
  const yearCol = collection(db, 'users', uid, 'academicYears');
  const yearDocRef = doc(yearCol);
  const yearId = yearDocRef.id;

  batch.set(yearDocRef, {
    label: data.academicYear.label,
    startYear: Number(data.academicYear.startYear),
    endYear: Number(data.academicYear.endYear),
    currentSemester: data.academicYear.currentSemester,
    isActive: true,
    createdAt: now,
    updatedAt: now,
  });

  // 2. User Profile Doc
  const userDocRef = doc(db, 'users', uid);
  const profileData: UserProfile = {
    uid,
    displayName: data.profile.displayName.trim(),
    email,
    nip: data.profile.nip?.trim() || '',
    nik: data.profile.nik?.trim() || '',
    phone: data.profile.phone?.trim() || '',
    role: 'TEACHER',
    accountStatus: 'ACTIVE',
    defaultAcademicYearId: yearId,
    defaultSemester: data.academicYear.currentSemester,
    isOnboarded: true,
    createdAt: now,
    updatedAt: now,
  };
  batch.set(userDocRef, profileData);

  // 3. School Settings
  const schoolDocRef = doc(db, 'users', uid, 'settings', 'school');
  const schoolData: SchoolSettings = {
    schoolName: data.school.schoolName.trim(),
    schoolShortName: data.school.schoolShortName?.trim() || '',
    nsm: data.school.nsm?.trim() || '',
    npsn: data.school.npsn?.trim() || '',
    address: data.school.address?.trim() || '',
    headmasterName: data.school.headmasterName.trim(),
    headmasterNip: data.school.headmasterNip?.trim() || '',
    teacherName: data.profile.displayName.trim(),
    teacherNip: data.profile.nip?.trim() || '',
    teacherRole: 'Guru Mata Pelajaran',
    createdAt: now,
    updatedAt: now,
  };
  batch.set(schoolDocRef, schoolData);

  // 4. Document Settings
  const docSettingsRef = doc(db, 'users', uid, 'settings', 'document');
  const docSettingsData: DocumentSettings = {
    documentFont: 'Plus Jakarta Sans',
    paperSize: 'A4',
    defaultOrientation: 'PORTRAIT',
    headerEnabled: true,
    signatureEnabled: true,
  };
  batch.set(docSettingsRef, docSettingsData);

  // 5. Classes
  const createdClassRefs: { id: string; name: string }[] = [];
  const classCol = collection(db, 'users', uid, 'classes');
  for (const c of data.classes) {
    const classDocRef = doc(classCol);
    createdClassRefs.push({ id: classDocRef.id, name: c.name.trim() });
    batch.set(classDocRef, {
      academicYearId: yearId,
      name: c.name.trim(),
      gradeLevel: c.gradeLevel.trim(),
      major: c.major?.trim() || '',
      classTeacherId: c.isHomeroom ? uid : '',
      isActive: true,
      createdAt: now,
      updatedAt: now,
    });
  }

  // 6. Subjects
  const createdSubjectRefs: { id: string; name: string; code: string }[] = [];
  const subjectCol = collection(db, 'users', uid, 'subjects');
  for (const s of data.subjects) {
    const subjectDocRef = doc(subjectCol);
    createdSubjectRefs.push({ id: subjectDocRef.id, name: s.name.trim(), code: s.code.trim().toUpperCase() });
    batch.set(subjectDocRef, {
      code: s.code.trim().toUpperCase(),
      name: s.name.trim(),
      isActive: true,
      createdAt: now,
      updatedAt: now,
    });
  }

  // 7. Teaching Assignments
  const assignmentCol = collection(db, 'users', uid, 'teachingAssignments');
  for (const a of data.assignments) {
    const targetClass = createdClassRefs[a.classIndex];
    const targetSubject = createdSubjectRefs[a.subjectIndex];
    if (targetClass && targetSubject) {
      const assignDocRef = doc(assignmentCol);
      batch.set(assignDocRef, {
        academicYearId: yearId,
        semester: data.academicYear.currentSemester,
        classId: targetClass.id,
        subjectId: targetSubject.id,
        teacherId: uid,
        isActive: true,
        className: targetClass.name,
        subjectName: targetSubject.name,
        subjectCode: targetSubject.code,
        createdAt: now,
        updatedAt: now,
      });
    }
  }

  // 8. User Preferences
  const prefDocRef = doc(db, 'users', uid, 'settings', 'preferences');
  const prefData: UserPreferences = {
    defaultAcademicYearId: yearId,
    defaultSemester: data.academicYear.currentSemester,
    defaultClassId: createdClassRefs[0]?.id || '',
    theme: 'light',
  };
  batch.set(prefDocRef, prefData);

  await batch.commit();
}
