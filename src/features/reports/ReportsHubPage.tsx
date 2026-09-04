import React, { useState, useEffect } from 'react';
import { useWorkspace } from '../../context/WorkspaceContext';
import { ReportCenterPage } from './ReportCenterPage';
import { AttendanceReportPage } from './AttendanceReportPage';
import { GradesReportPage } from './GradesReportPage';
import { LeggerReportPage } from './LeggerReportPage';
import { JournalReportPage } from './JournalReportPage';
import { 
  Printer, 
  LayoutGrid, 
  BarChart3, 
  FileText, 
  Table, 
  BookMarked 
} from 'lucide-react';

interface ReportsHubPageProps {
  initialTab?: string;
  onNavigate?: (route: string, state?: any) => void;
}

type ReportTab = 'center' | 'attendance' | 'grades' | 'legger' | 'journal';

export const ReportsHubPage: React.FC<ReportsHubPageProps> = ({
  initialTab = 'center',
  onNavigate
}) => {
  const { activeAcademicYear, activeSemester } = useWorkspace();
  const [activeTab, setActiveTab] = useState<ReportTab>('center');

  useEffect(() => {
    if (initialTab) {
      const clean = initialTab.replace('reports-', '') as ReportTab;
      if (['center', 'attendance', 'grades', 'legger', 'journal'].includes(clean)) {
        setActiveTab(clean);
      }
    }
  }, [initialTab]);

  const tabs: Array<{ id: ReportTab; label: string; icon: any }> = [
    { id: 'center', label: 'Katalog Laporan', icon: LayoutGrid },
    { id: 'attendance', label: 'Rekap Presensi', icon: BarChart3 },
    { id: 'grades', label: 'Daftar Nilai', icon: FileText },
    { id: 'legger', label: 'Legger Nilai', icon: Table },
    { id: 'journal', label: 'Jurnal Mengajar', icon: BookMarked },
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
                id={`tab-report-${tab.id}`}
                type="button"
                onClick={() => setActiveTab(tab.id)}
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
        {activeTab === 'center' && (
          <ReportCenterPage 
            onNavigate={(route) => {
              if (route.startsWith('reports-')) {
                const sub = route.replace('reports-', '') as ReportTab;
                if (['attendance', 'grades', 'legger', 'journal'].includes(sub)) {
                  setActiveTab(sub);
                  return;
                }
              }
              onNavigate?.(route);
            }} 
          />
        )}
        {activeTab === 'attendance' && <AttendanceReportPage />}
        {activeTab === 'grades' && <GradesReportPage />}
        {activeTab === 'legger' && <LeggerReportPage />}
        {activeTab === 'journal' && <JournalReportPage />}
      </div>
    </div>
  );
};
