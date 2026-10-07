import React, { useState, useEffect, useRef, useMemo } from 'react';
import { List, CaretDown, Clock, ArrowsOut, ArrowsIn, Cloud, CloudSlash, ArrowClockwise, Gear, SignOut, Sparkle, Check, Heart, ShieldCheck, Sun, Moon } from '@phosphor-icons/react';
import { useAuth } from '../../features/auth/AuthContext';
import { useWorkspace, useWorkspaceSync } from '../../context/WorkspaceContext';
import { useAppTheme } from '../../context/ThemeContext';
import { AppLogo } from '../common/AppLogo';
import { Tooltip } from '../common/Tooltip';
import { INDONESIAN_DAYS } from '../../utils/date';

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
    reloadWorkspaceData,
  } = useWorkspace();
  
  const {
    syncStatus,
    syncMessage,
    triggerSyncFeedback
  } = useWorkspaceSync();
  const { activeTheme, isDark, mode, applyAndSaveMode } = useAppTheme();

  const [localTime, setLocalTime] = useState<string>('');
  const [localTimeZone, setLocalTimeZone] = useState<string>('');
  const [isFullscreen, setIsFullscreen] = useState(false);
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


  const userDropdownRef = useRef<HTMLDivElement>(null);
  useClickOutside(userDropdownRef, () => {
    setShowUserDropdown(false);
  }, showUserDropdown);

  // Sort teaching assignments naturally by grade level and section
  return (
    <header className="h-14 lg:h-16 bg-[color-mix(in_srgb,var(--ds-surface-elevated)_95%,transparent)] backdrop-blur-md border-b border-[var(--ds-border)] px-3 sm:px-5 flex items-center justify-between sticky top-0 z-30 select-none transition-colors shadow-2xs">
      {/* Mobile App Branding & Drawer Toggle (Visible only on mobile screens < lg) */}
      <div className="flex items-center gap-1.5 lg:hidden mr-2 shrink-0">
        <button
          type="button"
          onClick={onOpenMobileMenu}
          className="p-1 rounded-xl hover:bg-[var(--ds-surface-muted)] text-[var(--ds-text)] transition-colors flex items-center gap-1.5 cursor-pointer"
          aria-label="Buka List"
        >
          <AppLogo size={28} variant="mark" />
          <span className="font-extrabold text-sm text-[var(--ds-text)] tracking-tight hidden xs:inline">
            DADU
          </span>
        </button>
      </div>

      {/* Left Side: Class/Subject Focus Switcher, Clock, Cloud Sync, & Fullscreen (Ultra-Compact Left Group) */}
      <div className="flex items-center gap-2 sm:gap-2.5 flex-1 min-w-0">

        {/* 2. Live Local Clock Widget */}
        <div className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[var(--ds-surface-muted)] border border-[var(--ds-border)] text-[var(--ds-text)] text-xs font-mono font-bold shadow-2xs shrink-0">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
          <Clock className="w-3.5 h-3.5 text-[var(--ds-text-muted)]" />
          <span>{localTime || '--:--:--'}</span>
          {localTimeZone && (
            <span className="text-[10px] text-[var(--ds-text-muted)] font-sans font-semibold">
              {localTimeZone}
            </span>
          )}
        </div>

        {/* 3. Sync Status Indicator (Interactive & Animated with Universal Tooltip) */}
        <div className="shrink-0">
          <Tooltip
            position="bottom"
            content={
              <span className="flex items-center gap-1.5">
                <span className={`w-1.5 h-1.5 rounded-full ${
                  syncStatus === 'syncing' ? 'bg-emerald-400 animate-ping' :
                  syncStatus === 'saved' ? 'bg-emerald-400' :
                  syncStatus === 'offline' ? 'bg-amber-400' : 'bg-emerald-400'
                }`} />
                <span>{syncMessage}</span>
              </span>
            }
          >
            <button
              type="button"
              onClick={handleManualSync}
              disabled={syncStatus === 'syncing'}
              className={`p-2 rounded-xl border flex items-center justify-center transition-all cursor-pointer shadow-2xs relative ${
                syncStatus === 'syncing'
                  ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-300 dark:border-emerald-500/60 text-emerald-600 dark:text-emerald-400 ring-2 ring-emerald-400/20'
                  : syncStatus === 'saved'
                  ? 'bg-emerald-100 dark:bg-emerald-950/70 border-emerald-300 dark:border-emerald-400 text-emerald-600 dark:text-emerald-300 ring-2 ring-emerald-400/30 scale-105'
                  : syncStatus === 'offline'
                  ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-300 dark:border-amber-500/40 text-amber-600 dark:text-amber-400'
                  : 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200/80 dark:border-emerald-500/40 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/50'
              }`}
              aria-label={syncMessage}
            >
              {syncStatus === 'syncing' && (
                <ArrowClockwise className="w-3.5 h-3.5 animate-spin text-emerald-600 dark:text-emerald-400" />
              )}
              {syncStatus === 'saved' && (
                <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-300 animate-in zoom-in duration-200" />
              )}
              {syncStatus === 'synced' && (
                <Cloud className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 transition-transform hover:scale-110" />
              )}
              {syncStatus === 'offline' && (
                <CloudSlash className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
              )}

              {/* Live activity dot for saving */}
              {syncStatus === 'syncing' && (
                <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
              )}
            </button>
          </Tooltip>
        </div>

        {/* Dark / Light Mode Toggle Button */}
        <div className="flex shrink-0">
          <Tooltip
            position="bottom"
            content={mode === 'dark' ? 'Beralih ke Mode Terang' : 'Beralih ke Mode Gelap'}
          >
            <button
              type="button"
              onClick={() => {
                const nextMode = mode === 'dark' ? 'light' : 'dark';
                applyAndSaveMode(nextMode);
              }}
              className="p-2 rounded-xl bg-[var(--ds-surface-muted)] hover:bg-[var(--ds-surface-elevated)] border border-[var(--ds-border)] text-[var(--ds-text)] transition-all cursor-pointer shadow-2xs"
              aria-label={mode === 'dark' ? 'Beralih ke Mode Terang' : 'Beralih ke Mode Gelap'}
            >
              {mode === 'dark' ? (
                <Sun className="w-3.5 h-3.5 text-amber-400 animate-in spin-in-180 duration-200" />
              ) : (
                <Moon className="w-3.5 h-3.5 text-[var(--ds-text)] animate-in spin-in-180 duration-200" />
              )}
            </button>
          </Tooltip>
        </div>

        {/* 4. Fullscreen Button (Immediately next to Cloud Indicator) */}
        <div className="hidden sm:flex shrink-0">
          <Tooltip
            position="bottom"
            content={isFullscreen ? 'Keluar Layar Penuh' : 'Mode Layar Penuh'}
            shortcut="Esc"
          >
            <button
              type="button"
              onClick={toggleFullscreen}
              className="p-2 rounded-xl bg-[var(--ds-surface-muted)] hover:bg-[var(--ds-surface-elevated)] border border-[var(--ds-border)] text-[var(--ds-text)] transition-all cursor-pointer shadow-2xs"
              aria-label={isFullscreen ? 'Keluar Layar Penuh (Esc)' : 'Mode Layar Penuh'}
            >
              {isFullscreen ? (
                <ArrowsIn className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              ) : (
                <ArrowsOut className="w-3.5 h-3.5 text-[var(--ds-text-muted)]" />
              )}
            </button>
          </Tooltip>
        </div>
      </div>

      {/* Right Side: User Profile Dropdown ONLY */}
      <div className="flex items-center shrink-0 ml-2">
        <div className="relative" ref={userDropdownRef}>
          <button
            type="button"
            onClick={() => {
              setShowUserDropdown(!showUserDropdown);
            }}
            className="flex items-center gap-2 p-1 rounded-xl hover:bg-[var(--ds-surface-muted)] text-[var(--ds-text)] text-xs transition-colors cursor-pointer"
          >
            <div className="relative w-8 h-8 rounded-full bg-emerald-50 dark:bg-emerald-950/80 border border-emerald-200 dark:border-emerald-500/50 text-emerald-700 dark:text-emerald-300 font-bold flex items-center justify-center text-xs">
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
              <div className="font-bold text-[var(--ds-text)] text-xs leading-none">
                {profile?.displayName || 'Guru'}
              </div>
              <div className="text-[10px] text-[var(--ds-text-muted)] mt-0.5">
                {isAdmin ? 'Administrator' : 'Guru'}
              </div>
            </div>
            <CaretDown className="w-3.5 h-3.5 text-[var(--ds-text-muted)] hidden md:block" />
          </button>

          {/* Profile Dropdown List */}
          {showUserDropdown && (
            <div 
              className="absolute right-0 mt-2 w-64 rounded-2xl bg-[var(--ds-surface-elevated)] p-2 shadow-2xl border border-[var(--ds-border)] z-50 animate-in fade-in slide-in-from-top-2"
            >
              <div className="p-3 border-b border-[var(--ds-border)] mb-1">
                <p className="text-xs font-bold text-[var(--ds-text)] truncate">{profile?.displayName}</p>
                <p className="text-[11px] text-[var(--ds-text-muted)] truncate">{profile?.email}</p>
                <span className="inline-block mt-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200/50 dark:border-emerald-500/50">
                  {isAdmin ? 'ADMINISTRATOR' : 'GURU'}
                </span>
                {profile?.nip && (
                  <p className="text-[10px] text-[var(--ds-text-muted)] mt-1 font-mono">NIP: {profile.nip}</p>
                )}
              </div>

              {isAdmin && onOpenAdminPanel && (
                <button
                  type="button"
                  onClick={() => {
                    setShowUserDropdown(false);
                    onOpenAdminPanel();
                  }}
                  className="w-full flex items-center justify-between gap-2 px-3 py-2.5 rounded-xl text-xs font-bold text-emerald-800 dark:text-emerald-300 bg-emerald-500/10 dark:bg-emerald-500/10 hover:bg-emerald-500/20 dark:hover:bg-emerald-500/20 border border-emerald-500/20 dark:border-emerald-500/30 transition-all text-left cursor-pointer my-1 shadow-2xs"
                >
                  <div className="flex items-center gap-2.5">
                    <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                    <span>Panel Administrator</span>
                  </div>
                  {adminBadgeCount > 0 ? (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-600 text-white shrink-0 shadow-xs shadow-rose-600/50">
                      {adminBadgeCount} Baru
                    </span>
                  ) : (
                    <span className="text-[10px] font-semibold text-emerald-700/70 dark:text-emerald-400/70">
                      Kelola
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
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs text-[var(--ds-text)] hover:bg-[var(--ds-surface-muted)] transition-colors cursor-pointer"
                >
                  <Heart className="w-4 h-4 text-rose-500 dark:text-rose-400 shrink-0" />
                  <span>Kirim Masukan & Lapor Bug</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => {
                  onNavigate('settings');
                  setShowUserDropdown(false);
                }}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs text-[var(--ds-text)] hover:bg-[var(--ds-surface-muted)] transition-colors cursor-pointer"
              >
                <Gear className="w-4 h-4 text-[var(--ds-text-muted)] shrink-0" />
                Pengaturan Profil & Madrasah
              </button>

              <div className="border-t border-[var(--ds-border)] my-1" />

              <button
                type="button"
                onClick={async () => {
                  setShowUserDropdown(false);
                  await logout();
                }}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition-colors cursor-pointer"
              >
                <SignOut className="w-4 h-4" />
                Keluar dari Workspace
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
