import type { ClassSchedule, SemesterType } from '../../types';

export interface ClassScheduleRepository {
  getScheduleDocId(classId: string, academicYearId: string, semester: SemesterType): string;
  getClassSchedule(uid: string, classId: string, academicYearId: string, semester: SemesterType): Promise<ClassSchedule | null>;
  saveClassSchedule(
    uid: string,
    schedule: Omit<ClassSchedule, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }
  ): Promise<ClassSchedule>;
  deleteClassSchedule(uid: string, scheduleId: string): Promise<void>;
}