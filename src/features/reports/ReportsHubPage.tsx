import React, { useState, useEffect } from 'react';
import { useWorkspace } from '../../context/WorkspaceContext';
import { ReportCenterPage } from './ReportCenterPage';
import { AttendanceReportPage } from './AttendanceReportPage';
import { GradesReportPage } from './GradesReportPage';
import { LeggerReportPage } from './LeggerReportPage';
import { JournalReportPage } from './JournalReportPage';
import { StudentReportsPage } from './StudentReportsPage';
import { Printer, SquaresFour, ChartBar, FileText, Table, Bookmark, GraduationCap } from '@phosphor-icons/react';

interface ReportsHubPageProps {
  initialTab?: string;
  onNavigate?: (route: string, state?: any) => void;
}

type ReportTab = 'center' | 'rapor' | 'legger' | 'grades' | 'attendance' | 'journal';

export const ReportsHubPage: React.FC<ReportsHubPageProps> = ({
  initialTab = 'center',
  onNavigate
}) => {
  const { activeAcademicYear, activeSemester } = useWorkspace();
  const [activeTab, setActiveTab] = useState<ReportTab>('center');

  useEffect(() => {
    if (initialTab) {
      const clean = initialTab.replace('reports-', '') as ReportTab;
      if (['center', 'rapor', 'legger', 'grades', 'attendance', 'journal'].includes(clean)) {
        setActiveTab(clean);
      }
    }
  }, [initialTab]);

  const tabs: Array<{ id: ReportTab; label: string; icon: any }> = [
    { id: 'center', label: 'Katalog Laporan', icon: SquaresFour },
    { id: 'rapor', label: 'Cetak Rapor Siswa', icon: GraduationCap },
    { id: 'legger', label: 'Legger Nilai', icon: Table },
    { id: 'grades', label: 'Daftar Nilai', icon: FileText },
    { id: 'attendance', label: 'Rekap Presensi', icon: ChartBar },
    { id: 'journal', label: 'Jurnal Mengajar', icon: Bookmark },
  ];

  return (
    <div className="space-y-5">
      {/* Top Tab Bar Navigation */}
      <div className="no-print bg-[var(--ds-surface-elevated)] p-1.5 rounded-2xl border border-[var(--ds-border)] shadow-xs transition-colors overflow-x-auto [scrollbar-width:none]">
        <div className="flex items-center gap-1 min-w-max">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                id={`tab-report-${tab.id}`}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                  isActive
                    ? 'btn-primary shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-[var(--ds-accent-soft)]'
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
        {activeTab === 'center' && (
          <ReportCenterPage 
            onNavigate={(route) => {
              if (route.startsWith('reports-')) {
                const sub = route.replace('reports-', '') as ReportTab;
                if (['center', 'rapor', 'attendance', 'grades', 'legger', 'journal'].includes(sub)) {
                  setActiveTab(sub);
                  return;
                }
              }
              onNavigate?.(route);
            }} 
          />
        )}
        {activeTab === 'rapor' && <StudentReportsPage onNavigate={onNavigate} />}
        {activeTab === 'attendance' && <AttendanceReportPage />}
        {activeTab === 'grades' && <GradesReportPage />}
        {activeTab === 'legger' && <LeggerReportPage />}
        {activeTab === 'journal' && <JournalReportPage />}
      </div>
    </div>
  );
};
