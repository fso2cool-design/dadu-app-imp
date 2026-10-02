import { useCallback, useEffect, useMemo, useState } from 'react';
import { useApplication } from '../application/ApplicationContext';
import type { Enrollment, DailyAttendanceRecord, StudentNote } from '../types';

export function useHomeroomStudents(uid: string | undefined, activeAcademicYearId: string | undefined, classId: string | undefined) {
  const app = useApplication();
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [attendanceRecords, setAttendanceRecords] = useState<DailyAttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!uid || !activeAcademicYearId || !classId || classId === 'NONE') { setEnrollments([]); setAttendanceRecords([]); setLoading(false); return; }
    setLoading(true);
    try {
      const [enrs, atts] = await Promise.all([
        app.enrollment.getByClass(uid, activeAcademicYearId, classId).then(list => list.filter(e => e.status === 'ACTIVE')),
        app.attendance.getAllDailyForClass(uid, classId, activeAcademicYearId),
      ]);
      setEnrollments(enrs);
      setAttendanceRecords(atts as DailyAttendanceRecord[]);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [app, uid, activeAcademicYearId, classId]);

  useEffect(() => { load(); }, [load]);

  const statsMap = useMemo(() => {
    const map = new Map<string, { present: number; sick: number; permitted: number; absent: number; total: number; rate: number }>();
    enrollments.forEach(e => map.set(e.studentId, { present: 0, sick: 0, permitted: 0, absent: 0, total: 0, rate: 100 }));
    attendanceRecords.forEach(rec => {
      const s = map.get(rec.studentId);
      if (!s) return;
      s.total++;
      if (rec.status === 'PRESENT' || rec.status === 'DISPENSATION') s.present++;
      else if (rec.status === 'SICK') s.sick++;
      else if (rec.status === 'PERMITTED') s.permitted++;
      else if (rec.status === 'ABSENT') s.absent++;
    });
    map.forEach(v => { if (v.total > 0) v.rate = Math.round((v.present / v.total) * 100); });
    return map;
  }, [enrollments, attendanceRecords]);

  return { enrollments, attendanceRecords, loading, statsMap, reload: load };
}

export function useStudentNotes(uid: string | undefined, studentId: string | undefined) {
  const app = useApplication();
  const [notes, setNotes] = useState<StudentNote[]>([]);
  const [loading, setLoading] = useState(false);
  const load = useCallback(async () => {
    if (!uid || !studentId) { setNotes([]); return; }
    setLoading(true);
    try {
      const list = await app.students.getStudentNotes(uid, studentId);
      setNotes(list as unknown as StudentNote[]);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [app, uid, studentId]);
  useEffect(() => { load(); }, [load]);
  const create = useCallback(async (data: any) => {
    if (!uid) throw new Error('no uid');
    const created: StudentNote = await app.students.createStudentNote(uid, data as any);
    setNotes(prev => [created, ...prev]);
    return created;
  }, [app, uid]);
  return { notes, loading, reload: load, create, setNotes };
}
