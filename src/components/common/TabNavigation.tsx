import React from 'react';
import { Icon } from '@phosphor-icons/react';

export interface TabItem {
  id: string;
  label: string;
  icon?: Icon;
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
      className={`flex items-center gap-1.5 p-1 rounded-[var(--ds-radius-lg)] bg-[var(--ds-surface-muted)] border border-[var(--ds-border)] overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden ${className}`}
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
            className={`flex items-center gap-2 rounded-[var(--ds-radius-md)] font-semibold transition-all duration-150 whitespace-nowrap cursor-pointer select-none ${
              size === 'sm' ? 'px-3 py-1.5 text-xs' : 'px-4 py-2 text-xs sm:text-sm'
            } ${
              isActive
                ? 'bg-[var(--ds-surface-elevated)] text-[var(--ds-text)] shadow-[var(--ds-elevation-sm)] border border-[var(--ds-border)] font-bold'
                : 'text-[var(--ds-text-muted)] hover:text-[var(--ds-text)] hover:bg-[var(--ds-accent-soft)] border border-transparent'
            }`}
          >
            {Icon && (
              <Icon 
                className={`shrink-0 ${size === 'sm' ? 'w-3.5 h-3.5' : 'w-4 h-4'} ${
                  isActive ? 'text-[var(--ds-accent)]' : 'text-[var(--ds-text-muted)]'
                }`} 
              />
            )}
            <span>{tab.label}</span>
            {tab.badge !== undefined && (
              <span
                className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                  isActive
                    ? 'bg-[var(--ds-accent-soft)] text-[var(--ds-accent)] border border-[var(--ds-accent)]/30'
                    : 'bg-[var(--ds-surface)] text-[var(--ds-text-muted)] border border-[var(--ds-border)]'
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
