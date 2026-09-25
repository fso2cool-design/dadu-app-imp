import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
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
  CalendarCheck2,
  CheckSquare,
  Award,
  Layers,
  CalendarDays,
  CalendarRange,
  Clock,
  UserCheck,
  FileSpreadsheet,
  StickyNote,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';
import { useAppTheme } from '../../context/ThemeContext';
import { AppLogo } from '../common/AppLogo';
import { Tooltip } from '../common/Tooltip';
import { APP_CONFIG } from '../../constants/app';

interface SubMenuItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

interface MenuItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badgeCount?: number;
  subItems?: SubMenuItem[];
}

interface MenuGroup {
  groupTitle: string | null;
  items: MenuItem[];
}

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
  const { activeTheme, isDark } = useAppTheme();
  const [hoveredTopToggle, setHoveredTopToggle] = useState(false);

  // Expanded accordion groups state (Single open accordion model)
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({
    teacher: true,
    homeroom: false,
    master: false,
    settings: false,
  });

  // Automatically expand group if currentRoute belongs to it, and auto-collapse others
  useEffect(() => {
    if (currentRoute === 'teacher' || currentRoute === 'meetings' || currentRoute === 'attendance-subject' || currentRoute === 'grades' || currentRoute === 'teaching-classes' || currentRoute.startsWith('teacher-')) {
      setExpandedGroups({ teacher: true, homeroom: false, master: false, settings: false });
    } else if (currentRoute === 'homeroom' || currentRoute.startsWith('homeroom-')) {
      setExpandedGroups({ teacher: false, homeroom: true, master: false, settings: false });
    } else if (currentRoute === 'master' || currentRoute.startsWith('master-')) {
      setExpandedGroups({ teacher: false, homeroom: false, master: true, settings: false });
    } else if (currentRoute === 'settings' || currentRoute.startsWith('settings-')) {
      setExpandedGroups({ teacher: false, homeroom: false, master: false, settings: true });
    } else if (currentRoute === 'dashboard' || currentRoute.startsWith('reports-')) {
      // Keep menus neatly closed on independent standalone pages
      setExpandedGroups({ teacher: false, homeroom: false, master: false, settings: false });
    }
  }, [currentRoute]);

  // Always reset hover state when sidebar compact mode toggles
  useEffect(() => {
    setHoveredTopToggle(false);
  }, [isCompact]);

  const menuGroups: MenuGroup[] = [
    {
      groupTitle: null,
      items: [
        { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
        { 
          id: 'teacher', 
          label: 'Ruang Guru', 
          icon: BookOpen,
          subItems: [
            { id: 'teaching-classes', label: 'Rombel Ampuan', icon: Layers },
            { id: 'teaching-schedule', label: 'Jadwal Mengajar', icon: CalendarDays },
            { id: 'meetings', label: 'Agenda & Jurnal KBM', icon: CalendarCheck2 },
            { id: 'attendance-subject', label: 'Presensi Sesi Mapel', icon: CheckSquare },
            { id: 'grades', label: 'Penilaian Siswa', icon: Award },
          ]
        },
        { 
          id: 'homeroom', 
          label: 'Ruang Wali Kelas', 
          icon: Users,
          subItems: [
            { id: 'homeroom-students', label: 'Daftar Siswa Kelas', icon: FileSpreadsheet },
            { id: 'homeroom-class-schedule', label: 'Jadwal Pelajaran Kelas', icon: Clock },
            { id: 'homeroom-teacher-attendance', label: 'Kehadiran Guru Mapel', icon: UserCheck },
            { id: 'homeroom-monthly-attendance', label: 'Rekap Presensi Siswa', icon: CalendarRange },
          ]
        },
      ],
    },
    {
      groupTitle: 'LAPORAN & DOKUMEN',
      items: [
        { id: 'reports-center', label: 'Pusat Laporan & Cetak', icon: Printer },
      ],
    },
    {
      groupTitle: 'PENGELOLAAN',
      items: [
        { 
          id: 'master', 
          label: 'Data Master', 
          icon: Database,
          subItems: [
            { id: 'master-academic-years', label: 'Tahun Ajaran', icon: CalendarDays },
            { id: 'master-classes', label: 'Data Rombel / Kelas', icon: Layers },
            { id: 'master-students', label: 'Data Siswa Terpadu', icon: Users },
            { id: 'master-subjects', label: 'Mata Pelajaran', icon: BookOpen },
            { id: 'master-teaching', label: 'Plotting Mengajar', icon: Clock },
          ]
        },
        { 
          id: 'settings', 
          label: 'Pengaturan', 
          icon: Sliders,
          subItems: [
            { id: 'settings-profile', label: 'Profil & Madrasah', icon: Sliders },
            { id: 'settings-backup', label: 'Cadangkan & Pulihkan', icon: Database },
          ]
        },
      ],
    },
    ...(!isAdmin ? [{
      groupTitle: 'BANTUAN & SARAN',
      items: [
        { id: 'feedback-modal', label: 'Kirim Masukan', icon: MessageSquareHeart },
      ],
    }] : []),
  ];

  const handleItemClick = (id: string, hasSubItems?: boolean) => {
    if (id === 'feedback-modal') {
      if (onOpenFeedbackModal) onOpenFeedbackModal();
      onCloseMobile();
      return;
    }

    if (hasSubItems && !isCompact) {
      // Toggle expansion (single-open accordion behavior)
      setExpandedGroups(prev => {
        const isCurrentlyOpen = Boolean(prev[id]);
        return {
          teacher: false,
          homeroom: false,
          master: false,
          settings: false,
          [id]: !isCurrentlyOpen,
        };
      });
    }

    onNavigate(id);
    if (!hasSubItems || isCompact) {
      onCloseMobile();
    }
  };

  const handleSubItemClick = (subId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    onNavigate(subId);
    onCloseMobile();
  };

  const toggleGroupCollapse = (groupId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedGroups(prev => {
      const isCurrentlyOpen = Boolean(prev[groupId]);
      return {
        teacher: false,
        homeroom: false,
        master: false,
        settings: false,
        [groupId]: !isCurrentlyOpen,
      };
    });
  };

  const isSubItemActive = (subId: string) => {
    if (currentRoute === subId) return true;
    if (subId === 'meetings' && (currentRoute === 'meetings' || currentRoute === 'teacher-journal')) return true;
    if (subId === 'attendance-subject' && (currentRoute === 'attendance-subject' || currentRoute === 'teacher-attendance')) return true;
    if (subId === 'grades' && (currentRoute === 'grades' || currentRoute === 'teacher-grades')) return true;
    if (subId === 'teaching-classes' && (currentRoute === 'teaching-classes' || currentRoute === 'teacher-classes')) return true;
    if (subId === 'homeroom-class-schedule' && (currentRoute === 'homeroom-class-schedule' || currentRoute === 'homeroom-schedule')) return true;
    if (subId === 'homeroom-daily-attendance' && (currentRoute === 'homeroom-daily-attendance' || currentRoute === 'homeroom-attendance-daily')) return true;
    if (subId === 'homeroom-monthly-attendance' && (currentRoute === 'homeroom-monthly-attendance' || currentRoute === 'homeroom-attendance-monthly')) return true;
    if (subId === 'homeroom-teacher-attendance' && (currentRoute === 'homeroom-teacher-attendance' || currentRoute === 'homeroom-attendance-teacher')) return true;
    if (subId === 'homeroom-students' && currentRoute === 'homeroom-students') return true;
    if (subId === 'homeroom-notes' && currentRoute === 'homeroom-notes') return true;
    if (subId.startsWith('master-') && currentRoute === subId) return true;
    if (subId.startsWith('settings-') && currentRoute === subId) return true;
    return false;
  };

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
    <div className="flex flex-col h-full bg-slate-50/95 dark:bg-[#0c0e15] text-slate-700 dark:text-slate-300 select-none">
      {/* Brand Header with Hover Toggle */}
      <div className={`relative flex items-center border-b border-slate-200/90 dark:border-[#232838] transition-all ${
        compact ? 'justify-center px-2 py-3' : 'justify-between px-4 py-3.5'
      }`}>
        {compact ? (
          /* COMPACT MODE: Hover over logo transforms into toggle button with tooltip */
          <div 
            className="w-full flex items-center justify-center cursor-pointer"
            onMouseEnter={() => setHoveredTopToggle(true)}
            onMouseLeave={() => setHoveredTopToggle(false)}
            onClick={() => {
              setHoveredTopToggle(false);
              onToggleCompact?.();
            }}
          >
            <Tooltip content={hoveredTopToggle ? 'Buka sidebar' : 'DADU Workspace'} position="right">
              <button
                type="button"
                className="w-10 h-10 rounded-xl flex items-center justify-center transition-all bg-white hover:bg-slate-100 dark:bg-[#141722] dark:hover:bg-[#1b1f2e] dark:hover:border-emerald-500/50 text-slate-800 dark:text-slate-200 cursor-pointer shadow-xs border border-slate-200 dark:border-[#232838]"
                aria-label="Buka sidebar"
              >
                {hoveredTopToggle ? (
                  <PanelLeftOpen className="w-5 h-5 text-emerald-500 dark:text-emerald-400 animate-in zoom-in-75 duration-150" />
                ) : (
                  <AppLogo size="sm" variant="mark" />
                )}
              </button>
            </Tooltip>
          </div>
        ) : (
          /* EXPANDED MODE: Logo + Brand Title + Close Toggle on the Right */
          <>
            <div className="flex items-center overflow-hidden">
              <AppLogo size="md" variant="full" />
            </div>

            <div className="flex items-center gap-1">
              {onToggleCompact && (
                <button
                  type="button"
                  onClick={() => {
                    setHoveredTopToggle(false);
                    onToggleCompact();
                  }}
                  className="hidden lg:flex items-center justify-center w-8 h-8 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-200/70 dark:text-slate-400 dark:hover:text-white dark:hover:bg-[#1b1f2e] transition-colors cursor-pointer"
                  aria-label="Tutup sidebar"
                >
                  <PanelLeftClose className="w-4 h-4" />
                </button>
              )}

              {/* Mobile close button */}
              <button
                type="button"
                onClick={onCloseMobile}
                className="lg:hidden p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-200/70 dark:text-slate-400 dark:hover:text-white dark:hover:bg-slate-800"
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
      >
        {menuGroups.map((group, gIdx) => (
          <div key={gIdx} className="space-y-1">
            {group.groupTitle && (
              compact ? (
                <div className="my-2 border-t border-slate-200 dark:border-[#232838] mx-1" />
              ) : (
                <div className="px-3 pt-2 pb-1 text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  {group.groupTitle}
                </div>
              )
            )}
            {group.items.map((item) => {
              const Icon = item.icon;
              const hasSub = item.subItems && item.subItems.length > 0;
              const isExpanded = !compact && hasSub && Boolean(expandedGroups[item.id]);
              const isGroupActive = isItemActive(item.id);
              const isDirectParentActive = currentRoute === item.id;

              return (
                <div key={item.id} className="space-y-0.5">
                  <div className="relative">
                    <Tooltip content={item.label} position="right" disabled={!compact}>
                      <button
                        type="button"
                        onClick={() => {
                          handleItemClick(item.id, hasSub);
                        }}
                        className={`relative overflow-hidden w-full flex items-center rounded-xl text-xs font-medium transition-all cursor-pointer ${
                          compact ? 'justify-center p-2.5 min-h-[42px]' : 'gap-3 px-3.5 py-2.5 min-h-[44px]'
                        } ${
                          isDirectParentActive
                            ? 'text-accent-text font-bold'
                            : isGroupActive
                              ? 'bg-slate-200/80 dark:bg-[#141722] text-slate-900 dark:text-white font-bold shadow-2xs'
                              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-accent-text hover:bg-slate-200/60 dark:hover:bg-[#141722] active:scale-[0.98]'
                        }`}
                      >
                      {/* Fluid Sliding Active Capsule for top-level item */}
                      {isDirectParentActive && (
                        <motion.div
                          layoutId="sidebar-active-parent-capsule"
                          transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                          className="pointer-events-none absolute inset-0 rounded-xl bg-accent-primary-soft border border-accent-primary-border shadow-2xs"
                        >
                          <span
                            className="absolute left-0 top-2.5 bottom-2.5 w-1 rounded-r-full bg-accent-primary"
                          />
                        </motion.div>
                      )}

                      <span className={`relative z-10 flex items-center min-w-0 ${compact ? 'justify-center' : 'w-full'}`}>
                        <Icon className={`w-4 h-4 shrink-0 transition-colors ${
                          isDirectParentActive 
                            ? 'text-accent-primary' 
                            : isGroupActive 
                            ? 'text-accent-primary' 
                            : 'text-slate-500 dark:text-slate-400'
                        }`} />
                        {!compact && (
                          <div className="flex items-center justify-between flex-1 min-w-0 ml-3">
                            <span className="truncate">{item.label}</span>
                            <div className="flex items-center gap-1.5 shrink-0">
                              {item.badgeCount && item.badgeCount > 0 ? (
                                <span className="px-1.5 py-0.5 rounded-full text-[10px] font-black bg-rose-600 text-white">
                                  {item.badgeCount}
                                </span>
                              ) : null}
                              {hasSub && (
                                <span
                                  role="button"
                                  tabIndex={0}
                                  onClick={(e) => toggleGroupCollapse(item.id, e)}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter' || e.key === ' ') {
                                      e.preventDefault();
                                      toggleGroupCollapse(item.id, e as any);
                                    }
                                  }}
                                  className="p-1 rounded-md text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-800/50 transition-colors cursor-pointer"
                                  aria-label={isExpanded ? 'Ciutkan menu' : 'Buka menu'}
                                >
                                  {isExpanded ? (
                                    <ChevronDown className="w-3.5 h-3.5" />
                                  ) : (
                                    <ChevronRight className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
                                  )}
                                </span>
                              )}
                            </div>
                          </div>
                        )}
                      </span>

                      {compact && item.badgeCount && item.badgeCount > 0 ? (
                        <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 rounded-full bg-rose-600 border-2 border-slate-50 dark:border-slate-900 z-20" />
                      ) : null}
                    </button>
                  </Tooltip>
                </div>

                  {/* Render Accordion Sub-items when expanded */}
                  {isExpanded && item.subItems && (
                    <div className="ml-5 pl-2 border-l border-slate-200 dark:border-[#202534] space-y-1 pt-1 pb-1.5 animate-in slide-in-from-top-1 duration-150">
                      {item.subItems.map((sub) => {
                        const SubIcon = sub.icon;
                        const isSubActive = isSubItemActive(sub.id);

                        return (
                          <button
                            key={sub.id}
                            type="button"
                            onClick={(e) => handleSubItemClick(sub.id, e)}
                            className={`relative overflow-hidden w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-[11px] font-medium transition-all text-left cursor-pointer ${
                              isSubActive
                                ? 'text-accent-text font-bold'
                                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-accent-text hover:bg-slate-200/60 dark:hover:bg-[#141722]/60'
                            }`}
                          >
                            {/* Fluid Sliding Active Capsule for sub-menu item */}
                            {isSubActive && (
                              <motion.div
                                layoutId="sidebar-active-subitem-capsule"
                                transition={{ type: 'spring', stiffness: 400, damping: 32 }}
                                className="pointer-events-none absolute inset-0 rounded-lg bg-accent-primary-soft border border-accent-primary-border shadow-2xs"
                              >
                                <span
                                  className="absolute left-0 top-1.5 bottom-1.5 w-0.5 rounded-r-full bg-accent-primary"
                                />
                              </motion.div>
                            )}

                            <span className="relative z-10 flex items-center gap-2.5 w-full min-w-0">
                              <SubIcon className={`w-3.5 h-3.5 shrink-0 transition-colors ${
                                isSubActive 
                                  ? 'text-accent-primary' 
                                  : 'text-slate-500 dark:text-slate-500'
                              }`} />
                              <span className="truncate flex-1">{sub.label}</span>
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>

      {/* Workspace Footer: Clean Dadu Workspace label */}
      {!compact && (
        <div className="p-3 border-t border-slate-200 dark:border-[#232838]">
          <div className="px-2 pt-0.5 text-[11px] font-semibold text-slate-500 dark:text-slate-400 select-none">
            {APP_CONFIG.name}
          </div>
        </div>
      )}
    </div>
  );

  return (
    <>
      {/* Desktop Persistent Sidebar with z-40 to prevent Header overlap */}
      <aside className={`hidden lg:block shrink-0 h-screen sticky top-0 z-40 border-r border-slate-200 dark:border-[#232838] transition-all duration-200 ${
        isCompact ? 'w-18' : 'w-64'
      }`}>
        {renderContent(isCompact)}
      </aside>

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
