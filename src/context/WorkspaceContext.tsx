import React, { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import { useAuth } from '../features/auth/AuthContext';
import { AcademicYear, ClassItem, Subject, TeachingAssignment, SemesterType, AttendanceSettings } from '../types';
import { useApplication } from '../application/ApplicationContext';
import { DEFAULT_ATTENDANCE_SETTINGS } from '../domain/defaults';
import { checkIsHoliday as checkIsHolidayDomain } from '../domain/attendance/holiday';

interface WorkspaceContextType {
  academicYears: AcademicYear[];
  activeAcademicYear: AcademicYear | null;
  activeSemester: SemesterType;
  classes: ClassItem[];
  subjects: Subject[];
  teachingAssignments: TeachingAssignment[];
  
  // Selection
  selectedClassId: string;
  selectedSubjectId: string;
  selectedAssignment: TeachingAssignment | null;

  // Attendance & Holiday Settings
  attendanceSettings: AttendanceSettings;
  updateAttendanceSettings: (settings: AttendanceSettings) => Promise<void>;
  checkIsHoliday: (dateStr: string) => { isHoliday: boolean; reason?: string };

  // Actions
  setActiveAcademicYear: (year: AcademicYear) => Promise<void>;
  setActiveSemester: (sem: SemesterType) => Promise<void>;
  setSelectedClassId: (id: string) => void;
  setSelectedSubjectId: (id: string) => void;
  setSelectedAssignment: (assignment: TeachingAssignment | null) => void;
  selectClassWithAutoAssignment: (classId: string) => void;
  
  // Status
  isOnline: boolean;
  syncStatus: 'synced' | 'syncing' | 'saved' | 'offline';
  syncMessage: string;
  loading: boolean;
  reloadWorkspaceData: () => Promise<void>;
  triggerSyncFeedback: (status: 'syncing' | 'saved' | 'synced' | 'offline', message?: string) => void;
}

const WorkspaceContext = createContext<WorkspaceContextType | undefined>(undefined);

export const WorkspaceProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { user, profile } = useAuth();
  const app = useApplication();

  const [academicYears, setAcademicYears] = useState<AcademicYear[]>([]);
  const [activeAcademicYear, setActiveAcademicYearState] = useState<AcademicYear | null>(null);
  const [activeSemester, setActiveSemesterState] = useState<SemesterType>('GANJIL');
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [teachingAssignments, setTeachingAssignments] = useState<TeachingAssignment[]>([]);

  const [selectedClassId, setSelectedClassId] = useState<string>('');
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>('');
  const [selectedAssignment, setSelectedAssignment] = useState<TeachingAssignment | null>(null);

  const [attendanceSettings, setAttendanceSettings] = useState<AttendanceSettings>(DEFAULT_ATTENDANCE_SETTINGS);

  const [loading, setLoading] = useState<boolean>(true);
  const [isOnline, setIsOnline] = useState<boolean>(typeof navigator !== 'undefined' ? navigator.onLine : true);
  const [syncStatus, setSyncStatus] = useState<'synced' | 'syncing' | 'saved' | 'offline'>(
    typeof navigator !== 'undefined' && !navigator.onLine ? 'offline' : 'synced'
  );
  const [syncMessage, setSyncMessage] = useState<string>('Tersinkron ke Database');

  const revertTimerRef = React.useRef<NodeJS.Timeout | null>(null);

  const syncStatusRef = React.useRef(syncStatus);
  syncStatusRef.current = syncStatus;

  const triggerSyncFeedback = useCallback((status: 'syncing' | 'saved' | 'synced' | 'offline', message?: string) => {
    if (revertTimerRef.current) {
      clearTimeout(revertTimerRef.current);
      revertTimerRef.current = null;
    }

    setSyncStatus(status);
    if (message) {
      setSyncMessage(message);
    } else {
      if (status === 'syncing') setSyncMessage('Menyimpan perubahan ke cloud...');
      else if (status === 'saved') setSyncMessage('Perubahan berhasil tersimpan!');
      else if (status === 'offline') setSyncMessage('Mode Offline • Tersimpan lokal');
      else setSyncMessage('Tersinkron ke Database');
    }

    if (status === 'saved') {
      revertTimerRef.current = setTimeout(() => {
        setSyncStatus(navigator.onLine ? 'synced' : 'offline');
        setSyncMessage(navigator.onLine ? 'Tersinkron ke Database' : 'Mode Offline');
        revertTimerRef.current = null;
      }, 2000);
    }
  }, []);

  // Cleanup timer on unmount only
  useEffect(() => {
    return () => {
      if (revertTimerRef.current) {
        clearTimeout(revertTimerRef.current);
      }
    };
  }, []);

  // Listen to network and dadu:sync custom events
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      triggerSyncFeedback('synced', 'Koneksi kembali aktif • Tersinkron');
    };
    const handleOffline = () => {
      setIsOnline(false);
      triggerSyncFeedback('offline', 'Mode Offline • Data disimpan lokal');
    };

    const handleSyncEvent = (e: Event) => {
      const customEvent = e as CustomEvent<{ type: 'start' | 'success' | 'error'; message?: string }>;
      if (!customEvent.detail) return;
      const { type, message } = customEvent.detail;
      if (type === 'start') {
        triggerSyncFeedback('syncing', message || 'Menyimpan perubahan...');
      } else if (type === 'success') {
        triggerSyncFeedback('saved', message || 'Perubahan berhasil tersimpan!');
      } else if (type === 'error') {
        triggerSyncFeedback(navigator.onLine ? 'synced' : 'offline', message || 'Gagal menyimpan perubahan');
      }
    };

    // Warn user before closing tab if there are ongoing sync writes
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (syncStatusRef.current === 'syncing') {
        e.preventDefault();
        e.returnValue = 'Ada perubahan data yang sedang disimpan. Tetap ingin keluar?';
        return e.returnValue;
      }
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    window.addEventListener('dadu:sync', handleSyncEvent);
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('dadu:sync', handleSyncEvent);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [triggerSyncFeedback]);

  const loadData = useCallback(async () => {
    if (!user) {
      setAcademicYears([]);
      setActiveAcademicYearState(null);
      setClasses([]);
      setSubjects([]);
      setTeachingAssignments([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setSyncStatus('syncing');
      
      const result = await app.workspace.loadWorkspace(user.uid, profile?.defaultSemester);
      setAcademicYears(result.academicYears);
      setClasses(result.classes);
      setSubjects(result.subjects);
      setAttendanceSettings(result.attendanceSettings);
      setTeachingAssignments(result.teachingAssignments);
      setActiveAcademicYearState(result.activeAcademicYear);
      setActiveSemesterState(result.activeSemester);
      setSelectedClassId(result.selectedClassId);
      setSelectedAssignment(result.selectedAssignment);

      setSyncStatus('synced');
    } catch (error) {
      console.error('Error loading workspace context data:', error);
      setSyncStatus(navigator.onLine ? 'synced' : 'offline');
    } finally {
      setLoading(false);
    }
  }, [user, profile]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Safely select class and auto-resolve matching teaching assignment to prevent orphan or desynced state
  const selectClassWithAutoAssignment = useCallback((classId: string) => {
    setSelectedClassId(classId);
    if (user) {
      app.workspace.saveUserPreferences(user.uid, { defaultClassId: classId });
    }

    if (teachingAssignments.length > 0) {
      // Find assignments for this newly selected class
      const classAssignments = teachingAssignments.filter(a => a.classId === classId);
      if (classAssignments.length > 0) {
        // If current assignment already belongs to this class, keep it; otherwise switch to first matching assignment
        const currentMatch = classAssignments.find(a => a.id === selectedAssignment?.id);
        if (!currentMatch) {
          setSelectedAssignment(classAssignments[0]);
        }
      }
    }
  }, [user, teachingAssignments, selectedAssignment]);

  const setActiveAcademicYear = async (year: AcademicYear) => {
    setActiveAcademicYearState(year);
    if (user) {
      await app.workspace.saveUserPreferences(user.uid, { defaultAcademicYearId: year.id });
    }
  };

  const setActiveSemester = async (sem: SemesterType) => {
    setActiveSemesterState(sem);
    if (user) {
      await app.workspace.saveUserPreferences(user.uid, { defaultSemester: sem });
    }
  };

  const updateAttendanceSettings = async (newSettings: AttendanceSettings) => {
    setAttendanceSettings(newSettings);
    if (user) {
      await app.workspace.saveAttendanceSettings(user.uid, newSettings);
    }
  };

  const checkIsHoliday = useCallback(
    (dateStr: string): { isHoliday: boolean; reason?: string } =>
      checkIsHolidayDomain(dateStr, attendanceSettings),
    [attendanceSettings],
  );

  return (
    <WorkspaceContext.Provider
      value={{
        academicYears,
        activeAcademicYear,
        activeSemester,
        classes,
        subjects,
        teachingAssignments,
        selectedClassId,
        selectedSubjectId,
        selectedAssignment,
        attendanceSettings,
        updateAttendanceSettings,
        checkIsHoliday,
        setActiveAcademicYear,
        setActiveSemester,
        setSelectedClassId,
        setSelectedSubjectId,
        setSelectedAssignment,
        selectClassWithAutoAssignment,
        isOnline,
        syncStatus,
        syncMessage,
        loading,
        reloadWorkspaceData: loadData,
        triggerSyncFeedback,
      }}
    >
      {children}
    </WorkspaceContext.Provider>
  );
};

export function useWorkspace(): WorkspaceContextType {
  const context = useContext(WorkspaceContext);
  if (!context) {
    throw new Error('useWorkspace must be used within a WorkspaceProvider');
  }
  return context;
}
