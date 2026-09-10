export type UserRole = 'ADMIN' | 'TEACHER';
export type AccountStatus = 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';
export type SemesterType = 'GANJIL' | 'GENAP';
export type GenderType = 'L' | 'P';
export type StudentStatus = 'ACTIVE' | 'INACTIVE' | 'GRADUATED' | 'TRANSFERRED';
export type MeetingStatus = 'DRAFT' | 'SCHEDULED' | 'COMPLETED' | 'CANCELLED' | 'SUBSTITUTE';
export type AttendanceStatus = 'PRESENT' | 'SICK' | 'PERMITTED' | 'ABSENT' | 'DISPENSATION';
export type AssessmentCategory = 'ASSIGNMENT' | 'QUIZ' | 'PRACTICE' | 'PROJECT' | 'MIDTERM' | 'FINAL' | 'OTHER';
export type StudentNoteCategory = 'ACADEMIC' | 'ATTENDANCE' | 'ACHIEVEMENT' | 'BEHAVIOR' | 'ADMINISTRATIVE' | 'OTHER';
export type CalculationMethod = 'SIMPLE_AVERAGE' | 'WEIGHTED_AVERAGE';

export interface UserProfile {
  uid: string;
  displayName: string;
  email: string;
  nip?: string;
  nik?: string;
  nuptk?: string;
  phone?: string;
  photoUrl?: string;
  signatureUrl?: string;
  employmentStatus?: 'PNS' | 'PPPK' | 'GTT' | 'TETAP_YAYASAN' | 'HONORER';
  mainSubject?: string;
  role: UserRole;
  accountStatus: AccountStatus;
  defaultAcademicYearId?: string;
  defaultSemester: SemesterType;
  isOnboarded?: boolean;
  themePreference?: 'light' | 'dark-crimson';
  lastLoginAt?: any;
  createdAt: any;
  updatedAt: any;
}

export interface AcademicYear {
  id: string;
  label: string; // e.g. "2026/2027"
  startYear: number;
  endYear: number;
  currentSemester: SemesterType;
  isActive: boolean;
  isArchived?: boolean;
  archivedAt?: any;
  createdAt: any;
  updatedAt: any;
}

export interface ClassItem {
  id: string;
  academicYearId: string;
  name: string; // e.g. "X-A"
  gradeLevel: string; // e.g. "10", "11", "12", "7", "8", "9"
  major?: string; // e.g. "MIPA", "IPS", "Umum"
  classTeacherId?: string; // homeroom teacher uid
  isActive: boolean;
  isArchived?: boolean;
  archivedAt?: any;
  createdAt: any;
  updatedAt: any;
}

export interface Student {
  id: string;
  nis: string;
  nisn: string;
  fullName: string;
  gender: GenderType;
  birthPlace?: string;
  birthDate?: string;
  phone?: string;
  parentName?: string;
  parentPhone?: string;
  email?: string;
  religion?: string;
  address?: string;
  notes?: string;
  status: StudentStatus;
  nikSiswa?: string;
  nikIbu?: string;
  nkk?: string;
  isArchived?: boolean;
  archivedAt?: any;
  createdAt: any;
  updatedAt: any;
}

export interface Enrollment {
  id: string;
  academicYearId: string;
  classId: string;
  studentId: string;
  rollNumber: number;
  status: 'ACTIVE' | 'INACTIVE' | 'TRANSFERRED' | 'GRADUATED';
  student?: Student; // Denormalized or joined in memory
  className?: string;
  academicYearLabel?: string;
  // Audit trail for class transfers / mutations
  transferredAt?: any;
  transferredToClassId?: string;
  transferredToClassName?: string;
  transferredFromClassId?: string;
  transferredFromClassName?: string;
  transferReason?: string;
  // Audit trail for relationship recovery & re-link
  relinkedAt?: any;
  relinkedBy?: string;
  relinkedFromId?: string;
  relinkedToId?: string;
  relinkReason?: string;
  isOrphaned?: boolean;
  orphanReason?: string;
  createdAt: any;
  updatedAt: any;
}

export interface Subject {
  id: string;
  code: string; // e.g. "ENG", "MAT"
  name: string; // e.g. "Bahasa Inggris"
  isActive: boolean;
  createdAt: any;
  updatedAt: any;
}

export interface TeachingAssignment {
  id: string;
  academicYearId: string;
  semester: SemesterType;
  classId: string;
  subjectId: string;
  teacherId: string;
  isActive: boolean;
  isArchived?: boolean;
  archivedAt?: any;
  // Schedule metadata
  dayOfWeek?: string; // e.g. "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"
  timeSlot?: string; // e.g. "07:30 - 09:00" or "Jam 1-2"
  room?: string; // e.g. "R. 101"
  schedules?: { day: string; timeSlot: string; room?: string }[];
  // Joined/cached info for rapid rendering
  className?: string;
  subjectName?: string;
  subjectCode?: string;
  teacherName?: string;
  createdAt: any;
  updatedAt: any;
}

