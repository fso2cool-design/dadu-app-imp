import { 
  // TODO: Add missing imports here
} from '../types';

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
    schoolLevel?: 'MI' | 'MTs' | 'MA' | 'MAK' | 'SD' | 'SMP' | 'SMA' | 'SMK' | 'LAINNYA';
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

