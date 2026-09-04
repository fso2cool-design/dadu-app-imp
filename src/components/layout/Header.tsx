import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  Menu, 
  ChevronDown, 
  Clock, 
  Maximize2, 
  Minimize2, 
  Cloud, 
  CloudOff, 
  RefreshCw, 
  Settings, 
  LogOut, 
  Sparkles,
  Check,
  MessageSquareHeart,
} from 'lucide-react';
import { useAuth } from '../../features/auth/AuthContext';
import { useWorkspace } from '../../context/WorkspaceContext';
import { useAppTheme } from '../../context/ThemeContext';

interface HeaderProps {
  currentRoute: string;
  onOpenMobileMenu: () => void;
  onNavigate: (route: string) => void;
  onOpenAdminPanel?: () => void;
  adminBadgeCount?: number;
  onOpenFeedbackModal?: () => void;
}

// Hook to detect click outside
function useClickOutside(ref: React.RefObject<HTMLElement | null>, handler: () => void, active: boolean) {
  useEffect(() => {
    if (!active) return;
    const listener = (event: MouseEvent | TouchEvent) => {
      if (!ref.current || ref.current.contains(event.target as Node)) {
        return;
      }
      handler();
    };
    document.addEventListener('mousedown', listener);
    document.addEventListener('touchstart', listener);
    return () => {
      document.removeEventListener('mousedown', listener);
      document.removeEventListener('touchstart', listener);
    };
  }, [ref, handler, active]);
}

// Natural alphabetical & numerical sorter for class names (e.g. X-A, X-B, XI-A, XII-A)
function parseClassOrder(className: string): { grade: number; letter: string } {
  const clean = className.trim().toUpperCase();
  let grade = 99;
  if (clean.startsWith('X-') || clean.startsWith('10-') || clean === 'X' || clean === '10') grade = 10;
  else if (clean.startsWith('XI-') || clean.startsWith('11-') || clean === 'XI' || clean === '11') grade = 11;
  else if (clean.startsWith('XII-') || clean.startsWith('12-') || clean === 'XII' || clean === '12') grade = 12;
  else if (clean.startsWith('VII-') || clean.startsWith('7-')) grade = 7;
  else if (clean.startsWith('VIII-') || clean.startsWith('8-')) grade = 8;
  else if (clean.startsWith('IX-') || clean.startsWith('9-')) grade = 9;

  const letter = clean.replace(/^(X|XI|XII|VII|VIII|IX|10|11|12|7|8|9)[-\s]*/, '');
  return { grade, letter };
}

