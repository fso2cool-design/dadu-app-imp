export type UserRole = 'ADMIN' | 'TEACHER';
export type AccountStatus = 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';
export type SemesterType = 'GANJIL' | 'GENAP';
export type GenderType = 'L' | 'P';
export type StudentStatus = 'ACTIVE' | 'INACTIVE' | 'GRADUATED' | 'TRANSFERRED';
export type MeetingStatus = 'DRAFT' | 'SCHEDULED' | 'COMPLETED' | 'CANCELLED' | 'SUBSTITUTE';
export type AttendanceStatus = 'PRESENT' | 'SICK' | 'PERMITTED' | 'ABSENT' | 'DISPENSATION';
export type AssessmentCategory = 'ASSIGNMENT' | 'QUIZ' | 'PRACTICE' | 'PROJECT' | 'MIDTERM' | 'FINAL' | 'OTHER';
export type StudentNoteCategory = 'ACADEMIC' | 'ATTENDANCE' | 'ACHIEVEMENT' | 'BEHAVIOR' | 'ADMINISTRATIVE' | 'DISCIPLINE' | 'OTHER';
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
  themePreference?: ThemeKey;
  designSystemPreference?: DesignSystemKey;
  designSystemModePreference?: DesignSystemMode;
  lastLoginAt?: any;
  createdAt: any;
  updatedAt: any;
}

// ==========================================================================
// DESIGN SYSTEMS (NEW - Phase 1)
// ==========================================================================

export type DesignSystemKey =
  | 'paper-craft'
  | 'neo-brutalism'
  | 'shadcn-ui';

export type DesignSystemMode = 'light' | 'dark';

export interface DesignSystemColorTokens {
  accent: string;
  accentFg: string;
  surface: string;
  surfaceElevated: string;
  border: string;
  text: string;
  textMuted: string;
  focus: string;
  input: string;
  accentHover: string;
  accentSoft: string;
  surfaceMuted: string;
}

export interface DesignSystemTokens {
  colors: DesignSystemColorTokens;
  darkColors: DesignSystemColorTokens;
  typography: {
    fontFamily: {
      sans: string;
      serif?: string;
      mono: string;
    };
    scale: {
      xs: string;
      sm: string;
      base: string;
      lg: string;
      xl: string;
    };
  };
  spacing: {
    xs: number;
    sm: number;
    md: number;
    lg: number;
    xl: number;
  };
  borders: {
    width: string;
    color: string;
    style: 'solid' | 'none';
  };
  elevation: {
    none: string;
    sm: string;
    md: string;
    lg: string;
  };
  radius: {
    none: string;
    sm: string;
    md: string;
    lg: string;
    full: string;
  };
  transitions: {
    fast: string;
    base: string;
    slow: string;
  };
}

export interface DesignSystemOption {
  id: DesignSystemKey;
  name: string;
  description: string;
  tagline: string;
  swatches: [string,string,string,string];
  preview: { card: string; accent: string };
  tokens: DesignSystemTokens;
}

// Contrast audit (WCAG AA, relative-luminance formula, computed 2026-10-01):
// paper-craft light: text #1C1917/bg #FAF7EE 16.33, muted #6B6259/bg 5.57,
//   ink #1C1917/accent #FF5A36 5.64 (white on #FF5A36 is 3.10 -> FAIL, never use).
//   NOTE: spec muted #78716C on #FAF7EE is 4.48 -> FAIL, darkened to #6B6259.
// paper-craft dark: text #FAF7EE/bg #1C1917 16.33, muted #A8A29E/bg 6.93,
//   card text #FAF7EE/#292524 14.16.
// shadcn-ui light: text #09090B/#FFFFFF 19.35, muted #52525B/bg 6.94,
//   accent-fg #FAFAFA/accent #18181B 16.97. All >= 4.5 (AAA).
// shadcn-ui dark: text #FAFAFA/bg #09090B 18.06, muted #A1A1AA/bg 7.55,
//   card text #FAFAFA/#18181B 15.69, accent-fg #18181B/accent #FAFAFA 16.97. All >= 4.5 (AAA).
// neo-brutalism light: text #000000/#FFFDF5 20.62, muted #52525B/bg 7.59,
//   ink #000000/accent #FFE500 16.46. All >= 4.5 (AAA).
// neo-brutalism dark: text #F4F4F5/#121212 17.04, muted #A1A1AA/bg 7.31,
//   card text #F4F4F5/#1E1E22 15.11, ink #000000/accent #FFE500 16.46. All >= 4.5 (AAA).
// Pastel note pairs (paper-craft sticky notes): red #9F2F2D/#FDEBEC 6.66,
//   blue #1F6C9F/#E1F3FE 4.98, green #346538/#EDF3EC 6.08,
//   yellow #956400/#FBF3DB 4.62. All >= 4.5.

