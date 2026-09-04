import React from 'react';

interface KemenagBerdampakLogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

export const KemenagBerdampakLogo: React.FC<KemenagBerdampakLogoProps> = ({
  size = 'md',
  className = '',
}) => {
  const sizeMap = {
    sm: 'h-7',
    md: 'h-9',
    lg: 'h-11',
    xl: 'h-14',
  };

  return (
    <div className={`inline-flex items-center justify-center shrink-0 ${className}`}>
      <img
        src="/images/logo-kemenag-berdampak.svg"
        alt="Kemenag Berdampak"
        className={`w-auto ${sizeMap[size]} object-contain select-none transition-transform hover:scale-105 duration-300`}
        referrerPolicy="no-referrer"
      />
    </div>
  );
};
