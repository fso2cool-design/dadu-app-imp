import React from 'react';
import { SquaresFour, CalendarCheck, CheckSquare, List, ClipboardText } from '@phosphor-icons/react';

interface BottomNavProps {
  currentRoute: string;
  onNavigate: (route: string) => void;
  onOpenMobileMenu: () => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  currentRoute,
  onNavigate,
  onOpenMobileMenu,
}) => {
  const navItems = [
    { id: 'more', label: 'List', icon: List, isMore: true },
    { id: 'dashboard', label: 'Dasbor', icon: SquaresFour },
    { id: 'meetings', label: 'Jurnal', icon: CalendarCheck },
    { id: 'attendance-subject', label: 'Presensi', icon: CheckSquare },
    { id: 'grades', label: 'Nilai', icon: ClipboardText },
  ];

  return (
    <div className="no-print lg:hidden fixed bottom-0 left-0 right-0 z-40 backdrop-blur-lg border-t px-2 py-1.5 shadow-[0_-4px_20px_rgba(0,0,0,0.08)] select-none safe-area-pb" style={{ background: "color-mix(in srgb, var(--ds-surface) 95%, transparent)", borderColor: "var(--ds-border)" }}>
      <span className="paper-nav-tape" aria-hidden="true" />
      <div className="flex items-center justify-around max-w-lg mx-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentRoute === item.id;

          if (item.isMore) {
            return (
              <button
                key={item.id}
                type="button"
                onClick={onOpenMobileMenu}
                className="flex flex-col items-center justify-center py-1 px-2.5 rounded-xl transition-all cursor-pointer active:scale-95 min-w-[52px]" style={{ color: "var(--ds-text-muted)" }}
                aria-label="Buka Semua List"
              >
                <Icon className="w-5 h-5" />
                <span className="text-[10px] font-medium mt-0.5">
                  {item.label}
                </span>
              </button>
            );
          }

          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onNavigate(item.id)}
              className={`relative overflow-hidden flex flex-col items-center justify-center py-1 px-2 rounded-xl transition-all cursor-pointer active:scale-95 min-w-[52px] ${
                isActive
                  ? 'text-accent-text font-bold'
                  : 'hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              {isActive && (<span className="pointer-events-none absolute inset-0 rounded-xl bg-accent-primary-soft border border-accent-primary-border paper-active-capsule" aria-hidden />)}
              <span className="relative paper-sticker-icon" data-active={isActive ? "true" : "false"}><Icon className={`w-5 h-5 transition-transform ${isActive ? 'scale-110 text-accent-primary' : ''}`} /></span>
              <span className="text-[10px] font-medium mt-0.5">
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
