import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import { SquaresFour, BookOpen, Users, Printer, Database, Sliders, ShieldCheck, Heart, X, SidebarSimple, CalendarCheck, CheckSquare, Stack, CalendarDots, CalendarBlank, ChartBar, Clock, UserCheck, Notepad, CaretDown, CaretRight, ClipboardText } from '@phosphor-icons/react';
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
  const [hoveredTopToggle, setHoveredTopToggle] = useState(false);

  const getGroupForRoute = (route: string): string | null => {
    if (
      route === 'teacher' ||
      route === 'teaching' ||
      route === 'meetings' ||
      route === 'schedule' ||
      route === 'attendance-subject' ||
      route === 'grades' ||
      route.startsWith('teacher-') ||
      route.startsWith('teaching-')
    ) {
      return 'teacher';
    }
    if (route === 'homeroom' || route.startsWith('homeroom-')) {
      return 'homeroom';
    }
    if (route === 'master' || route.startsWith('master-')) {
      return 'master';
    }
    if (route === 'settings' || route.startsWith('settings-')) {
      return 'settings';
    }
    return null;
  };

  // Expanded accordion groups state (Single open accordion model)
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>(() => {
    const targetGroup = getGroupForRoute(currentRoute);
    return {
      teacher: targetGroup === 'teacher',
      homeroom: targetGroup === 'homeroom',
      master: targetGroup === 'master',
      settings: targetGroup === 'settings',
    };
  });

  const prevRouteRef = useRef(currentRoute);

  // Automatically expand group if currentRoute changes and belongs to it, and auto-collapse others
  useEffect(() => {
    if (prevRouteRef.current !== currentRoute) {
      prevRouteRef.current = currentRoute;
      const targetGroup = getGroupForRoute(currentRoute);
      setExpandedGroups({
        teacher: targetGroup === 'teacher',
        homeroom: targetGroup === 'homeroom',
        master: targetGroup === 'master',
        settings: targetGroup === 'settings',
      });
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
        { id: 'dashboard', label: 'Dashboard', icon: SquaresFour },
        { 
          id: 'teacher', 
          label: 'Ruang Guru', 
          icon: BookOpen,
          subItems: [
            { id: 'teaching-classes', label: 'Rombel Ampuan', icon: Stack },
            { id: 'teaching-schedule', label: 'Jadwal Mengajar', icon: CalendarDots },
            { id: 'meetings', label: 'Agenda & Jurnal KBM', icon: CalendarCheck },
            { id: 'attendance-subject', label: 'Presensi Sesi Mapel', icon: CheckSquare },
            { id: 'grades', label: 'Penilaian Siswa', icon: ClipboardText },
          ]
        },
        { 
          id: 'homeroom', 
          label: 'Ruang Wali Kelas', 
          icon: Users,
          subItems: [
            { id: 'homeroom-students', label: 'Daftar Siswa Kelas', icon: Users },
            { id: 'homeroom-daily-attendance', label: 'Presensi Harian', icon: CalendarDots },
            { id: 'homeroom-monthly-attendance', label: 'Rekap Presensi Siswa', icon: ChartBar },
            { id: 'homeroom-notes', label: 'Catatan & Sikap', icon: Notepad },
            { id: 'homeroom-class-schedule', label: 'Jadwal Pelajaran Kelas', icon: Clock },
            { id: 'homeroom-teacher-attendance', label: 'Kehadiran Guru Mapel', icon: UserCheck },
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
            { id: 'master-academic-years', label: 'Tahun Ajaran', icon: CalendarBlank },
            { id: 'master-calendar', label: 'Kalender & Libur', icon: CalendarDots },
            { id: 'master-classes', label: 'Data Rombel / Kelas', icon: Stack },
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
        { id: 'feedback-modal', label: 'Kirim Masukan', icon: Heart },
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

  const handleSubItemClick = (subId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    onNavigate(subId);
    onCloseMobile();
  };

  const toggleGroupCollapse = (groupId: string, e?: React.MouseEvent | React.KeyboardEvent) => {
    if (e) {
      e.stopPropagation();
    }
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
    if (subId === 'teaching-schedule' && (currentRoute === 'teaching-schedule' || currentRoute === 'teacher-schedule' || currentRoute === 'schedule')) return true;
    if (subId === 'homeroom-class-schedule' && (currentRoute === 'homeroom-class-schedule' || currentRoute === 'homeroom-schedule')) return true;
    if (subId === 'homeroom-daily-attendance' && (currentRoute === 'homeroom-daily-attendance' || currentRoute === 'homeroom-attendance-daily')) return true;
    if (subId === 'homeroom-monthly-attendance' && (currentRoute === 'homeroom-monthly-attendance' || currentRoute === 'homeroom-attendance-monthly' || currentRoute === 'homeroom-attendance')) return true;
    if (subId === 'homeroom-teacher-attendance' && (currentRoute === 'homeroom-teacher-attendance' || currentRoute === 'homeroom-attendance-teacher')) return true;
    if (subId === 'homeroom-students' && currentRoute === 'homeroom-students') return true;
    if (subId === 'homeroom-notes' && currentRoute === 'homeroom-notes') return true;
    if (subId.startsWith('master-') && currentRoute === subId) return true;
    if (subId.startsWith('settings-') && currentRoute === subId) return true;
    return false;
  };

  const isItemActive = (itemId: string) => {
    if (currentRoute === itemId) return true;
    const group = getGroupForRoute(currentRoute);
    if (group === itemId) return true;
    if (itemId === 'reports-center' && (currentRoute === 'reports-center' || currentRoute === 'reports' || currentRoute.startsWith('reports-'))) return true;
    return false;
  };

  const renderContent = (compact: boolean) => (
    <div className="sidebar-container flex flex-col h-full select-none" style={{ background: "var(--ds-shell-bg, var(--ds-surface))", color: "var(--ds-text)" }}>
      {/* Brand Header with Hover Toggle */}
      <div className={`sidebar-header relative flex items-center transition-all ${
        compact ? 'justify-center px-2 py-3' : 'justify-between px-4 py-3.5'
      }`}>
        {compact ? (
          /* COMPACT MODE: Hover over logo transforms into toggle button with tooltip */
          <div className="w-full flex items-center justify-center">
            <Tooltip content={hoveredTopToggle ? 'Buka sidebar' : 'DADU Workspace'} position="right">
              <button
                type="button"
                onMouseEnter={() => setHoveredTopToggle(true)}
                onMouseLeave={() => setHoveredTopToggle(false)}
                onClick={() => {
                  setHoveredTopToggle(false);
                  onToggleCompact?.();
                }}
                className="w-10 h-10 rounded-xl flex items-center justify-center transition-all cursor-pointer shadow-xs border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ds-accent)]"
                style={{ background: "var(--ds-surface-elevated)", color: "var(--ds-text)", borderColor: "var(--ds-border)" }}
                aria-label="Buka sidebar"
              >
                {hoveredTopToggle ? (
                  <SidebarSimple className="w-5 h-5 animate-in zoom-in-75 duration-150" style={{ color: "var(--ds-accent)" }} />
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
                  className="hidden lg:flex items-center justify-center w-8 h-8 rounded-lg transition-colors cursor-pointer" style={{ color: "var(--ds-text-muted)" }}
                  aria-label="Tutup sidebar"
                >
                  <SidebarSimple className="w-4 h-4" />
                </button>
              )}

              {/* Mobile close button */}
              <button
                type="button"
                onClick={onCloseMobile}
                className="lg:hidden p-1.5 rounded-lg transition-colors cursor-pointer" style={{ color: "var(--ds-text-muted)" }}
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
                <div className="sidebar-divider my-2 mx-1" />
              ) : (
                <div className="px-3 pt-2 pb-1 text-[10px] font-bold uppercase tracking-wider" style={{ color: "var(--ds-text-muted)" }}>
                  {group.groupTitle}
                </div>
              )
            )}
            {group.items.map((item) => {
              const Icon = item.icon;
              const hasSub = Boolean(item.subItems && item.subItems.length > 0);
              const isExpanded = !compact && hasSub && Boolean(expandedGroups[item.id]);
              const isGroupActive = isItemActive(item.id);
              const isDirectParentActive = currentRoute === item.id;
              const submenuId = `submenu-${item.id}`;
              const disclosureLabel = isExpanded
                ? `Ciutkan menu ${item.label}`
                : `Buka menu ${item.label}`;

              return (
                <div key={item.id} className="space-y-0.5">
                  <div className="relative flex items-center">
                    <Tooltip content={item.label} position="right" disabled={!compact}>
                      <button
                        type="button"
                        onClick={() => handleItemClick(item.id)}
                        aria-current={isDirectParentActive ? 'page' : undefined}
                        data-nav-item="true"
                        data-active={isDirectParentActive || isGroupActive ? 'true' : 'false'}
                        className={`nav-item group relative w-full flex items-center text-xs font-medium cursor-pointer ${
                          compact
                            ? 'justify-center p-2.5 min-h-[42px]'
                            : hasSub
                              ? 'gap-3 pl-3.5 pr-11 py-2.5 min-h-[44px]'
                              : 'gap-3 px-3.5 py-2.5 min-h-[44px]'
                        } ${
                          isDirectParentActive || isGroupActive
                            ? 'font-bold'
                            : 'text-[var(--ds-text-muted)] hover:text-[var(--ds-text)]'
                        }`}
                      >
                        {/* Fluid Sliding Active Capsule — direct or child-active (same language) */}
                        {(isDirectParentActive || isGroupActive) && (
                          <motion.div
                            layoutId="sidebar-active-parent-capsule"
                            transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                            className="nav-active-capsule pointer-events-none absolute inset-0"
                          >
                            <span
                              className="nav-active-marker absolute left-0 top-2.5 bottom-2.5"
                            />
                          </motion.div>
                        )}

                        <span className={`relative z-10 flex items-center min-w-0 ${compact ? 'justify-center' : 'w-full'}`}>
                          <Icon className={`w-4 h-4 shrink-0 transition-colors ${
                            isDirectParentActive || isGroupActive
                              ? 'nav-icon-active'
                              : 'text-[var(--ds-text-muted)] group-hover:text-[var(--ds-text)]'
                          }`} />
                          {!compact && (
                            <div className="flex items-center justify-between flex-1 min-w-0 ml-3">
                              <span className="truncate">{item.label}</span>
                              {item.badgeCount && item.badgeCount > 0 ? (
                                <span className="px-1.5 py-0.5 rounded-full text-[10px] font-black bg-rose-600 text-white shrink-0 ml-1.5">
                                  {item.badgeCount}
                                </span>
                              ) : null}
                            </div>
                          )}
                        </span>

                        {compact && item.badgeCount && item.badgeCount > 0 ? (
                          <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 rounded-full bg-rose-600 border-2 border-[var(--ds-surface)] z-20" />
                        ) : null}
                      </button>
                    </Tooltip>

                    {/* Separate Sibling Disclosure Button (never nested inside nav-item button) */}
                    {!compact && hasSub && (
                      <button
                        type="button"
                        aria-expanded={isExpanded}
                        aria-controls={submenuId}
                        aria-label={disclosureLabel}
                        onClick={(e) => toggleGroupCollapse(item.id, e)}
                        className="sidebar-disclosure-btn absolute right-1.5 top-1/2 -translate-y-1/2 z-20 flex items-center justify-center w-8 h-8 rounded-lg transition-colors cursor-pointer text-[var(--ds-text-muted)] hover:text-[var(--ds-text)] hover:bg-[var(--ds-surface-muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ds-accent)]"
                      >
                        {isExpanded ? (
                          <CaretDown className="w-3.5 h-3.5" />
                        ) : (
                          <CaretRight className="w-3.5 h-3.5" />
                        )}
                      </button>
                    )}
                  </div>

                  {/* Render Accordion Sub-items when expanded */}
                  {!compact && item.subItems && (
                    <div
                      id={submenuId}
                      role="region"
                      aria-label={`Submenu ${item.label}`}
                      hidden={!isExpanded}
                      className={`sidebar-subitem-guide ml-5 pl-2 space-y-1 pt-1 pb-1.5 ${
                        isExpanded ? 'animate-in slide-in-from-top-1 duration-150' : 'hidden'
                      }`}
                    >
                      {item.subItems.map((sub) => {
                        const SubIcon = sub.icon;
                        const isSubActive = isSubItemActive(sub.id);

                        return (
                          <button
                            key={sub.id}
                            type="button"
                            onClick={(e) => handleSubItemClick(sub.id, e)}
                            aria-current={isSubActive ? 'page' : undefined}
                            data-nav-subitem="true"
                            data-active={isSubActive ? 'true' : 'false'}
                            className={`nav-subitem group relative w-full flex items-center gap-2.5 px-2.5 py-2 text-[11px] font-medium text-left cursor-pointer ${
                              isSubActive
                                ? 'font-bold'
                                : 'text-[var(--ds-text-muted)] hover:text-[var(--ds-text)]'
                            }`}
                          >
                            {/* Fluid Sliding Active Capsule for sub-menu item */}
                            {isSubActive && (
                              <motion.div
                                layoutId="sidebar-active-subitem-capsule"
                                transition={{ type: 'spring', stiffness: 400, damping: 32 }}
                                className="nav-active-capsule pointer-events-none absolute inset-0"
                              >
                                <span
                                  className="nav-active-marker absolute left-0 top-1.5 bottom-1.5"
                                />
                              </motion.div>
                            )}

                            <span className="relative z-10 flex items-center gap-2.5 w-full min-w-0">
                              <SubIcon className={`w-3.5 h-3.5 shrink-0 transition-colors ${
                                isSubActive 
                                  ? 'nav-icon-active'
                                  : 'text-[var(--ds-text-muted)] group-hover:text-[var(--ds-text)]'
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
        <div className="sidebar-footer p-3">
          <div className="px-2 pt-0.5 text-[11px] font-semibold select-none" style={{ color: "var(--ds-text-muted)" }}>
            {APP_CONFIG.name}
          </div>
        </div>
      )}
    </div>
  );

  return (
    <>
      {/* Desktop Persistent Sidebar with z-40 to prevent Header overlap */}
      <aside className={`sidebar-shell hidden lg:block shrink-0 h-screen sticky top-0 z-40 transition-all duration-200 ${
        isCompact ? 'w-18' : 'w-64'
      }`}>
        {renderContent(isCompact)}
      </aside>

      {/* Mobile Drawer (always full width) */}
      {isMobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div 
            className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
            onClick={onCloseMobile}
          />
          <div className="sidebar-shell-mobile fixed inset-y-0 left-0 max-w-xs w-full z-50 animate-in slide-in-from-left duration-200">
            {renderContent(false)}
          </div>
        </div>
      )}
    </>
  );
};