export const DESIGN_SYSTEMS: DesignSystemOption[] = [
  {
    id: 'paper-craft',
    name: 'Paper Craft',
    description: 'Scrapbook hangat ala X-C Hub: border tinta, hard shadow, sticky notes',
    tagline: 'Kertas \u0026 tinta, bayangan tajam',
    swatches: ['#FAF7EE','#1C1917','#FF5A36','#A8A29E'],
    preview: { card: 'bg-[var(--card-bg)] border-[var(--card-border)]', accent: 'bg-[var(--accent-primary)]' },
    tokens: {
      colors: {
        accent: '#FF5A36',
        accentFg: '#1C1917',
        surface: '#FAF7EE',
        surfaceElevated: '#FFFDF9',
        border: '#292524',
        text: '#1C1917',
        textMuted: '#6B6259',
        focus: '#FF5A36',
        input: '#FFFDF9',
        accentHover: '#E84E2C',
        accentSoft: 'rgba(255,90,54,0.10)',
        surfaceMuted: '#F5F0E4',
      },
      darkColors: {
        accent: '#FF5A36',
        accentFg: '#1C1917',
        surface: '#1C1917',
        surfaceElevated: '#292524',
        border: '#FAF7EE',
        text: '#FAF7EE',
        textMuted: '#A8A29E',
        focus: '#FF5A36',
        input: '#292524',
        accentHover: '#FF7B5E',
        accentSoft: 'rgba(255,90,54,0.15)',
        surfaceMuted: '#292524',
      },
      typography: {
        fontFamily: {
          sans: 'Geist, system-ui, sans-serif',
          mono: 'Geist Mono, monospace',
        },
        scale: {
          xs: '0.75rem',
          sm: '0.875rem',
          base: '1rem',
          lg: '1.25rem',
          xl: '1.5rem',
        },
      },
      spacing: {
        xs: 8,
        sm: 16,
        md: 24,
        lg: 40,
        xl: 64,
      },
      borders: {
        width: '1.5px',
        color: '#292524',
        style: 'solid',
      },
      elevation: {
        none: 'none',
        sm: '3px 3px 0px 0px #1C1917',
        md: '5px 5px 0px 0px #1C1917',
        lg: '8px 8px 0px 0px #1C1917',
      },
      radius: {
        none: '0px',
        sm: '4px',
        md: '6px',
        lg: '8px',
        full: '9999px',
      },
      transitions: {
        fast: '100ms ease',
        base: '200ms ease',
        slow: '300ms ease',
      },
    },
  },
  {
    id: 'shadcn-ui',
    name: 'Shadcn UI',
    description: 'Modern neutral dashboard: crisp 1px borders, subtle zinc shadows, typography bersih dan terstruktur',
    tagline: 'Clean, modern, neutral-first',
    swatches: ['#FFFFFF', '#18181B', '#E4E4E7', '#52525B'],
    preview: { card: 'bg-[var(--card-bg)] border-[var(--card-border)]', accent: 'bg-[var(--accent-primary)]' },
    tokens: {
      colors: {
        accent: '#18181B',
        accentFg: '#FAFAFA',
        surface: '#FFFFFF',
        surfaceElevated: '#FFFFFF',
        border: '#E4E4E7',
        text: '#09090B',
        textMuted: '#52525B',
        focus: '#18181B',
        input: '#FFFFFF',
        accentHover: '#27272A',
        accentSoft: 'rgba(24,24,27,0.06)',
        surfaceMuted: '#F4F4F5',
      },
      darkColors: {
        accent: '#FAFAFA',
        accentFg: '#18181B',
        surface: '#09090B',
        surfaceElevated: '#18181B',
        border: '#27272A',
        text: '#FAFAFA',
        textMuted: '#A1A1AA',
        focus: '#FAFAFA',
        input: '#18181B',
        accentHover: '#F4F4F5',
        accentSoft: 'rgba(250,250,250,0.10)',
        surfaceMuted: '#18181B',
      },
      typography: {
        fontFamily: {
          sans: 'Geist, system-ui, sans-serif',
          mono: 'Geist Mono, monospace',
        },
        scale: {
          xs: '0.75rem',
          sm: '0.875rem',
          base: '1rem',
          lg: '1.25rem',
          xl: '1.5rem',
        },
      },
      spacing: {
        xs: 8,
        sm: 16,
        md: 24,
        lg: 32,
        xl: 48,
      },
      borders: {
        width: '1px',
        color: '#E4E4E7',
        style: 'solid',
      },
      elevation: {
        none: 'none',
        sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
        md: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1)',
        lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -4px rgba(0, 0, 0, 0.1)',
      },
      radius: {
        none: '0px',
        sm: '4px',
        md: '8px',
        lg: '12px',
        full: '9999px',
      },
      transitions: {
        fast: '150ms cubic-bezier(0.4, 0, 0.2, 1)',
        base: '200ms cubic-bezier(0.4, 0, 0.2, 1)',
        slow: '300ms cubic-bezier(0.4, 0, 0.2, 1)',
      },
    },
  },
  {
    id: 'neo-brutalism',
    name: 'Neo-Brutalism',
    description: 'Neo-Brutalism: border tegas 2px, hard offset shadow, kontras tinggi dan aksen berani',
    tagline: 'Border tegas, bayangan tajam, grafis berani',
    swatches: ['#FFFDF5', '#000000', '#FFE500', '#52525B'],
    preview: { card: 'bg-[var(--card-bg)] border-[var(--card-border)]', accent: 'bg-[var(--accent-primary)]' },
    tokens: {
      colors: {
        accent: '#FFE500',
        accentFg: '#000000',
        surface: '#FFFDF5',
        surfaceElevated: '#FFFFFF',
        border: '#000000',
        text: '#000000',
        textMuted: '#52525B',
        focus: '#000000',
        input: '#FFFFFF',
        accentHover: '#E6CF00',
        accentSoft: 'rgba(255,229,0,0.25)',
        surfaceMuted: '#F4F0E4',
      },
      darkColors: {
        accent: '#FFE500',
        accentFg: '#000000',
        surface: '#121212',
        surfaceElevated: '#1E1E22',
        border: '#E4E4E7',
        text: '#F4F4F5',
        textMuted: '#A1A1AA',
        focus: '#FFE500',
        input: '#1E1E22',
        accentHover: '#FFED4B',
        accentSoft: 'rgba(255,229,0,0.20)',
        surfaceMuted: '#18181B',
      },
      typography: {
        fontFamily: {
          sans: 'Geist, system-ui, sans-serif',
          mono: 'Geist Mono, monospace',
        },
        scale: {
          xs: '0.75rem',
          sm: '0.875rem',
          base: '1rem',
          lg: '1.25rem',
          xl: '1.5rem',
        },
      },
      spacing: {
        xs: 8,
        sm: 16,
        md: 24,
        lg: 32,
        xl: 48,
      },
      borders: {
        width: '2px',
        color: '#000000',
        style: 'solid',
      },
      elevation: {
        none: 'none',
        sm: '2px 2px 0px 0px #000000',
        md: '4px 4px 0px 0px #000000',
        lg: '6px 6px 0px 0px #000000',
      },
      radius: {
        none: '0px',
        sm: '3px',
        md: '5px',
        lg: '8px',
        full: '9999px',
      },
      transitions: {
        fast: '80ms ease',
        base: '150ms ease',
        slow: '250ms ease',
      },
    },
  },
];

