import { useCallback, useEffect, useMemo, useState } from 'react';
import { container } from '../application/ports/container';
import type { Enrollment, DailyAttendanceRecord, StudentNote } from '../types';

export function useHomeroomStudents(uid: string | undefined, activeAcademicYearId: string | undefined, classId: string | undefined) {
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [attendanceRecords, setAttendanceRecords] = useState<DailyAttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!uid || !activeAcademicYearId || !classId || classId === 'NONE') { setEnrollments([]); setAttendanceRecords([]); setLoading(false); return; }
    setLoading(true);
    try {
      const [enrs, atts] = await Promise.all([
        container.repos.enrollment.getByClass(uid, activeAcademicYearId, classId).then(list => list.filter(e => e.status === 'ACTIVE')) as Promise<Enrollment[]>,
        // homeroomAttendance repo not fully ported; fallback to direct service via any
        (container.repos as any).homeroomAttendance?.getAllForClass
          ? (container.repos as any).homeroomAttendance.getAllForClass(uid, classId, activeAcademicYearId)
          : import('../services/firestore/homeroomAttendance').then(m => m.getAllDailyAttendanceRecordsForClass(uid, classId, activeAcademicYearId)),
      ]);
      setEnrollments(enrs);
      setAttendanceRecords(atts as DailyAttendanceRecord[]);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [uid, activeAcademicYearId, classId]);

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
  const [notes, setNotes] = useState<StudentNote[]>([]);
  const [loading, setLoading] = useState(false);
  const load = useCallback(async () => {
    if (!uid || !studentId) { setNotes([]); return; }
    setLoading(true);
    try {
      const list = await (container.repos as any).studentNote?.getByStudent
        ? (container.repos as any).studentNote.getByStudent(uid, studentId)
        : import('../services/firestore/studentNotes').then(m => m.getStudentNotesByStudent(uid, studentId)) as Promise<StudentNote[]>;
      setNotes(list as StudentNote[]);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [uid, studentId]);
  useEffect(() => { load(); }, [load]);
  const create = useCallback(async (data: Parameters<typeof import('../services/firestore/studentNotes')['createStudentNote']>[1]) => {
    if (!uid) throw new Error('no uid');
    const created: StudentNote = (container.repos as any).studentNote?.create
      ? await (container.repos as any).studentNote.create(uid, data)
      : await import('../services/firestore/studentNotes').then(m => m.createStudentNote(uid, data));
    setNotes(prev => [created, ...prev]);
    return created;
  }, [uid]);
  return { notes, loading, reload: load, create, setNotes };
}
