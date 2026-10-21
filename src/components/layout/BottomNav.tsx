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
    <div className="bottom-nav-container bottom-nav-shell no-print lg:hidden fixed bottom-0 left-0 right-0 z-40 select-none safe-area-pb">
      <div className="bottom-nav-inner flex items-center justify-around max-w-lg mx-auto px-2 py-1.5">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentRoute === item.id;

          if (item.isMore) {
            return (
              <button
                key={item.id}
                type="button"
                onClick={onOpenMobileMenu}
                className="bottom-nav-item flex flex-col items-center justify-center py-1.5 px-3 min-w-[56px] cursor-pointer text-[var(--ds-text-muted)] hover:text-[var(--ds-text)]"
                aria-label="Buka Semua List"
                data-active="false"
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
              aria-current={isActive ? 'page' : undefined}
              data-active={isActive ? 'true' : 'false'}
              className={`bottom-nav-item group relative flex flex-col items-center justify-center py-1.5 px-3 min-w-[56px] cursor-pointer ${
                isActive
                  ? 'font-bold'
                  : 'text-[var(--ds-text-muted)] hover:text-[var(--ds-text)]'
              }`}
            >
              {isActive && (
                <span
                  className="bottom-nav-active-capsule pointer-events-none absolute inset-0"
                  aria-hidden
                />
              )}
              <span className="relative z-10">
                <Icon
                  className={`w-5 h-5 transition-transform ${
                    isActive ? 'scale-110 nav-icon-active' : ''
                  }`}
                />
              </span>
              <span className="relative z-10 text-[10px] font-medium mt-0.5">
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
