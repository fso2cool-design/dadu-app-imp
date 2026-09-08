import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, 
  BookOpen,
  Users, 
  Printer, 
  Database,
  Sliders,
  ShieldCheck,
  MessageSquareHeart,
  X,
  PanelLeftClose,
  PanelLeftOpen,
} from 'lucide-react';
import { useAppTheme } from '../../context/ThemeContext';
import { DaduLogo } from '../common/DaduLogo';
import { APP_CONFIG } from '../../constants/app';

interface SidebarProps {
  currentRoute: string;
  onNavigate: (route: string) => void;
  isMobileOpen: boolean;
  onCloseMobile: () => void;
  isCompact?: boolean;
  onToggleCompact?: () => void;
  isAdmin?: boolean;
  adminBadgeCount?: number;
  onOpenAdminPanel?: () => void;
  onOpenFeedbackModal?: () => void;
  onOpenChangeLog?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentRoute,
  onNavigate,
  isMobileOpen,
  onCloseMobile,
  isCompact = false,
  onToggleCompact,
  isAdmin = false,
  adminBadgeCount = 0,
  onOpenAdminPanel,
  onOpenFeedbackModal,
  onOpenChangeLog,
}) => {
  const { activeTheme } = useAppTheme();
  const [hoveredTopToggle, setHoveredTopToggle] = useState(false);
  const [activeTooltip, setActiveTooltip] = useState<{ label: string; top: number } | null>(null);

  // Always reset hover state when sidebar compact mode toggles
  useEffect(() => {
    setHoveredTopToggle(false);
  }, [isCompact]);

  const isDark = activeTheme === 'dark-crimson';

  // Dynamic accent style for active menu item based on theme
  const getActiveStyle = () => {
    if (isDark) {
      return 'bg-cyan-950/60 text-cyan-400 font-bold border border-cyan-500/50 shadow-[0_0_12px_rgba(0,229,255,0.25)]';
    }
    return 'bg-orange-500 text-white font-bold shadow-sm shadow-orange-500/30';
  };

  const menuGroups = [
    {
      groupTitle: null,
      items: [
        { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
        { id: 'teacher', label: 'Ruang Guru', icon: BookOpen },
        { id: 'homeroom', label: 'Ruang Wali Kelas', icon: Users },
      ],
    },
    {
      groupTitle: 'LAPORAN & DOKUMEN',
      items: [
        { id: 'reports-center', label: 'Pusat Laporan', icon: Printer },
      ],
    },
    {
      groupTitle: 'PENGELOLAAN',
      items: [
        { id: 'master', label: 'Data Master', icon: Database },
        { id: 'settings', label: 'Pengaturan', icon: Sliders },
      ],
    },
    ...(!isAdmin ? [{
      groupTitle: 'BANTUAN & SARAN',
      items: [
        { id: 'feedback-modal', label: 'Kirim Masukan', icon: MessageSquareHeart },
      ],
    }] : []),
  ];

  const handleItemClick = (id: string) => {
    if (id === 'feedback-modal') {
      if (onOpenFeedbackModal) onOpenFeedbackModal();
      onCloseMobile();
      return;
    }
    onNavigate(id);
    onCloseMobile();
  };

  const activeStyle = getActiveStyle();

  const isItemActive = (itemId: string) => {
    if (currentRoute === itemId) return true;
    if (itemId === 'teacher' && (currentRoute === 'teacher' || currentRoute === 'meetings' || currentRoute === 'attendance-subject' || currentRoute === 'grades' || currentRoute === 'teaching-classes' || currentRoute.startsWith('teacher-'))) return true;
    if (itemId === 'homeroom' && (currentRoute === 'homeroom' || currentRoute.startsWith('homeroom-'))) return true;
    if (itemId === 'reports-center' && (currentRoute === 'reports-center' || currentRoute.startsWith('reports-'))) return true;
    if (itemId === 'master' && (currentRoute === 'master' || currentRoute.startsWith('master-'))) return true;
    if (itemId === 'settings' && (currentRoute === 'settings' || currentRoute.startsWith('settings-'))) return true;
    return false;
  };

  const renderContent = (compact: boolean) => (
    <div className="flex flex-col h-full bg-slate-900 dark:bg-[#0c0e15] text-slate-300 select-none">
      {/* Brand Header with Hover Toggle */}
      <div className={`relative flex items-center border-b border-slate-800 dark:border-[#232838] transition-all ${
        compact ? 'justify-center p-3' : 'justify-between px-4 py-3.5'
      }`}>
        {compact ? (
          /* COMPACT MODE: Hover over logo transforms into toggle button with tooltip */
          <div 
            className="relative flex items-center justify-center cursor-pointer"
            onMouseEnter={(e) => {
              setHoveredTopToggle(true);
              const rect = e.currentTarget.getBoundingClientRect();
              setActiveTooltip({
                label: 'Buka sidebar',
                top: rect.top + rect.height / 2,
              });
            }}
            onMouseLeave={() => {
              setHoveredTopToggle(false);
              setActiveTooltip(null);
            }}
            onClick={() => {
              setHoveredTopToggle(false);
              setActiveTooltip(null);
              onToggleCompact?.();
            }}
          >
            <button
              type="button"
              className="w-10 h-10 rounded-xl flex items-center justify-center transition-all bg-slate-800/90 hover:bg-slate-700 dark:bg-[#141722] dark:hover:bg-[#1b1f2e] dark:hover:border-cyan-500/50 text-slate-200 cursor-pointer shadow-sm border border-transparent dark:border-[#232838]"
              aria-label="Buka sidebar"
            >
              {hoveredTopToggle ? (
                <PanelLeftOpen className="w-5 h-5 text-orange-400 dark:text-cyan-400 animate-in zoom-in-75 duration-150" />
              ) : (
                <DaduLogo size="sm" />
              )}
            </button>
          </div>
        ) : (
          /* EXPANDED MODE: Logo + Brand Title + Close Toggle on the Right */
          <>
            <div className="flex items-center gap-3 overflow-hidden">
              <DaduLogo size="md" />
              <div className="overflow-hidden">
                <h1 className="font-extrabold text-white text-base tracking-tight leading-none truncate flex items-center gap-1.5">
                  <span>Dadu</span>
                </h1>
                <p className="text-[10px] text-slate-400 dark:text-slate-400 font-medium tracking-tight truncate mt-1">
                  Digitalisasi Data Guru
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              {onToggleCompact && (
                <button
                  type="button"
                  onClick={() => {
                    setHoveredTopToggle(false);
                    setActiveTooltip(null);
                    onToggleCompact();
                  }}
                  className="hidden lg:flex items-center justify-center w-8 h-8 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 dark:hover:bg-[#1b1f2e] transition-colors cursor-pointer"
                  aria-label="Tutup sidebar"
                >
                  <PanelLeftClose className="w-4 h-4" />
                </button>
              )}

              {/* Mobile close button */}
              <button
                type="button"
                onClick={onCloseMobile}
                className="lg:hidden p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
                aria-label="Tutup menu"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </>
        )}
      </div>

      {/* Nav Items List with invisible smooth scrolling */}
      <div 
        className="flex-1 overflow-y-auto px-2 py-3 space-y-4 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
        onScroll={() => setActiveTooltip(null)}
      >
        {menuGroups.map((group, gIdx) => (
          <div key={gIdx} className="space-y-1">
            {group.groupTitle && (
              compact ? (
                <div className="my-2 border-t border-slate-800/80 dark:border-[#232838] mx-1" />
              ) : (
                <div className="px-3 pt-2 pb-1 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                  {group.groupTitle}
                </div>
              )
            )}
            {group.items.map((item) => {
              const Icon = item.icon;
              const isActive = isItemActive(item.id);

              return (
                <div 
                  key={item.id} 
                  className="relative"
                  onMouseEnter={(e) => {
                    if (compact) {
                      const rect = e.currentTarget.getBoundingClientRect();
                      setActiveTooltip({
                        label: item.label,
                        top: rect.top + rect.height / 2,
                      });
                    }
                  }}
                  onMouseLeave={() => {
                    if (compact) {
                      setActiveTooltip(null);
                    }
                  }}
                >
                  <button
                    type="button"
                    onClick={() => {
                      setActiveTooltip(null);
                      handleItemClick(item.id);
                    }}
                    className={`w-full flex items-center rounded-xl text-xs font-medium transition-all cursor-pointer ${
                      compact ? 'justify-center p-2.5 min-h-[42px]' : 'gap-3 px-3.5 py-2.5 min-h-[44px]'
                    } ${
                      isActive
                        ? activeStyle
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/80 dark:hover:bg-[#141722] dark:hover:text-cyan-300 active:scale-[0.98]'
                    }`}
                  >
                    <Icon className={`w-4 h-4 shrink-0 ${isActive ? '' : 'text-slate-400'}`} />
                    {!compact && (
                      <div className="flex items-center justify-between flex-1 min-w-0">
                        <span className="truncate">{item.label}</span>
                        {'badgeCount' in item && typeof (item as any).badgeCount === 'number' && (item as any).badgeCount > 0 ? (
                          <span className="px-1.5 py-0.5 rounded-full text-[10px] font-black bg-rose-600 text-white animate-pulse shrink-0">
                            {(item as any).badgeCount}
                          </span>
                        ) : null}
                      </div>
                    )}
                    {compact && 'badgeCount' in item && typeof (item as any).badgeCount === 'number' && (item as any).badgeCount > 0 ? (
                      <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 rounded-full bg-rose-600 border-2 border-slate-900 animate-pulse" />
                    ) : null}
                  </button>
                </div>
              );
            })}
          </div>
        ))}
      </div>

      {/* Workspace Footer Status with Dadu version and developer signature */}
      {!compact && (
        <div className="p-3 border-t border-slate-800 dark:border-[#232838]">
          <div className="px-2 pt-0.5 text-[11px] text-slate-400 dark:text-slate-500 flex items-center justify-between">
            <div className="flex items-center gap-1.5 font-medium">
              <span className="font-bold text-slate-300 dark:text-slate-200">{APP_CONFIG.name}</span>
              <span className="text-slate-600 dark:text-slate-700">•</span>
              <button
                type="button"
                onClick={onOpenChangeLog}
                title="Lihat Catatan Pembaruan (Release Notes)"
                className="font-mono text-[10px] text-slate-400 hover:text-indigo-400 dark:text-slate-400 dark:hover:text-cyan-300 transition-colors underline decoration-dotted cursor-pointer"
              >
                {APP_CONFIG.versionDisplay}
              </button>
              <span 
                title={`Pengembang: ${APP_CONFIG.developerName}`} 
                className="px-1.5 py-0.5 rounded-md bg-orange-950/80 dark:bg-cyan-950/80 text-orange-300 dark:text-cyan-300 border border-orange-700/60 dark:border-cyan-500/50 text-[9px] font-mono font-bold tracking-wider uppercase shadow-2xs"
              >
                {APP_CONFIG.developer}
              </span>
            </div>
            <span className="flex items-center gap-1 text-emerald-400 dark:text-emerald-400 text-[10px] font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Ready
            </span>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <>
      {/* Desktop Persistent Sidebar with z-40 to prevent Header overlap */}
      <aside className={`hidden lg:block shrink-0 h-screen sticky top-0 z-40 border-r border-slate-800 dark:border-[#232838] transition-all duration-200 ${
        isCompact ? 'w-18' : 'w-64'
      }`}>
        {renderContent(isCompact)}
      </aside>

      {/* Global Fixed Floating Tooltip for Compact Mode (Zero Clipping Guarantee) */}
      {isCompact && activeTooltip && (
        <div 
          className="fixed left-[78px] -translate-y-1/2 px-2.5 py-1.5 bg-slate-900/95 dark:bg-[#141722]/95 backdrop-blur-md text-white rounded-lg text-xs font-semibold whitespace-nowrap shadow-xl z-50 border border-slate-700/80 dark:border-cyan-500/50 pointer-events-none animate-in fade-in zoom-in-95 duration-150"
          style={{ 
            top: `${activeTooltip.top}px`
          }}
        >
          {activeTooltip.label}
        </div>
      )}

      {/* Mobile Drawer (always full width) */}
      {isMobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div 
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity"
            onClick={onCloseMobile}
          />
          <div className="fixed inset-y-0 left-0 max-w-xs w-full shadow-2xl z-50 animate-in slide-in-from-left duration-200">
            {renderContent(false)}
          </div>
        </div>
      )}
    </>
  );
};
