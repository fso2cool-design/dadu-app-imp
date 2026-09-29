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
  lastLoginAt?: any;
  createdAt: any;
  updatedAt: any;
}

// ==========================================================================
// DESIGN SYSTEMS (NEW - Phase 1)
// ==========================================================================

export type DesignSystemKey = 
  | 'brutalism' 
  | 'apple-glass' 
  | 'neo-skeuomorphic';

export interface DesignSystemTokens {
  colors: {
    accent: string;
    accentFg: string;
    surface: string;
    surfaceElevated: string;
    border: string;
    text: string;
    textMuted: string;
  };
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
  tokens: DesignSystemTokens;
}

export const DESIGN_SYSTEMS: DesignSystemOption[] = [
  {
    id: 'brutalism',
    name: 'Brutalism Edukatif',
    description: 'Papan tulis taktil digital dengan borders tegas dan typography besar',
    tokens: {
      colors: {
        accent: '#FFE500',
        accentFg: '#000000',
        surface: '#FFFFFF',
        surfaceElevated: '#FFFFFF',
        border: '#000000',
        text: '#000000',
        textMuted: '#4A4A4A',
      },
      typography: {
        fontFamily: {
          sans: 'Space Grotesk, system-ui, sans-serif',
          mono: 'JetBrains Mono, monospace',
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
        width: '4px',
        color: '#000000',
        style: 'solid',
      },
      elevation: {
        none: 'none',
        sm: '4px 4px 0px 0px rgba(0,0,0,1)',
        md: '6px 6px 0px 0px rgba(0,0,0,1)',
        lg: '8px 8px 0px 0px rgba(0,0,0,1)',
      },
      radius: {
        none: '0px',
        sm: '2px',
        md: '2px',
        lg: '2px',
        full: '0px',
      },
      transitions: {
        fast: '100ms ease',
        base: '200ms ease',
        slow: '300ms ease',
      },
    },
  },
  {
    id: 'apple-glass',
    name: 'Apple VisionOS Glass',
    description: 'Spatial computing dengan frosted glass, subtle depth, dan micro-interactions',
    tokens: {
      colors: {
        accent: '#007AFF',
        accentFg: '#FFFFFF',
        surface: '#FFFFFF',
        surfaceElevated: 'rgba(255,255,255,0.82)',
        border: 'rgba(0,0,0,0.08)',
        text: '#0F172A',
        textMuted: '#64748B',
      },
      typography: {
        fontFamily: {
          sans: 'Inter Variable, Inter, system-ui, sans-serif',
          serif: 'Merriweather, serif',
          mono: 'JetBrains Mono, monospace',
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
        color: 'rgba(0,0,0,0.08)',
        style: 'solid',
      },
      elevation: {
        none: 'none',
        sm: '0 1px 2px rgba(0,0,0,0.05), 0 4px 8px rgba(0,0,0,0.04)',
        md: '0 4px 6px rgba(0,0,0,0.05), 0 12px 24px rgba(0,0,0,0.06)',
        lg: '0 10px 15px rgba(0,0,0,0.05), 0 24px 32px rgba(0,0,0,0.08)',
      },
      radius: {
        none: '0px',
        sm: '8px',
        md: '12px',
        lg: '20px',
        full: '9999px',
      },
      transitions: {
        fast: '150ms cubic-bezier(0.4, 0, 0.2, 1)',
        base: '250ms cubic-bezier(0.4, 0, 0.2, 1)',
        slow: '400ms cubic-bezier(0.4, 0, 0.2, 1)',
      },
    },
  },
  {
    id: 'neo-skeuomorphic',
    name: 'Neo-Skeuomorphic Academic',
    description: 'Digital buku induk dengan textures, embossed elements, dan tactile depth',
    tokens: {
      colors: {
        accent: '#047857',
        accentFg: '#FFFFFF',
        surface: '#FAF9F6',
        surfaceElevated: '#FFFFFF',
        border: '#D6D3D1',
        text: '#1C1917',
        textMuted: '#78716C',
      },
      typography: {
        fontFamily: {
          sans: 'Inter Variable, Inter, system-ui, sans-serif',
          serif: 'Merriweather, Lora, serif',
          mono: 'JetBrains Mono, monospace',
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
        color: '#D6D3D1',
        style: 'solid',
      },
      elevation: {
        none: 'none',
        sm: '0 1px 3px rgba(0,0,0,0.08), inset 0 1px 0 rgba(255,255,255,0.5)',
        md: '0 4px 6px rgba(0,0,0,0.08), inset 0 1px 0 rgba(255,255,255,0.5)',
        lg: '0 10px 15px rgba(0,0,0,0.08), inset 0 1px 0 rgba(255,255,255,0.5)',
      },
      radius: {
        none: '0px',
        sm: '8px',
        md: '12px',
        lg: '16px',
        full: '9999px',
      },
      transitions: {
        fast: '100ms ease',
        base: '200ms ease',
        slow: '300ms ease',
      },
    },
  },
];

// ==========================================================================
// THEME KEYS (LEGACY - Keep for backward compatibility)
// ==========================================================================

export type ThemeKey =
  | 'brutalism'
  | 'apple-glass'
  | 'neo-skeuomorphic';

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