// ==========================================================================
// THEME KEYS (ALIAS \u2014 single source, do NOT duplicate literals)
// ==========================================================================

export type ThemeKey = DesignSystemKey;

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
  classTeacherName?: string;
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
  searchTokens?: string[];
  customAttributes?: Record<string, string>;
  isArchived?: boolean;
  archivedAt?: any;
  createdAt: any;
  updatedAt: any;
}

export interface StudentCustomFieldDefinition {
  id: string;
  name: string; // e.g. "KIP / PIP", "Golongan Darah", "Asal Sekolah"
  key: string; // e.g. "kip", "bloodType", "previousSchool"
  type: 'TEXT' | 'NUMBER' | 'SELECT' | 'DATE';
  options?: string[]; // e.g. ["A", "B", "AB", "O"] for SELECT
  description?: string;
  showInTable?: boolean;
  isActive: boolean;
  createdAt?: any;
  updatedAt?: any;
}

export interface StudentPaginationOptions {
  pageSize?: number;
  status?: string;
  gender?: GenderType | 'ALL';
  cursorDoc?: any; // QueryDocumentSnapshot
  direction?: 'next' | 'initial';
}

export interface PaginatedStudentsResult {
  students: Student[];
  hasMore: boolean;
  firstDoc: any; // QueryDocumentSnapshot
  lastDoc: any; // QueryDocumentSnapshot
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
  isArchived?: boolean;
  archivedAt?: any;
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
  permit?: number;
  absent: number;
  dispensation: number;
  total: number;
  totalRecords?: number;
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
  studentId: string;
  meetingId?: string | null;
  meetingNumber?: number | null;
  academicYearId?: string;
  semester?: SemesterType;
  classId?: string;
  teachingAssignmentId?: string;
  subjectId?: string;
  date?: string; // YYYY-MM-DD
  rollNumber?: number;
  studentName?: string;
  gender?: GenderType;
  status: AttendanceStatus;
  note?: string;
  recordedBy?: string;
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
  totalPresent?: number;
  totalSick?: number;
  totalPermit?: number;
  totalAbsent?: number;
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
  content?: string;
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
  defaultKkm?: number;
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

export type ClassScheduleDay = 'SENIN' | 'SELASA' | 'RABU' | 'KAMIS' | 'JUMAT' | 'SABTU';

export interface ClassScheduleItem {
  id: string;
  day: ClassScheduleDay;
  period: number;        // Jam ke-1, 2, 3, dst
  timeSlot?: string;     // e.g. "07.50 - 08.25"
  subjectName: string;   // e.g. "Bahasa Arab"
  teacherName: string;   // e.g. "MACHFUD AFFANDI, S.Pd.I"
  roomOrNotes?: string;  // e.g. "Lab Bahasa"
}

export interface ClassSchedule {
  id: string;            // Deterministic: {classId}_{academicYearId}_{semester}
  classId: string;
  className?: string;
  academicYearId: string;
  academicYearLabel?: string;
  semester: SemesterType;
  items: ClassScheduleItem[];
  createdAt?: any;
  updatedAt?: any;
  updatedBy?: string;
}

export type SharedReportType = 'ATTENDANCE' | 'JOURNAL' | 'LEGGER';

export interface SharedReportPayload {
  reportType?: SharedReportType;
  // Snapshot/Metadata
  title: string;
  subtitle?: string;
  schoolName: string;
  schoolLevel?: string;
  kemenagDistrict?: string;
  academicYearLabel: string;
  semester: SemesterType;
  className: string;
  subjectName?: string;
  teacherName: string;
  teacherNip?: string;
  headmasterName?: string;
  headmasterNip?: string;
  generatedDate: string;
  