export const Header: React.FC<HeaderProps> = ({
  currentRoute,
  onOpenMobileMenu,
  onNavigate,
  onOpenAdminPanel,
  adminBadgeCount = 0,
  onOpenFeedbackModal,
}) => {
  const { profile, logout } = useAuth();
  const { 
    academicYears,
    activeAcademicYear, 
    activeSemester, 
    teachingAssignments, 
    selectedAssignment, 
    setSelectedAssignment,
    selectClassWithAutoAssignment,
    setActiveAcademicYear,
    setActiveSemester,
    syncStatus,
    syncMessage,
    reloadWorkspaceData,
    triggerSyncFeedback
  } = useWorkspace();
  const { activeTheme } = useAppTheme();
  const isDark = activeTheme === 'dark-crimson';

  const [localTime, setLocalTime] = useState<string>('');
  const [localTimeZone, setLocalTimeZone] = useState<string>('');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showClassDropdown, setShowClassDropdown] = useState(false);
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [showAdvancedSettings, setShowAdvancedSettings] = useState(false);

  const handleManualSync = async () => {
    if (syncStatus === 'syncing') return;
    try {
      triggerSyncFeedback('syncing', 'Memeriksa sinkronisasi database...');
      await reloadWorkspaceData();
      triggerSyncFeedback('saved', 'Semua data tersinkron sempurna!');
    } catch {
      triggerSyncFeedback(navigator.onLine ? 'synced' : 'offline', 'Gagal memuat sinkronisasi');
    }
  };

  const isAdmin = profile?.role === 'ADMIN' || profile?.email === 'johanrovian90@gmail.com';

  // Live Local Time Updater with dynamic Local Timezone
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const timeFormatted = now.toLocaleTimeString([], { 
        hour: '2-digit', 
        minute: '2-digit', 
        second: '2-digit',
        hour12: false 
      });

      let tzAbbr = '';
      try {
        const parts = new Intl.DateTimeFormat([], { timeZoneName: 'short' }).formatToParts(now);
        tzAbbr = parts.find(p => p.type === 'timeZoneName')?.value || '';
      } catch {
        tzAbbr = '';
      }

      setLocalTime(timeFormatted);
      setLocalTimeZone(tzAbbr);
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Fullscreen State Listener
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const toggleFullscreen = async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
      } else {
        if (document.exitFullscreen) {
          await document.exitFullscreen();
        }
      }
    } catch (err) {
      console.warn('Fullscreen API error:', err);
    }
  };

  const classDropdownRef = useRef<HTMLDivElement>(null);
  const userDropdownRef = useRef<HTMLDivElement>(null);

  useClickOutside(classDropdownRef, () => {
    setShowClassDropdown(false);
    setShowAdvancedSettings(false);
  }, showClassDropdown);

  useClickOutside(userDropdownRef, () => {
    setShowUserDropdown(false);
  }, showUserDropdown);

  // Sort teaching assignments naturally by grade level and section
  const sortedAssignments = useMemo(() => {
    return [...teachingAssignments].sort((a, b) => {
      const orderA = parseClassOrder(a.className);
      const orderB = parseClassOrder(b.className);

      if (orderA.grade !== orderB.grade) {
        return orderA.grade - orderB.grade;
      }
      return orderA.letter.localeCompare(orderB.letter, undefined, { numeric: true });
    });
  }, [teachingAssignments]);

  return (
    <header className="h-14 lg:h-16 bg-white/90 dark:bg-[#0c0e15]/90 backdrop-blur-md border-b border-slate-200/90 dark:border-[#232838] px-3 sm:px-5 flex items-center justify-between sticky top-0 z-30 select-none transition-colors">
      {/* Left Side: Class/Subject Focus Switcher, Clock, Cloud Sync, & Fullscreen (Ultra-Compact Left Group) */}
      <div className="flex items-center gap-2 sm:gap-2.5 flex-1 min-w-0">
        {/* 1. Class & Subject Context Switcher with Natural Ordering */}
        <div className="relative shrink-0" ref={classDropdownRef}>
          <button
            type="button"
            onClick={() => {
              setShowClassDropdown(!showClassDropdown);
              setShowUserDropdown(false);
            }}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-100/90 dark:bg-[#141722] hover:bg-slate-200/80 dark:hover:bg-[#1b1f2e] border border-slate-200/90 dark:border-[#232838] text-slate-800 dark:text-slate-200 text-xs font-semibold transition-all cursor-pointer shadow-2xs group"
          >
            <div className="w-6 h-6 rounded-lg bg-orange-50 dark:bg-cyan-950/70 border border-orange-200/60 dark:border-cyan-500/40 text-orange-600 dark:text-cyan-400 flex items-center justify-center font-black text-[11px] shrink-0">
              {selectedAssignment ? selectedAssignment.className.split('-')[0] : 'K'}
            </div>

            {selectedAssignment ? (
              <div className="flex items-center gap-1 sm:gap-1.5">
                <span className="font-bold text-slate-900 dark:text-slate-100 whitespace-nowrap text-xs">
                  Kelas {selectedAssignment.className}
                </span>
                <span className="text-slate-300 dark:text-slate-600 hidden sm:inline">•</span>
                <span className="text-orange-600 dark:text-cyan-400 font-medium max-w-[90px] xs:max-w-[130px] sm:max-w-[180px] md:max-w-[220px] truncate hidden sm:inline">
                  {selectedAssignment.subjectName}
                </span>
              </div>
            ) : (
              <span className="text-slate-500 dark:text-slate-400 font-medium">Pilih Rombel & Mapel</span>
            )}

            <ChevronDown className={`w-3.5 h-3.5 text-slate-400 group-hover:text-slate-700 dark:group-hover:text-slate-200 transition-transform ${showClassDropdown ? 'rotate-180' : ''}`} />
          </button>

          {/* Class Switcher Dropdown Modal */}
          {showClassDropdown && (
            <div 
              className="absolute left-0 mt-2 w-72 sm:w-80 rounded-2xl bg-white dark:bg-[#141722] p-3 shadow-2xl border border-slate-200 dark:border-[#232838] z-50 animate-in fade-in slide-in-from-top-2"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-[#232838] pb-2.5 mb-2.5">
                <div>
                  <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                    Ganti Fokus Kelas & Mapel
                  </h4>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400">
                    Pilih rombel untuk input presensi, jurnal, atau penilaian
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowAdvancedSettings(!showAdvancedSettings)}
                  className="text-[10px] font-semibold text-orange-600 dark:text-cyan-400 hover:underline cursor-pointer"
                >
                  {showAdvancedSettings ? 'Tutup TA' : 'Ubah TA/Sem'}
                </button>
              </div>

              {/* Optional Year & Semester Selector inside Dropdown */}
              {showAdvancedSettings && (
                <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-[#0c0e15] border border-slate-200/80 dark:border-[#232838] mb-3 space-y-2">
                  <div>
                    <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 block mb-1">Tahun Ajaran:</span>
                    <div className="flex flex-wrap gap-1">
                      {academicYears.map(year => (
                        <button
                          key={year.id}
                          type="button"
                          onClick={() => setActiveAcademicYear(year)}
                          className={`px-2 py-1 rounded text-[11px] font-medium border transition-colors ${
                            activeAcademicYear?.id === year.id
                              ? 'bg-orange-500 text-white border-orange-500 dark:bg-cyan-500 dark:text-slate-950 dark:border-cyan-500 font-bold'
                              : 'bg-white dark:bg-[#141722] text-slate-700 dark:text-slate-300 border-slate-200 dark:border-[#232838]'
                          }`}
                        >
                          {year.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 block mb-1">Semester:</span>
                    <div className="flex gap-1">
                      {(['GANJIL', 'GENAP'] as const).map(sem => (
                        <button
                          key={sem}
                          type="button"
                          onClick={() => setActiveSemester(sem)}
                          className={`flex-1 py-1 rounded text-[11px] font-medium border transition-colors ${
                            activeSemester === sem
                              ? 'bg-orange-500 text-white border-orange-500 dark:bg-cyan-500 dark:text-slate-950 dark:border-cyan-500 font-bold'
                              : 'bg-white dark:bg-[#141722] text-slate-700 dark:text-slate-300 border-slate-200 dark:border-[#232838]'
                          }`}
                        >
                          {sem === 'GANJIL' ? 'Ganjil' : 'Genap'}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* List of Teaching Assignments (Sorted Naturally) */}
              <div className="max-h-64 overflow-y-auto space-y-1 pr-0.5">
                {sortedAssignments.length === 0 ? (
                  <div className="text-center py-6 text-xs text-slate-400 dark:text-slate-500">
                    Belum ada rombel terdaftar
                  </div>
                ) : (
                  sortedAssignments.map(assign => {
                    const isSelected = selectedAssignment?.id === assign.id;
                    return (
                      <button
                        key={assign.id}
                        type="button"
                        onClick={() => {
                          setSelectedAssignment(assign);
                          if (assign.classId) {
                            selectClassWithAutoAssignment(assign.classId);
                          }
                          setShowClassDropdown(false);
                        }}
                        className={`w-full p-2 rounded-xl text-xs text-left flex items-center justify-between transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-orange-500 text-white dark:bg-cyan-500 dark:text-slate-950 font-bold shadow-xs'
                            : 'hover:bg-slate-100 dark:hover:bg-[#1b1f2e] text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 truncate">
                          <span className={`font-bold px-2 py-0.5 rounded text-[11px] shrink-0 ${
                            isSelected ? 'bg-white/20 text-white dark:bg-black/20 dark:text-slate-950' : 'bg-slate-100 dark:bg-[#0c0e15] text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-[#232838]'
                          }`}>
                            {assign.className}
                          </span>
                          <span className={`truncate ${isSelected ? 'text-white dark:text-slate-950' : 'text-slate-600 dark:text-slate-400'}`}>
                            {assign.subjectName}
                          </span>
                        </div>
                        {isSelected && <Check className="w-3.5 h-3.5 shrink-0" />}
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>

        {/* 2. Live Local Clock Widget */}
        <div className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100/90 dark:bg-[#141722] border border-slate-200/90 dark:border-[#232838] text-slate-700 dark:text-slate-300 text-xs font-mono font-bold shadow-2xs shrink-0">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <Clock className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
          <span>{localTime || '--:--:--'}</span>
          {localTimeZone && (
            <span className="text-[10px] text-slate-400 dark:text-slate-500 font-sans font-semibold">
              {localTimeZone}
            </span>
          )}
        </div>

        {/* 3. Sync Status Indicator (Interactive & Animated) */}
        <div className="relative group shrink-0">
          <button
            type="button"
            onClick={handleManualSync}
            disabled={syncStatus === 'syncing'}
            className={`p-2 rounded-xl border flex items-center justify-center transition-all cursor-pointer shadow-2xs relative ${
              syncStatus === 'syncing'
                ? 'bg-orange-50 dark:bg-cyan-950/60 border-orange-300 dark:border-cyan-500/60 text-orange-600 dark:text-cyan-400 ring-2 ring-orange-400/20 dark:ring-cyan-500/20'
                : syncStatus === 'saved'
                ? 'bg-emerald-100 dark:bg-emerald-950/70 border-emerald-300 dark:border-emerald-400 text-emerald-600 dark:text-emerald-300 ring-2 ring-emerald-400/30 scale-105'
                : syncStatus === 'offline'
                ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-300 dark:border-amber-500/40 text-amber-600 dark:text-amber-400'
                : 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200/80 dark:border-emerald-500/40 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/50'
            }`}
            aria-label={syncMessage}
            title={syncMessage}
          >
            {syncStatus === 'syncing' && (
              <RefreshCw className="w-3.5 h-3.5 animate-spin text-orange-600 dark:text-cyan-400" />
            )}
            {syncStatus === 'saved' && (
              <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-300 animate-in zoom-in duration-200" />
            )}
            {syncStatus === 'synced' && (
              <Cloud className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 transition-transform group-hover:scale-110" />
            )}
            {syncStatus === 'offline' && (
              <CloudOff className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 animate-pulse" />
            )}

            {/* Live activity dot for saving */}
            {syncStatus === 'syncing' && (
              <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-orange-500 dark:bg-cyan-400 animate-ping" />
            )}
          </button>

          {/* Floating Tooltip */}
          <div className="absolute top-full mt-1.5 left-1/2 -translate-x-1/2 px-2.5 py-1.5 bg-slate-900 dark:bg-[#141722] text-white text-[10px] font-medium rounded-lg shadow-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50 border border-slate-800 dark:border-[#232838] flex items-center gap-1.5">
            <span className={`w-1.5 h-1.5 rounded-full ${
              syncStatus === 'syncing' ? 'bg-orange-400 animate-ping' :
              syncStatus === 'saved' ? 'bg-emerald-400' :
              syncStatus === 'offline' ? 'bg-amber-400' : 'bg-emerald-400'
            }`} />
            <span>{syncMessage}</span>
          </div>
        </div>

        {/* 4. Fullscreen Button (Immediately next to Cloud Indicator) */}
        <div className="relative group hidden sm:flex shrink-0">
          <button
            type="button"
            onClick={toggleFullscreen}
            className="p-2 rounded-xl bg-slate-100/90 hover:bg-slate-200/80 dark:bg-[#141722] dark:hover:bg-[#1b1f2e] border border-slate-200/90 dark:border-[#232838] text-slate-600 dark:text-slate-300 transition-all cursor-pointer shadow-2xs"
            aria-label={isFullscreen ? 'Keluar Layar Penuh (Esc)' : 'Mode Layar Penuh'}
          >
            {isFullscreen ? (
              <Minimize2 className="w-3.5 h-3.5 text-orange-600 dark:text-cyan-400" />
            ) : (
              <Maximize2 className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
            )}
          </button>
          <div className="absolute top-full mt-1.5 left-1/2 -translate-x-1/2 px-2.5 py-1 bg-slate-900 dark:bg-[#141722] text-white text-[10px] font-medium rounded-lg shadow-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50 border border-slate-800 dark:border-[#232838]">
            {isFullscreen ? 'Keluar Layar Penuh' : 'Mode Layar Penuh'}
          </div>
        </div>
      </div>

      {/* Right Side: User Profile Dropdown ONLY */}
      <div className="flex items-center shrink-0 ml-2">
        <div className="relative" ref={userDropdownRef}>
          <button
            type="button"
            onClick={() => {
              setShowUserDropdown(!showUserDropdown);
              setShowClassDropdown(false);
            }}
            className="flex items-center gap-2 p-1 rounded-xl hover:bg-slate-100 dark:hover:bg-[#141722] text-slate-700 dark:text-slate-300 text-xs transition-colors cursor-pointer"
          >
            <div className="relative w-8 h-8 rounded-full bg-orange-100 dark:bg-cyan-950/80 border border-orange-200 dark:border-cyan-500/50 text-orange-700 dark:text-cyan-300 font-bold flex items-center justify-center text-xs">
              {profile?.displayName?.charAt(0) || 'G'}
              {isAdmin && adminBadgeCount > 0 && (
                <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                  <span className="relative inline-flex items-center justify-center rounded-full h-3.5 w-3.5 bg-rose-600 text-[8px] font-black text-white">
                    {adminBadgeCount > 9 ? '9+' : adminBadgeCount}
                  </span>
                </span>
              )}
            </div>
            <div className="text-left hidden md:block">
              <div className="font-bold text-slate-800 dark:text-slate-100 text-xs leading-none">
                {profile?.displayName || 'Guru'}
              </div>
              <div className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">
                {isAdmin ? 'Administrator' : 'Guru'}
              </div>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 hidden md:block" />
          </button>

          {/* Profile Dropdown Menu */}
          {showUserDropdown && (
            <div 
              className="absolute right-0 mt-2 w-64 rounded-2xl bg-white dark:bg-[#141722] p-2 shadow-2xl border border-slate-200 dark:border-[#232838] z-50 animate-in fade-in slide-in-from-top-2"
            >
              <div className="p-3 border-b border-slate-100 dark:border-[#232838] mb-1">
                <p className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate">{profile?.displayName}</p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">{profile?.email}</p>
                <span className="inline-block mt-1 px-2 py-0.5 rounded text-[10px] font-bold bg-orange-50 dark:bg-cyan-950/60 text-orange-700 dark:text-cyan-300 border border-orange-200/50 dark:border-cyan-500/50">
                  {isAdmin ? 'ADMINISTRATOR' : 'GURU'}
                </span>
                {profile?.nip && (
                  <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1 font-mono">NIP: {profile.nip}</p>
                )}
              </div>

              {isAdmin && onOpenAdminPanel && (
                <button
                  type="button"
                  onClick={() => {
                    setShowUserDropdown(false);
                    onOpenAdminPanel();
                  }}
                  className="w-full flex items-center justify-between gap-2 px-3 py-2 rounded-xl text-xs text-orange-700 dark:text-cyan-300 hover:bg-orange-50 dark:hover:bg-cyan-950/50 font-semibold transition-colors text-left cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-3.5 h-3.5 text-amber-500 dark:text-cyan-400 shrink-0" />
                    <span>Panel Admin</span>
                  </div>
                  {adminBadgeCount > 0 && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-600 text-white animate-pulse shrink-0">
                      {adminBadgeCount}
                    </span>
                  )}
                </button>
              )}

              {!isAdmin && onOpenFeedbackModal && (
                <button
                  type="button"
                  onClick={() => {
                    setShowUserDropdown(false);
                    onOpenFeedbackModal();
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-[#1b1f2e] transition-colors cursor-pointer"
                >
                  <MessageSquareHeart className="w-4 h-4 text-rose-500 dark:text-rose-400 shrink-0" />
                  <span>Kirim Masukan & Lapor Bug</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => {
                  onNavigate('settings');
                  setShowUserDropdown(false);
                }}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-[#1b1f2e] transition-colors cursor-pointer"
              >
                <Settings className="w-4 h-4 text-slate-400 shrink-0" />
                Pengaturan Profil & Madrasah
              </button>

              <div className="border-t border-slate-100 dark:border-[#232838] my-1" />

              <button
                type="button"
                onClick={async () => {
                  setShowUserDropdown(false);
                  await logout();
                }}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition-colors cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
                Keluar dari Workspace
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
