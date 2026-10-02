import { 
  GenderType, AttendanceStatus
} from '../types';

export interface SaveDailyAttendanceItem {
  id?: string;
  studentId: string;
  rollNumber?: number;
  studentName?: string;
  gender?: GenderType;
  status: AttendanceStatus;
  note?: string;
}

