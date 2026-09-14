import React, { useState, useEffect } from 'react';
import { useWorkspace } from '../../context/WorkspaceContext';
import { TeachingClassesPage } from './TeachingClassesPage';
import { MeetingsJournalPage } from './MeetingsJournalPage';
import { SubjectAttendancePage } from './SubjectAttendancePage';
import { GradesPage } from '../grades/GradesPage';
import { TeacherPersonalSchedulePage } from './TeacherPersonalSchedulePage';
import { 
  BookOpen, 
  Layers, 
  CalendarCheck2, 
  CheckSquare, 
  Award,
  CalendarDays 
} from 'lucide-react';

interface TeacherHubPageProps {
  initialTab?: string;
  routeState?: any;
  onNavigate?: (route: string, state?: any) => void;
}

type TeacherTab = 'classes' | 'schedule' | 'journal' | 'attendance' | 'grades';

export const TeacherHubPage: React.FC<TeacherHubPageProps> = ({
  initialTab = 'classes',
  routeState,
  onNavigate
}) => {
  const { activeAcademicYear, activeSemester } = useWorkspace();
  const [activeTab, setActiveTab] = useState<TeacherTab>('classes');

  useEffect(() => {
    if (initialTab) {
      const clean = initialTab.replace('teacher-', '');
      if (clean === 'classes' || clean === 'teaching-classes' || clean === 'teacher') setActiveTab('classes');
      else if (clean === 'schedule' || clean === 'timetable' || clean === 'teaching-schedule') setActiveTab('schedule');
      else if (clean === 'meetings' || clean === 'journal') setActiveTab('journal');
      else if (clean === 'attendance-subject' || clean === 'attendance') setActiveTab('attendance');
      else if (clean === 'grades') setActiveTab('grades');
    }
  }, [initialTab]);

  const handleTabChange = (tabId: TeacherTab, state?: any) => {
    setActiveTab(tabId);
    if (onNavigate) {
      let targetRoute = 'teaching-classes';
      if (tabId === 'schedule') targetRoute = 'teaching-schedule';
      else if (tabId === 'journal') targetRoute = 'meetings';
      else if (tabId === 'attendance') targetRoute = 'attendance-subject';
      else if (tabId === 'grades') targetRoute = 'grades';
      onNavigate(targetRoute, state);
    }
  };

  const tabs: Array<{ id: TeacherTab; label: string; icon: any }> = [
    { id: 'classes', label: 'Rombel Ampuan', icon: Layers },
    { id: 'schedule', label: 'Jadwal Mengajar', icon: CalendarDays },
    { id: 'journal', label: 'Agenda & Jurnal KBM', icon: CalendarCheck2 },
    { id: 'attendance', label: 'Presensi Sesi Mapel', icon: CheckSquare },
    { id: 'grades', label: 'Penilaian Siswa', icon: Award },
  ];

  return (
    <div className="space-y-5">
      {/* Top Tab Bar Navigation (Mobile/Tablet only: hidden on desktop to eliminate dual-nav redundancy) */}
      <div className="md:hidden bg-white dark:bg-[#141722] p-1.5 rounded-2xl border border-slate-200 dark:border-[#232838] shadow-xs transition-colors overflow-x-auto [scrollbar-width:none]">
        <div className="flex items-center gap-1 min-w-max">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                id={`tab-teacher-${tab.id}`}
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
        {activeTab === 'classes' && (
          <TeachingClassesPage 
            onNavigate={(route, state) => {
              if (route === 'meetings') handleTabChange('journal', state);
              else if (route === 'attendance-subject') handleTabChange('attendance', state);
              else if (route === 'grades') handleTabChange('grades', state);
              else if (route === 'teaching-schedule') handleTabChange('schedule', state);
              else onNavigate?.(route, state);
            }} 
          />
        )}
        {activeTab === 'schedule' && (
          <TeacherPersonalSchedulePage onNavigate={onNavigate} />
        )}
        {activeTab === 'journal' && (
          <MeetingsJournalPage 
            initialAssignmentId={routeState?.assignmentId} 
            onNavigate={onNavigate} 
          />
        )}
        {activeTab === 'attendance' && <SubjectAttendancePage />}
        {activeTab === 'grades' && <GradesPage />}
      </div>
    </div>
  );
};
