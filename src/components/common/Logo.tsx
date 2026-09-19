import React from 'react';
import { AppLogo, AppLogoProps, AppLogoSize, AppLogoVariant } from './AppLogo';

export type LogoSize = AppLogoSize | string;

export interface LogoProps extends Omit<AppLogoProps, 'size'> {
  size?: LogoSize;
}

/**
 * Logo - Komponen Logo DADU (Backward-Compatible Wrapper menuju AppLogo)
 * 
 * Menggunakan `logo.svg` sebagai Single Source of Truth.
 */
export const Logo: React.FC<LogoProps> = ({
  size = 'md',
  ...props
}) => {
  // Normalize string numbers like "36" to numeric 36, or pass standard preset
  const normalizedSize: AppLogoSize = typeof size === 'number'
    ? size
    : (['xs', 'sm', 'md', 'lg', 'xl'].includes(size)
      ? (size as AppLogoSize)
      : (parseInt(String(size), 10) || 36));

  return <AppLogo size={normalizedSize} {...props} />;
};

export default Logo;
