import React from 'react';

interface GenderIconProps {
  gender: 'L' | 'P' | 'MALE' | 'FEMALE' | string;
  className?: string;
  size?: number;
}

export const GenderIcon: React.FC<GenderIconProps> = ({ gender, className = '', size = 16 }) => {
  const isMale = gender === 'L' || gender === 'MALE' || gender?.toUpperCase() === 'L';

  if (isMale) {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={`inline-block shrink-0 ${className}`}
      >
        {/* Modern stylized Male avatar with neat haircut */}
        <circle cx="12" cy="7" r="4" fill="currentColor" fillOpacity="0.25" stroke="currentColor" strokeWidth="1.8" />
        <path
          d="M8.5 4.5C8.5 4.5 10 3 13 3C15.5 3 16 4.5 16 4.5"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
        <path
          d="M4 19.5C4 16.4624 7.58172 14 12 14C16.4183 14 20 16.4624 20 19.5V20.5H4V19.5Z"
          fill="currentColor"
          fillOpacity="0.2"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinejoin="round"
        />
      </svg>
    );
  }

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`inline-block shrink-0 ${className}`}
    >
      {/* Modern stylized Female avatar with elegant hijab/silhouette */}
      <circle cx="12" cy="7" r="4.2" fill="currentColor" fillOpacity="0.25" stroke="currentColor" strokeWidth="1.8" />
      <path
        d="M7.8 7.5C7.8 5 9.5 3 12 3C14.5 3 16.2 5 16.2 7.5C16.2 9.5 15.5 11 12 11C8.5 11 7.8 9.5 7.8 7.5Z"
        fill="currentColor"
        fillOpacity="0.15"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <path
        d="M4.5 19.5C4.5 16.4624 7.85786 14 12 14C16.1421 14 19.5 16.4624 19.5 19.5V20.5H4.5V19.5Z"
        fill="currentColor"
        fillOpacity="0.2"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
    </svg>
  );
};

interface GenderBadgeProps {
  gender: 'L' | 'P' | 'MALE' | 'FEMALE' | string;
  count?: number;
  showLabel?: boolean;
  size?: 'sm' | 'md';
  className?: string;
}

export const GenderBadge: React.FC<GenderBadgeProps> = ({
  gender,
  count,
  showLabel = true,
  size = 'md',
  className = '',
}) => {
  const isMale = gender === 'L' || gender === 'MALE' || gender?.toUpperCase() === 'L';
  const label = isMale ? 'Laki-laki' : 'Perempuan';
  const shortLabel = isMale ? 'L' : 'P';

  const themeClasses = isMale
    ? 'bg-sky-50 dark:bg-sky-950/40 text-sky-700 dark:text-sky-300 border-sky-200/80 dark:border-sky-800/60'
    : 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border-rose-200/80 dark:border-rose-800/60';

  const sizeClasses = size === 'sm'
    ? 'px-2 py-0.5 text-[11px] gap-1.5'
    : 'px-2.5 py-1 text-xs gap-2';

  const iconSize = size === 'sm' ? 14 : 16;

  return (
    <span
      className={`inline-flex items-center font-medium rounded-lg border transition-colors ${themeClasses} ${sizeClasses} ${className}`}
    >
      <GenderIcon gender={gender} size={iconSize} />
      {count !== undefined ? (
        <span className="font-semibold">
          {count} {showLabel ? label : shortLabel}
        </span>
      ) : (
        <span className="font-semibold">{showLabel ? label : shortLabel}</span>
      )}
    </span>
  );
};
