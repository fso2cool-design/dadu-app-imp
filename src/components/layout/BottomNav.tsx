import React from 'react';
import { SquaresFour, CalendarCheck, CheckSquare, Medal, List } from '@phosphor-icons/react';
import { useAppTheme } from '../../context/ThemeContext';

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
  const { activeTheme, isDark } = useAppTheme();

  const navItems = [
    { id: 'more', label: 'List', icon: List, isMore: true },
    { id: 'dashboard', label: 'Dasbor', icon: SquaresFour },
    { id: 'meetings', label: 'Jurnal', icon: CalendarCheck },
    { id: 'attendance-subject', label: 'Presensi', icon: CheckSquare },
    { id: 'grades', label: 'Nilai', icon: Medal },
  ];

  return (
    <div className="no-print lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-[#0c0e15]/95 backdrop-blur-lg border-t border-slate-200/90 dark:border-[#232838] px-2 py-1.5 shadow-[0_-4px_20px_rgba(0,0,0,0.08)] select-none safe-area-pb">
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
                className="flex flex-col items-center justify-center py-1 px-2.5 rounded-xl transition-all cursor-pointer text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 active:scale-95 min-w-[52px]"
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
              className={`flex flex-col items-center justify-center py-1 px-2 rounded-xl transition-all cursor-pointer active:scale-95 min-w-[52px] ${
                isActive
                  ? 'text-accent-primary font-bold'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              <div className="relative">
                <Icon className={`w-5 h-5 transition-transform ${isActive ? 'scale-110' : ''}`} />
                {isActive && (
                  <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-accent-primary" />
                )}
              </div>
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
