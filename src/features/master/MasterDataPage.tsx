import React, { useState, useEffect } from 'react';
import { useWorkspace } from '../../context/WorkspaceContext';
import { StudentsMasterPage } from '../students/StudentsMasterPage';
import { ClassesPage } from './ClassesPage';
import { SubjectsPage } from './SubjectsPage';
import { TeachingAssignmentsPage } from './TeachingAssignmentsPage';
import { AcademicYearsPage } from './AcademicYearsPage';
import { 
  Database, 
  UserCheck, 
  Layers, 
  BookOpen, 
  Briefcase, 
  Calendar,
  Sparkles
} from 'lucide-react';

interface MasterDataPageProps {
  initialTab?: string;
  onNavigate?: (route: string, state?: any) => void;
}

type MasterTab = 'students' | 'classes' | 'subjects' | 'teaching' | 'academic-years';

export const MasterDataPage: React.FC<MasterDataPageProps> = ({ 
  initialTab,
  onNavigate 
}) => {
  const { activeAcademicYear, activeSemester, teachingAssignments } = useWorkspace();
  
  const [activeTab, setActiveTab] = useState<MasterTab>(() => {
    if (initialTab) {
      const clean = initialTab.replace('master-', '') as MasterTab;
      if (['students', 'classes', 'subjects', 'teaching', 'academic-years'].includes(clean)) {
        return clean;
      }
    }
    try {
      const saved = localStorage.getItem('dadu_master_active_tab') as MasterTab;
      if (saved && ['students', 'classes', 'subjects', 'teaching', 'academic-years'].includes(saved)) {
        return saved;
      }
    } catch {}
    return 'students';
  });

  useEffect(() => {
    if (initialTab && initialTab !== 'master') {
      const clean = initialTab.replace('master-', '') as MasterTab;
      if (['students', 'classes', 'subjects', 'teaching', 'academic-years'].includes(clean)) {
        setActiveTab(clean);
      }
    }
  }, [initialTab]);

  const handleTabChange = (tabId: MasterTab) => {
    setActiveTab(tabId);
    try {
      localStorage.setItem('dadu_master_active_tab', tabId);
    } catch {}
    if (onNavigate) {
      onNavigate(`master-${tabId}`);
    }
  };

  const tabs: Array<{ id: MasterTab; label: string; icon: any; desc: string }> = [
    { id: 'academic-years', label: 'Tahun Ajaran', icon: Calendar, desc: 'Periode aktif & semester' },
    { id: 'classes', label: 'Data Rombel / Kelas', icon: Layers, desc: 'Rombel, tingkat & wali kelas' },
    { id: 'students', label: 'Data Siswa Terpadu', icon: UserCheck, desc: 'Database seluruh siswa & NISN' },
    { id: 'subjects', label: 'Mata Pelajaran', icon: BookOpen, desc: 'Kurikulum & kode mapel' },
    { id: 'teaching', label: 'Plotting Mengajar', icon: Briefcase, desc: 'Distribusi beban ajar guru' },
  ];

  return (
    <div className="space-y-5">
      {/* Top Banner Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-[#141722] p-5 sm:p-6 rounded-2xl border border-slate-200 dark:border-[#232838] shadow-xs transition-colors">
        <div className="flex items-center gap-3">
          <span className="p-2.5 rounded-xl bg-orange-500/10 dark:bg-cyan-500/10 text-orange-600 dark:text-cyan-400 border border-orange-500/20 dark:border-cyan-500/30">
            <Database className="w-5 h-5" />
          </span>
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              Data Master Madrasah
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Pusat pengelolaan data pokok madrasah: tahun ajaran, kelas, siswa, mata pelajaran, dan plotting guru.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <span className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-[#0c0e15] border border-slate-200 dark:border-[#232838] text-[11px] font-semibold text-slate-700 dark:text-slate-300">
            T.A {activeAcademicYear?.label || '-'} • Sem. {activeSemester}
          </span>
        </div>
      </div>

      {/* Tab Bar Navigation (Mobile/Tablet only: hidden on desktop to eliminate dual-nav redundancy) */}
      <div className="md:hidden bg-white dark:bg-[#141722] p-1.5 rounded-2xl border border-slate-200 dark:border-[#232838] shadow-xs transition-colors overflow-x-auto [scrollbar-width:none]">
        <div className="flex items-center gap-1 min-w-max">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                id={`tab-master-${tab.id}`}
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

      {/* Tab Content Panels */}
      <div className="animate-in fade-in duration-150">
        {activeTab === 'students' && <StudentsMasterPage isHomeroomView={false} />}
        {activeTab === 'classes' && <ClassesPage />}
        {activeTab === 'subjects' && <SubjectsPage />}
        {activeTab === 'teaching' && <TeachingAssignmentsPage />}
        {activeTab === 'academic-years' && <AcademicYearsPage />}
      </div>
    </div>
  );
};