  // Specific data for each report type
  attendanceData?: {
    reportMode: 'SUBJECT' | 'HOMEROOM';
    totalMeetingsOrDays: number;
    summaries: Array<{
      rollNumber: number;
      nis: string;
      nisn: string;
      name: string;
      gender: 'L' | 'P';
      presentCount: number;
      sickCount: number;
      permittedCount: number;
      absentCount: number;
      dispensationCount: number;
      totalMeetings: number;
      presentPercentage: number;
    }>;
    statistics: {
      avgPercentage: number;
      perfectCount: number;
      criticalCount: number;
      totalP: number;
      totalS: number;
      totalI: number;
      totalA: number;
    };
  };

  journalData?: {
    meetings: Array<{
      meetingNumber: number;
      date: string;
      topic: string;
      learningObjectives?: string;
      activities?: string;
      method?: string;
      status: string;
      attendancePresent?: number;
      attendanceAbsent?: number;
      notes?: string;
    }>;
  };

  leggerData?: {
    kkm: number;
    subjects: Array<{ id: string; name: string; code?: string }>;
    rows: Array<{
      rollNumber: number;
      nis: string;
      nisn: string;
      name: string;
      gender: 'L' | 'P';
      subjectScores: Record<string, number | null>;
      totalScore: number;
      averageScore: number;
      rank: number;
    }>;
    classAverage: number;
  };
}

export interface SharedReport {
  id: string; // The public access token / code
  reportType: SharedReportType;
  userId: string;
  userName: string;
  title: string;
  description?: string;
  passcode?: string; // Memory-only or legacy plaintext passcode
  hasPasscode?: boolean; // Whether the report is protected by passcode
  salt?: string; // Hex salt for PBKDF2 key derivation
  iv?: string; // Hex initialization vector for AES-GCM
  encryptedPayload?: string; // Base64 AES-GCM ciphertext when passcode-protected
  expiresAt: any; // Firestore Timestamp, ISO string, or null
  isRevoked: boolean;
  viewCount: number;
  lastViewedAt?: any;
  payload: SharedReportPayload;
  createdAt: any;
  updatedAt: any;
}

