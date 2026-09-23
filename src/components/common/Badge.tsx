import React, { ReactNode } from 'react';

interface BadgeProps {
  variant?: 'default' | 'primary' | 'success' | 'warning' | 'danger' | 'info' | 'purple' | 'violet' | 'blue' | 'neutral';
  children: ReactNode;
  size?: 'sm' | 'md';
}

export const Badge: React.FC<BadgeProps> = ({ 
  variant = 'default', 
  children,
  size = 'md'
}) => {
  const variantStyles = {
    default: 'bg-slate-100 dark:bg-[#141722] text-slate-700 dark:text-slate-300 border-slate-200 dark:border-[#232838]',
    primary: 'bg-orange-50 dark:bg-cyan-950/60 text-orange-700 dark:text-cyan-300 border-orange-200 dark:border-cyan-500/40',
    success: 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-500/40',
    warning: 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-500/40',
    danger: 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-500/50',
    info: 'bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 border-sky-200 dark:border-sky-500/40',
    purple: 'bg-violet-50 dark:bg-violet-950/60 text-violet-700 dark:text-violet-300 border-violet-200 dark:border-violet-500/40',
    violet: 'bg-violet-50 dark:bg-violet-950/60 text-violet-700 dark:text-violet-300 border-violet-200 dark:border-violet-500/40',
    blue: 'bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 border-sky-200 dark:border-sky-500/40',
    neutral: 'bg-slate-100 dark:bg-[#141722] text-slate-700 dark:text-slate-300 border-slate-200 dark:border-[#232838]',
  }[variant];

  const sizeStyles = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-xs font-medium px-2.5 py-1',
  }[size];

  return (
    <span className={`inline-flex items-center gap-1 rounded-md border font-medium whitespace-nowrap ${variantStyles} ${sizeStyles}`}>
      {children}
    </span>
  );
};
