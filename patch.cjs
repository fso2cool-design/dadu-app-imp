const fs = require('fs');
let content = fs.readFileSync('src/context/WorkspaceContext.tsx', 'utf8');

content = content.replace(
  /  \/\/ Status[\s\S]*?const WorkspaceContext =/m,
  `  // Status
  loading: boolean;
  reloadWorkspaceData: () => Promise<void>;
  triggerSyncFeedback: (status: 'syncing' | 'saved' | 'synced' | 'offline', message?: string) => void;
}

export interface WorkspaceSyncContextType {
  isOnline: boolean;
  syncStatus: 'synced' | 'syncing' | 'saved' | 'offline';
  syncMessage: string;
  triggerSyncFeedback: (status: 'syncing' | 'saved' | 'synced' | 'offline', message?: string) => void;
}

export const WorkspaceSyncContext = createContext<WorkspaceSyncContextType | undefined>(undefined);
const WorkspaceContext =`
);

content = content.replace(
  /  const setActiveAcademicYear = async \(year: AcademicYear\) => {[\s\S]*?  const updateAttendanceSettings = async \(newSettings: AttendanceSettings\) => {[\s\S]*?    }\r?\n  };/m,
  `  const setActiveAcademicYear = useCallback(async (year: AcademicYear) => {
    setActiveAcademicYearState(year);
    if (user) {
      await app.workspace.saveUserPreferences(user.uid, { defaultAcademicYearId: year.id });
    }
  }, [user, app]);

  const setActiveSemester = useCallback(async (sem: SemesterType) => {
    setActiveSemesterState(sem);
    if (user) {
      await app.workspace.saveUserPreferences(user.uid, { defaultSemester: sem });
    }
  }, [user, app]);

  const updateAttendanceSettings = useCallback(async (newSettings: AttendanceSettings) => {
    setAttendanceSettings(newSettings);
    if (user) {
      await app.workspace.saveAttendanceSettings(user.uid, newSettings);
    }
  }, [user, app]);`
);

content = content.replace(
  /  return \([\s\S]*?    <\/WorkspaceContext\.Provider>\r?\n  \);\r?\n};\r?\n\r?\nexport function useWorkspace/m,
  `  const syncValue = React.useMemo(() => ({
    isOnline,
    syncStatus,
    syncMessage,
    triggerSyncFeedback,
  }), [isOnline, syncStatus, syncMessage, triggerSyncFeedback]);

  const workspaceValue = React.useMemo(() => ({
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
    loading,
    reloadWorkspaceData: loadData,
    triggerSyncFeedback,
  }), [
    academicYears, activeAcademicYear, activeSemester, classes, subjects,
    teachingAssignments, selectedClassId, selectedSubjectId, selectedAssignment,
    attendanceSettings, updateAttendanceSettings, checkIsHoliday,
    setActiveAcademicYear, setActiveSemester, selectClassWithAutoAssignment,
    loading, loadData, triggerSyncFeedback
  ]);

  return (
    <WorkspaceSyncContext.Provider value={syncValue}>
      <WorkspaceContext.Provider value={workspaceValue}>
        {children}
      </WorkspaceContext.Provider>
    </WorkspaceSyncContext.Provider>
  );
};

export function useWorkspaceSync(): WorkspaceSyncContextType {
  const context = useContext(WorkspaceSyncContext);
  if (!context) {
    throw new Error('useWorkspaceSync must be used within a WorkspaceProvider');
  }
  return context;
}

export function useWorkspace`
);

fs.writeFileSync('src/context/WorkspaceContext.tsx', content);
