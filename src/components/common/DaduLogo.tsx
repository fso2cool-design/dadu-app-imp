import React from 'react';
import { AppLogo, AppLogoProps, AppLogoSize } from './AppLogo';

export interface DaduLogoProps extends Omit<AppLogoProps, 'size'> {
  size?: AppLogoSize | string;
  withGlow?: boolean;
}

/**
 * DaduLogo - Backward compatibility wrapper around AppLogo
 */
export const DaduLogo: React.FC<DaduLogoProps> = ({ 
  size = 'md', 
  className = '',
  withGlow = true,
  animated = true,
  ...props
}) => {
  const normalizedSize: AppLogoSize = typeof size === 'number'
    ? size
    : (['xs', 'sm', 'md', 'lg', 'xl'].includes(size)
      ? (size as AppLogoSize)
      : (parseInt(String(size), 10) || 36));

  return (
    <AppLogo 
      size={normalizedSize} 
      animated={animated}
      className={`${className} ${withGlow ? 'filter drop-shadow-[0_0_12px_rgba(20,184,166,0.35)]' : ''}`}
      {...props}
    />
  );
};

export default DaduLogo;
