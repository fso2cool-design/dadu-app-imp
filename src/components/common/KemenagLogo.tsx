import React from 'react';

interface KemenagLogoProps {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  className?: string;
  withGlow?: boolean;
}

export const KemenagLogo: React.FC<KemenagLogoProps> = ({
  size = 'md',
  className = '',
  withGlow = false,
}) => {
  const sizeMap = {
    xs: 'w-6 h-6',
    sm: 'w-8 h-8',
    md: 'w-12 h-12',
    lg: 'w-16 h-16',
    xl: 'w-20 h-20',
    '2xl': 'w-24 h-24',
  };

  return (
    <div
      className={`inline-flex items-center justify-center shrink-0 ${sizeMap[size]} ${className}`}
      style={{
        filter: withGlow ? 'drop-shadow(0 4px 12px rgba(0, 99, 22, 0.25))' : 'none',
      }}
    >
      <img
        src="/images/logo-kemenag.svg"
        alt="Kementerian Agama RI - Ikhlas Beramal"
        className="w-full h-full object-contain select-none transition-transform hover:scale-105 duration-300"
        referrerPolicy="no-referrer"
        onError={(e) => {
          // Fallback to PNG if SVG fails
          const target = e.currentTarget;
          if (!target.src.endsWith('.png')) {
            target.src = '/images/logo-kemenag.png';
          }
        }}
      />
    </div>
  );
};
