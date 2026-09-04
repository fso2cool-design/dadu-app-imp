import React from 'react';

interface SkeletonProps {
  className?: string;
}

export const Skeleton: React.FC<SkeletonProps> = ({ className = '' }) => {
  return (
    <div
      className={`animate-pulse bg-slate-200/80 dark:bg-[#1f2433] rounded-lg ${className}`}
    />
  );
};

export const SkeletonCardGrid: React.FC<{ count?: number }> = ({ count = 3 }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="bg-white dark:bg-[#141722] rounded-2xl border border-slate-200/80 dark:border-[#232838] p-5 shadow-xs space-y-4"
        >
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <Skeleton className="w-16 h-5 rounded-md" />
              <Skeleton className="w-40 h-5 rounded-md" />
              <Skeleton className="w-28 h-4 rounded-md" />
            </div>
            <Skeleton className="w-24 h-6 rounded-full" />
          </div>

          <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-[#232838]">
            <div className="flex justify-between">
              <Skeleton className="w-32 h-3.5" />
              <Skeleton className="w-20 h-3.5" />
            </div>
            <Skeleton className="w-full h-2 rounded-full" />
          </div>

          <div className="pt-3 border-t border-slate-100 dark:border-[#232838] flex gap-2">
            <Skeleton className="flex-1 h-9 rounded-xl" />
            <Skeleton className="flex-1 h-9 rounded-xl" />
            <Skeleton className="flex-1 h-9 rounded-xl" />
          </div>
        </div>
      ))}
    </div>
  );
};

export const SkeletonTable: React.FC<{ rows?: number; columns?: number }> = ({
  rows = 6,
  columns = 5,
}) => {
  return (
    <div className="bg-white dark:bg-[#141722] rounded-2xl border border-slate-200/80 dark:border-[#232838] overflow-hidden shadow-xs">
      <div className="p-4 border-b border-slate-100 dark:border-[#232838] flex items-center justify-between gap-4">
        <Skeleton className="w-48 h-5" />
        <div className="flex gap-2">
          <Skeleton className="w-24 h-8 rounded-xl" />
          <Skeleton className="w-28 h-8 rounded-xl" />
        </div>
      </div>
      <div className="p-4 space-y-3">
        {Array.from({ length: rows }).map((_, rIdx) => (
          <div key={rIdx} className="flex items-center gap-3 py-1.5 border-b border-slate-100 dark:border-[#232838]/60 last:border-0">
            <Skeleton className="w-8 h-6 rounded" />
            <Skeleton className="w-48 sm:w-64 h-6 rounded" />
            <Skeleton className="w-24 h-6 rounded hidden sm:block" />
            <Skeleton className="flex-1 h-6 rounded" />
            <Skeleton className="w-20 h-6 rounded" />
          </div>
        ))}
      </div>
    </div>
  );
};

export const SkeletonStatsBar: React.FC = () => {
  return (
    <div className="p-4 bg-white dark:bg-[#141722] rounded-2xl border border-slate-200/80 dark:border-[#232838] shadow-xs space-y-3">
      <div className="flex justify-between items-center pb-2 border-b border-slate-100 dark:border-[#232838]">
        <Skeleton className="w-44 h-5" />
        <Skeleton className="w-32 h-6 rounded-full" />
      </div>
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="p-2.5 rounded-xl bg-slate-50 dark:bg-[#0c0e15] border border-slate-100 dark:border-[#232838] space-y-1.5 flex flex-col items-center">
            <Skeleton className="w-14 h-3" />
            <Skeleton className="w-8 h-6" />
          </div>
        ))}
      </div>
    </div>
  );
};

export const SkeletonMeetingList: React.FC<{ count?: number }> = ({ count = 3 }) => {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="bg-white dark:bg-[#141722] p-5 rounded-2xl border border-slate-200/80 dark:border-[#232838] space-y-3"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-3">
              <Skeleton className="w-10 h-10 rounded-xl" />
              <div className="space-y-1.5">
                <Skeleton className="w-48 h-5 rounded-md" />
                <Skeleton className="w-32 h-3.5 rounded-md" />
              </div>
            </div>
            <Skeleton className="w-24 h-6 rounded-full" />
          </div>
          <div className="pt-2 border-t border-slate-100 dark:border-[#232838] flex flex-wrap gap-2">
            <Skeleton className="w-28 h-6 rounded-lg" />
            <Skeleton className="w-28 h-6 rounded-lg" />
            <Skeleton className="w-36 h-6 rounded-lg" />
          </div>
        </div>
      ))}
    </div>
  );
};

