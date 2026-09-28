import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../features/auth/AuthContext';
import { container } from '../application/ports/container';
import type { AcademicYear, ClassItem, Subject, TeachingAssignment, SemesterType, AttendanceSettings } from '../types';

export function useWorkspaceData() {
  const { user, profile } = useAuth();
  const [academicYears, setAcademicYears] = useState<AcademicYear[]>([]);
  const [activeAcademicYear, setActiveAcademicYear] = useState<AcademicYear | null>(null);
  const [activeSemester, setActiveSemester] = useState<SemesterType>('GANJIL');
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [teachingAssignments, setTeachingAssignments] = useState<TeachingAssignment[]>([]);
  const [attendanceSettings, setAttendanceSettings] = useState<AttendanceSettings | null>(null);
  const [selectedClassId, setSelectedClassId] = useState('');
  const [selectedAssignment, setSelectedAssignment] = useState<TeachingAssignment | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!user) { setLoading(false); return; }
    setLoading(true); setError(null);
    try {
      const res = await container.useCases.loadWorkspace(user.uid, profile?.defaultSemester as any);
      setAcademicYears(res.academicYears);
      setActiveAcademicYear(res.activeAcademicYear);
      setActiveSemester(res.activeSemester);
      setClasses(res.classes);
      setSubjects(res.subjects);
      setTeachingAssignments(res.teachingAssignments);
      setAttendanceSettings(res.attendanceSettings as any);
      setSelectedClassId(res.selectedClassId);
      setSelectedAssignment(res.selectedAssignment);
    } catch (e: any) {
      setError(e?.message || 'Gagal memuat workspace');
    } finally { setLoading(false); }
  }, [user, profile?.defaultSemester]);

  useEffect(() => { load(); }, [load]);

  return { academicYears, activeAcademicYear, activeSemester, classes, subjects, teachingAssignments, attendanceSettings, selectedClassId, selectedAssignment, setSelectedClassId, setSelectedAssignment, loading, error, reload: load };
}
