import React, { useState, useEffect } from 'react';
import { useWorkspace } from '../../context/WorkspaceContext';
import { TeachingClassesPage } from './TeachingClassesPage';
import { MeetingsJournalPage } from './MeetingsJournalPage';
import { SubjectAttendancePage } from './SubjectAttendancePage';
import { GradesPage } from '../grades/GradesPage';
import { TeacherPersonalSchedulePage } from './TeacherPersonalSchedulePage';
import { BookOpen, Stack, CalendarCheck, CheckSquare, Medal, CalendarDots } from '@phosphor-icons/react';

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
    { id: 'classes', label: 'Rombel Ampuan', icon: Stack },
    { id: 'schedule', label: 'Jadwal Mengajar', icon: CalendarDots },
    { id: 'journal', label: 'Agenda & Jurnal KBM', icon: CalendarCheck },
    { id: 'attendance', label: 'Presensi Sesi Mapel', icon: CheckSquare },
    { id: 'grades', label: 'Penilaian Siswa', icon: Medal },
  ];

  return (
    <div className="space-y-5">
      {/* Top Tab Bar Navigation (Mobile/Tablet only: hidden on desktop to eliminate dual-nav redundancy) */}
      <div className="md:hidden bg-[var(--ds-surface-elevated)] p-1.5 rounded-2xl border border-[var(--ds-border)] shadow-xs transition-colors overflow-x-auto [scrollbar-width:none]">
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
                    ? 'btn-primary shadow-sm'
                    : 'text-[var(--ds-text-muted)] hover:text-[var(--ds-text)] hover:bg-[var(--ds-accent-soft)]'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-accent-primary-text' : 'text-slate-400 dark:text-slate-500'}`} />
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
                {activeTab === 'attendance' && (
          <SubjectAttendancePage
            initialContext={routeState}
            onNavigate={(route, state) => {
              if (route === 'meetings') handleTabChange('journal', state);
              else onNavigate?.(route, state);
            }}
          />
        )}
        {activeTab === 'grades' && <GradesPage />}
      </div>
    </div>
  );
};