export interface AttendanceSummary {
  present: number;
  sick: number;
  permitted: number;
  absent: number;
  dispensation: number;
  total: number;
  presentPercentage: number;
}

export interface Meeting {
  id: string;
  academicYearId: string;
  semester: SemesterType;
  teachingAssignmentId: string;
  classId: string;
  subjectId: string;
  date: string; // YYYY-MM-DD
  timeSlot?: string; // e.g. "07:30 - 09:00" or "Jam 1-2"
  meetingNumber: number;
  topic: string;
  learningObjectives?: string;
  activities?: string;
  method?: string;
  notes?: string;
  status: MeetingStatus;
  meetingType?: 'CLASS' | 'MADRASAH_ACTIVITY';
  activityCategory?: string;
  className?: string;
  subjectName?: string;
  subjectCode?: string;
  attendanceSummary?: AttendanceSummary;
  createdAt: any;
  updatedAt: any;
}

export interface AttendanceSession {
  id: string;
  meetingId: string;
  date: string;
  status: 'OPEN' | 'CLOSED';
  notes?: string;
  createdAt: any;
  updatedAt: any;
}

export interface AttendanceRecord {
  id: string;
  meetingId: string;
  studentId: string;
  rollNumber?: number;
  studentName?: string;
  gender?: GenderType;
  status: AttendanceStatus;
  note?: string;
  createdAt: any;
  updatedAt: any;
}

export interface DailyAttendanceSession {
  id: string;
  academicYearId: string;
  classId: string;
  className?: string;
  date: string; // YYYY-MM-DD
  inputMethod?: 'DIRECT' | 'MANUAL_BOOK';
  notes?: string;
  summary?: AttendanceSummary;
  createdAt: any;
  updatedAt: any;
}

export interface DailyAttendanceRecord {
  id: string;
  sessionId?: string;
  academicYearId?: string;
  classId: string;
  date: string; // YYYY-MM-DD
  studentId: string;
  rollNumber?: number;
  studentName?: string;
  gender?: GenderType;
  status: AttendanceStatus;
  note?: string;
  createdAt: any;
  updatedAt: any;
}

export interface AssessmentItem {
  id: string;
  academicYearId: string;
  semester: SemesterType;
  teachingAssignmentId: string;
  classId: string;
  subjectId: string;
  name: string;
  category: AssessmentCategory;
  assessmentDate: string;
  maxScore: number;
  weight: number; // e.g. 20 for 20%
  isIncludedInFinalScore: boolean;
  notes?: string;
  createdAt: any;
  updatedAt: any;
}

export interface Score {
  id: string;
  assessmentItemId: string;
  studentId: string;
  score: number;
  note?: string;
  createdAt: any;
  updatedAt: any;
}

export interface StudentNote {
  id: string;
  studentId: string;
  studentName?: string;
  rollNumber?: number;
  classId: string;
  className?: string;
  academicYearId: string;
  date: string; // YYYY-MM-DD
  category: StudentNoteCategory;
  note: string;
  actionPlan?: string;
  parentFollowUp?: string;
  isImportant: boolean;
  createdAt: any;
  updatedAt: any;
}

export interface SchoolSettings {
  schoolName: string;
  schoolShortName?: string;
  schoolLevel?: 'MI' | 'MTs' | 'MA' | 'MAK' | 'SD' | 'SMP' | 'SMA' | 'SMK' | 'LAINNYA';
  accreditation?: 'A' | 'B' | 'C' | 'BELUM';
  nsm?: string;
  npsn?: string;
  kemenagDistrict?: string; // e.g. "KANTOR KEMENTERIAN AGAMA KABUPATEN SERAM BAGIAN TIMUR"
  kemenagLogoUrl?: string; // Custom or default Kemenag logo URL
  schoolLogoUrl?: string; // Custom school/madrasah logo URL
  address?: string;
  village?: string;
  district?: string;
  regency?: string;
  province?: string;
  postalCode?: string;
  phone?: string;
  email?: string;
  website?: string;
  logoUrl?: string; // Alias for schoolLogoUrl
  headmasterName: string;
  headmasterNip?: string;
  headmasterSignatureUrl?: string;
  stampImageUrl?: string;
  teacherName?: string;
  teacherNip?: string;
  teacherRole?: string;
  createdAt?: any;
  updatedAt?: any;
}

export interface DocumentSettings {
  documentFont: string;
  paperSize: 'A4' | 'F4' | 'LETTER';
  defaultOrientation: 'PORTRAIT' | 'LANDSCAPE';
  letterheadStyle?: 'CLASSIC_DOUBLE' | 'MODERN_SINGLE' | 'MINIMAL';
  headerEnabled: boolean;
  signatureEnabled: boolean;
  stampEnabled?: boolean;
  signatureImageUrl?: string;
  city?: string;
}

