import React from 'react';
import { motion, MotionConfig } from 'motion/react';
import logoSvg from '../../assets/logo.svg';

export type AppLogoSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | number;
export type AppLogoVariant = 'full' | 'mark' | 'horizontal';

export interface AppLogoProps {
  /** Size preset or custom numeric pixel value */
  size?: AppLogoSize;
  /** Presentation variant: 'mark' (icon only), 'horizontal' (icon + title), or 'full' (icon + title + subtitle) */
  variant?: AppLogoVariant;
  /** Whether to enable refined entrance and hover micro-interaction */
  animated?: boolean;
  /** Container custom CSS classes */
  className?: string;
  /** Custom CSS classes for the text block */
  textClassName?: string;
  /** Custom subtitle (e.g. 'Digitalisasi Data Guru') */
  subtitle?: string;
  /** Optional click handler for interactive badges */
  onClick?: () => void;
  /** Backward-compatible flag for legacy components */
  showText?: boolean;
  /** Whether the sidebar is collapsed (smoothly collapses text) */
  collapsed?: boolean;
  /** Unique ID for DOM element identification */
  id?: string;
  /** Custom alt description for accessibility */
  alt?: string;
}

const SIZE_MAP: Record<string, number> = {
  xs: 22,
  sm: 28,
  md: 36,
  lg: 48,
  xl: 64,
};

/**
 * AppLogo - Komponen Resmi Logo DADU (Digitalisasi Data Guru)
 * 
 * Single Source of Truth: `logo.svg`
 * 
 * Desain & Interaksi:
 * - Smooth entrance motion (opacity 0 -> 1, scale 0.94 -> 1, translateY 6 -> 0)
 * - Micro-interaction hover (scale 1.04, subtle lift y: -1, soft luminous glow)
 * - Resting state stabil setelah entrance selesai (tanpa animasi infinite)
 * - Animasi penuh dan konsisten (bebas dari penonaktifan reduced motion eksternal)
 * - Menggunakan MotionConfig reducedMotion="never" lokal khusus komponen logo
 * - Adaptif untuk Sidebar (expanded/collapsed), Header, Login, Loading, dan Mobile
 */
export const AppLogo: React.FC<AppLogoProps> = ({
  size = 'md',
  variant,
  animated = true,
  className = '',
  textClassName = '',
  subtitle = 'Digitalisasi Data Guru',
  onClick,
  showText,
  collapsed = false,
  id = 'dadu-app-logo',
  alt = 'Logo Resmi DADU',
}) => {
  const isInteractive = Boolean(onClick);

  // Compute numeric dimensions
  const pixelSize = typeof size === 'number' 
    ? size 
    : SIZE_MAP[size] || 36;

  // Determine effective variant
  // If showText was passed (legacy), respect it; otherwise respect variant or collapsed state
  const effectiveVariant: AppLogoVariant = variant 
    ? variant 
    : (showText === false || collapsed) 
      ? 'mark' 
      : (showText || subtitle) 
        ? 'full' 
        : 'mark';

  const shouldAnimate = animated;

  // Refined entrance configuration (500ms duration, smooth easing, resting at stable state)
  const entranceAnimation = shouldAnimate ? {
    initial: { opacity: 0, y: 6, scale: 0.94 },
    animate: { opacity: 1, y: 0, scale: 1 },
    transition: { 
      duration: 0.5, 
      ease: [0.16, 1, 0.3, 1] as const
    },
  } : {};

  // Subtle hover micro-interaction (scale 1.04, subtle lift y: -1, smooth transition)
  const hoverAnimation = shouldAnimate ? {
    whileHover: { 
      scale: 1.04,
      y: -1,
      transition: { duration: 0.22, ease: [0.16, 1, 0.3, 1] as const }
    },
    whileTap: isInteractive ? { scale: 0.98 } : undefined,
  } : {};

  const imageElement = (
    <motion.div
      className="relative shrink-0 flex items-center justify-center select-none"
      style={{ width: pixelSize, height: pixelSize }}
      {...hoverAnimation}
    >
      <img
        src={logoSvg}
        alt={alt}
        width={pixelSize}
        height={pixelSize}
        loading="eager"
        decoding="async"
        draggable={false}
        className="w-full h-full object-contain filter drop-shadow-[0_2px_10px_rgba(109,194,59,0.25)] transition-all duration-300 group-hover:drop-shadow-[0_4px_18px_rgba(245,158,11,0.35)]"
      />
    </motion.div>
  );

  // If mark-only, return just the icon image container
  if (effectiveVariant === 'mark') {
    return (
      <MotionConfig reducedMotion="never">
        <motion.div
          id={id}
          className={`inline-flex items-center justify-center ${isInteractive ? 'cursor-pointer' : ''} ${className}`}
          onClick={onClick}
          {...entranceAnimation}
        >
          {imageElement}
        </motion.div>
      </MotionConfig>
    );
  }

  // Horizontal or Full with Typography Block
  return (
    <MotionConfig reducedMotion="never">
      <motion.div
        id={id}
        className={`inline-flex items-center gap-2.5 min-w-0 ${isInteractive ? 'cursor-pointer group' : ''} ${className}`}
        onClick={onClick}
        {...entranceAnimation}
      >
        {imageElement}

        <div className={`flex flex-col text-left min-w-0 leading-none select-none transition-opacity duration-250 ${textClassName}`}>
          <span className="font-extrabold text-slate-900 dark:text-white text-base sm:text-lg tracking-tight truncate font-sans">
            DADU
          </span>
          
          {effectiveVariant === 'full' && subtitle && (
            <span className="text-[10px] sm:text-[11px] font-medium text-slate-500 dark:text-slate-400 tracking-tight truncate mt-1">
              {subtitle}
            </span>
          )}
        </div>
      </motion.div>
    </MotionConfig>
  );
};

export default AppLogo;
