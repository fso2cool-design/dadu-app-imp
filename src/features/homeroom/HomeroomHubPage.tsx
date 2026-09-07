import React, { useState, useEffect } from 'react';
import { useWorkspace } from '../../context/WorkspaceContext';
import { HomeroomDashboardPage } from './HomeroomDashboardPage';
import { HomeroomDailyAttendancePage } from './HomeroomDailyAttendancePage';
import { HomeroomMonthlyAttendancePage } from './HomeroomMonthlyAttendancePage';
import { HomeroomStudentsPage } from './HomeroomStudentsPage';
import { HomeroomNotesPage } from './HomeroomNotesPage';
import { 
  Users, 
  LayoutDashboard, 
  CalendarDays, 
  CalendarRange, 
  FileSpreadsheet, 
  StickyNote,
  GraduationCap
} from 'lucide-react';

interface HomeroomHubPageProps {
  initialTab?: string;
  routeState?: any;
  onNavigate?: (route: string, state?: any) => void;
}

type HomeroomTab = 'dashboard' | 'daily-attendance' | 'monthly-attendance' | 'students' | 'notes';

export const HomeroomHubPage: React.FC<HomeroomHubPageProps> = ({
  initialTab = 'dashboard',
  routeState,
  onNavigate
}) => {
  const { activeAcademicYear, activeSemester, classes, selectedClassId, setSelectedClassId } = useWorkspace();
  const [activeTab, setActiveTab] = useState<HomeroomTab>('dashboard');

  useEffect(() => {
    if (initialTab) {
      const clean = initialTab.replace('homeroom-', '');
      if (['dashboard', 'attendance-daily', 'daily-attendance', 'attendance-monthly', 'monthly-attendance', 'students', 'notes'].includes(clean)) {
        if (clean === 'attendance-daily') setActiveTab('daily-attendance');
        else if (clean === 'attendance-monthly') setActiveTab('monthly-attendance');
        else setActiveTab(clean as HomeroomTab);
      }
    }
  }, [initialTab]);

  const handleTabChange = (tabId: HomeroomTab) => {
    setActiveTab(tabId);
    if (onNavigate) {
      onNavigate(`homeroom-${tabId}`);
    }
  };

  const tabs: Array<{ id: HomeroomTab; label: string; icon: any }> = [
    { id: 'dashboard', label: 'Dashboard Binaan', icon: LayoutDashboard },
    { id: 'daily-attendance', label: 'Presensi Harian', icon: CalendarDays },
    { id: 'monthly-attendance', label: 'Presensi Bulanan', icon: CalendarRange },
    { id: 'students', label: 'Data Siswa Kelas', icon: FileSpreadsheet },
    { id: 'notes', label: 'Catatan & Sikap', icon: StickyNote },
  ];

  return (
    <div className="space-y-5">
      {/* Top Tab Bar Navigation */}
      <div className="bg-white dark:bg-[#141722] p-1.5 rounded-2xl border border-slate-200 dark:border-[#232838] shadow-xs transition-colors overflow-x-auto [scrollbar-width:none]">
        <div className="flex items-center gap-1 min-w-max">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                id={`tab-homeroom-${tab.id}`}
                type="button"
                onClick={() => handleTabChange(tab.id)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                  isActive
                    ? 'bg-orange-500 text-white dark:bg-cyan-500 dark:text-slate-950 shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100/80 dark:hover:bg-[#1b1f2e]'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-white dark:text-slate-950' : 'text-slate-400 dark:text-slate-500'}`} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab Panels */}
      <div className="animate-in fade-in duration-150">
        {activeTab === 'dashboard' && (
          <HomeroomDashboardPage 
            onNavigate={(route, state) => {
              if (route.startsWith('homeroom-')) {
                const sub = route.replace('homeroom-', '');
                if (sub === 'attendance-daily') setActiveTab('daily-attendance');
                else if (sub === 'attendance-monthly') setActiveTab('monthly-attendance');
                else if (sub === 'students') setActiveTab('students');
                else if (sub === 'notes') setActiveTab('notes');
                else onNavigate?.(route, state);
              } else {
                onNavigate?.(route, state);
              }
            }} 
          />
        )}
        {activeTab === 'daily-attendance' && (
          <HomeroomDailyAttendancePage 
            initialClassId={routeState?.classId} 
            initialDate={routeState?.date} 
          />
        )}
        {activeTab === 'monthly-attendance' && (
          <HomeroomMonthlyAttendancePage />
        )}
        {activeTab === 'students' && (
          <HomeroomStudentsPage 
            onNavigate={(route, state) => {
              if (route.startsWith('homeroom-')) {
                const sub = route.replace('homeroom-', '');
                if (sub === 'notes') setActiveTab('notes');
                else onNavigate?.(route, state);
              } else {
                onNavigate?.(route, state);
              }
            }} 
          />
        )}
        {activeTab === 'notes' && (
          <HomeroomNotesPage 
            initialClassId={routeState?.classId} 
            initialStudentId={routeState?.studentId} 
          />
        )}
      </div>
    </div>
  );
};