export interface UserPreferences {
  defaultAcademicYearId?: string;
  defaultSemester?: SemesterType;
  defaultClassId?: string;
  theme?: 'light' | 'dark';
}

export type SchoolDaysOption = 5 | 6; // 5: Senin - Jumat, 6: Senin - Sabtu (Madrasah / 6 Hari)

export interface CustomHoliday {
  id: string;
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  description: string; // Manual text description, e.g. "Hari Santri Nasional", "Libur Awal Ramadhan 1448 H"
  createdAt?: any;
}

export interface AttendanceSettings {
  schoolDaysOption: SchoolDaysOption; // Default 6 for Madrasah
  holidays: CustomHoliday[];
  updatedAt?: any;
}

// -------------------------------------------------------------
// FEEDBACK & SYSTEM ISSUE REPORTING
// -------------------------------------------------------------

export type FeedbackType = 'BUG' | 'FEATURE' | 'IMPROVEMENT' | 'OTHER';
export type FeedbackStatus = 'NEW' | 'IN_PROGRESS' | 'RESOLVED';

export interface FeedbackItem {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  type: FeedbackType;
  title: string;
  description: string;
  status: FeedbackStatus;
  adminReply?: string;
  resolvedAt?: any;
  createdAt: any;
  updatedAt: any;
}

// -------------------------------------------------------------
// REKAP KEHADIRAN GURU MAPEL OLEH WALI KELAS
// -------------------------------------------------------------

export type TeacherAttendanceStatus = 'HADIR' | 'SAKIT' | 'IZIN' | 'ALPA' | 'DINAS';
export type TeacherAttendanceEntryType = 'ROUTINE' | 'SUBSTITUTE' | 'SCHEDULE_SHIFT' | 'MANUAL';

export interface TeacherAttendanceRecord {
  id: string; // Deterministic: {academicYearId}_{semester}_{classId}_{date}_{teachingAssignmentId}
  academicYearId: string;
  academicYearLabel?: string;
  semester: SemesterType; // 'GANJIL' | 'GENAP'
  classId: string;
  className?: string;
  date: string; // YYYY-MM-DD
  teachingAssignmentId: string;
  teacherId: string;
  teacherName?: string;
  subjectId: string;
  subjectName?: string;
  subjectCode?: string;
  dayOfWeek?: number; // 1-7 (Senin-Minggu)
  status: TeacherAttendanceStatus;
  notes?: string;
  // Field pendukung operasional fleksibel (tukar jam / guru pengganti / di luar jadwal / susulan)
  isManualEntry?: boolean;
  isSubstitute?: boolean;
  substituteForTeacherName?: string;
  entryType?: TeacherAttendanceEntryType;
  createdAt: any;
  updatedAt: any;
  createdBy: string;
  updatedBy: string;
}

export interface TeacherAttendanceSummaryItem {
  teachingAssignmentId: string;
  teacherId: string;
  teacherName: string;
  subjectId: string;
  subjectName: string;
  subjectCode?: string;
  isManualEntry?: boolean;
  isSubstitute?: boolean;
  entryType?: TeacherAttendanceEntryType;
  targetMeetings?: number;
  hadir: number;
  sakit: number;
  izin: number;
  alpa: number;
  dinas: number;
  total: number;
  persentaseHadir: number;
  notes?: string;
}

export interface TeacherMonthlyAttendanceItem {
  id: string; // ID penugasan atau ID manual
  teachingAssignmentId?: string;
  teacherId: string;
  teacherName: string;
  subjectId: string;
  subjectName: string;
  subjectCode?: string;
  targetMeetings: number; // Target tatap muka per bulan (default: 4 atau sesuai alokasi kurikulum)
  hadir: number;          // Jumlah kehadiran (H)
  sakit: number;          // Sakit (S)
  izin: number;           // Izin (I)
  alpa: number;           // Alpa (A)
  dinas: number;          // Tugas Dinas (D)
  notes: string;          // Form catatan manual jika ada absen / keterangan jurnal fisik kelas
  isManual?: boolean;     // Penugasan tambahan / di luar master
  isSubstitute?: boolean; // Guru pengganti (inval)
  substituteForTeacherName?: string; // Guru tetap yang digantikan
}

export interface TeacherMonthlyAttendanceRecord {
  id: string; // Deterministic: {classId}_{academicYearId}_{semester}_{year}_{month}
  classId: string;
  className?: string;
  academicYearId: string;
  academicYearLabel?: string;
  semester: SemesterType;
  year: number;
  month: number; // 1-12
  items: TeacherMonthlyAttendanceItem[];
  createdAt?: any;
  updatedAt?: any;
  createdBy?: string;
  updatedBy?: string;
}
