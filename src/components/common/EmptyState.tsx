import React from 'react';
import { Icon, Tray } from '@phosphor-icons/react';

interface EmptyStateProps {
  icon?: Icon;
  title: string;
  description?: string;
  actionText?: string;
  onAction?: () => void;
  actionIcon?: Icon;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon: Icon = Tray,
  title,
  description,
  actionText,
  onAction,
  actionIcon: ActionIcon,
}) => {
  return (
    <div className="flex flex-col items-center justify-center p-8 sm:p-12 text-center rounded-3xl border border-dashed border-[var(--ds-border)] bg-[color-mix(in_srgb,var(--ds-surface-elevated)_50%,transparent)] backdrop-blur-xs my-4">
      <div className="w-14 h-14 rounded-2xl bg-[var(--ds-surface-muted)] border border-[var(--ds-border)] flex items-center justify-center text-[var(--ds-text-muted)] mb-4 shadow-inner">
        <Icon className="w-7 h-7" />
      </div>
      <h3 className="text-sm sm:text-base font-bold text-[var(--ds-text)] mb-1.5">
        {title}
      </h3>
      {description && (
        <p className="text-xs sm:text-sm text-[var(--ds-text-muted)] max-w-sm mb-5 leading-relaxed">
          {description}
        </p>
      )}
      {actionText && onAction && (
        <button
          type="button"
          onClick={onAction}
          className="px-4 py-2 rounded-xl btn-primary active:scale-95 text-xs font-bold flex items-center gap-2 shadow-sm transition-all cursor-pointer"
        >
          {ActionIcon && <ActionIcon className="w-4 h-4" />}
          <span>{actionText}</span>
        </button>
      )}
    </div>
  );
};
