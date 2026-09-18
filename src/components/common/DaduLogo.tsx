import React from 'react';
import { Logo } from './Logo';

interface DaduLogoProps {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | number | string;
  className?: string;
  withGlow?: boolean;
  animated?: boolean;
}

/**
 * DaduLogo (Backward compatibility wrapper around new isometric digital network Logo)
 */
export const DaduLogo: React.FC<DaduLogoProps> = ({ 
  size = 'md', 
  className = '',
  withGlow = true,
  animated = true
}) => {
  return (
    <Logo 
      size={size} 
      animated={animated}
      className={`${className} ${withGlow ? 'filter drop-shadow-[0_0_12px_rgba(217,70,239,0.45)]' : ''}`}
    />
  );
};
