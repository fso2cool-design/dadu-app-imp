import React from 'react';
import { LucideIcon } from 'lucide-react';

export interface TabItem {
  id: string;
  label: string;
  icon?: LucideIcon;
  badge?: string | number;
  badgeVariant?: 'default' | 'danger' | 'success' | 'warning';
}

interface TabNavigationProps {
  tabs: TabItem[];
  activeTab: string;
  onChange: (tabId: string) => void;
  className?: string;
  size?: 'sm' | 'md';
}

export const TabNavigation: React.FC<TabNavigationProps> = ({
  tabs,
  activeTab,
  onChange,
  className = '',
  size = 'md',
}) => {
  return (
    <div 
      className={`flex items-center gap-1.5 p-1 rounded-2xl bg-slate-100/90 dark:bg-[#141722] border border-slate-200 dark:border-[#232838] overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden ${className}`}
      role="tablist"
    >
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        const Icon = tab.icon;

        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(tab.id)}
            className={`flex items-center gap-2 rounded-xl font-semibold transition-all duration-150 whitespace-nowrap cursor-pointer select-none ${
              size === 'sm' ? 'px-3 py-1.5 text-xs' : 'px-4 py-2 text-xs sm:text-sm'
            } ${
              isActive
                ? 'bg-white dark:bg-[#0c0e15] text-orange-600 dark:text-cyan-400 shadow-xs dark:shadow-[0_0_12px_rgba(6,182,212,0.25)] border border-slate-200/80 dark:border-cyan-500/50 font-bold'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-white/60 dark:hover:bg-[#1b1f2e] border border-transparent'
            }`}
          >
            {Icon && (
              <Icon 
                className={`shrink-0 ${size === 'sm' ? 'w-3.5 h-3.5' : 'w-4 h-4'} ${
                  isActive ? 'text-orange-600 dark:text-cyan-400' : 'text-slate-400 dark:text-slate-500'
                }`} 
              />
            )}
            <span>{tab.label}</span>
            {tab.badge !== undefined && (
              <span
                className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                  isActive
                    ? 'bg-orange-50 dark:bg-cyan-950 text-orange-700 dark:text-cyan-300 border border-orange-200 dark:border-cyan-500/50'
                    : 'bg-slate-200/70 dark:bg-[#232838] text-slate-600 dark:text-slate-400'
                }`}
              >
                {tab.badge}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
};
