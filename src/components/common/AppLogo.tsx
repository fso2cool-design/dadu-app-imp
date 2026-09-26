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

const LOGO_ANIMATION_STYLES = `
@keyframes daduCubeFloat {
  0%, 100% {
    transform: translateY(0px) scale(1);
  }
  50% {
    transform: translateY(-2px) scale(1.012);
  }
}

@keyframes daduShineSweep {
  0%, 70% {
    transform: translateX(-150%) rotate(25deg);
    opacity: 0;
  }
  73% {
    opacity: 1;
  }
  87% {
    opacity: 1;
  }
  90%, 100% {
    transform: translateX(150%) rotate(25deg);
    opacity: 0;
  }
}

.dadu-cube-animated {
  animation: daduCubeFloat 4s ease-in-out infinite;
  transform-origin: center center;
  will-change: transform;
}

.dadu-shine-sweep {
  animation: daduShineSweep 6s cubic-bezier(0.4, 0, 0.2, 1) infinite;
  will-change: transform, opacity;
}

@media (prefers-reduced-motion: reduce) {
  .dadu-cube-animated,
  .dadu-shine-sweep {
    animation: none !important;
    transform: none !important;
  }
}
`;

/**
 * AppLogo - Komponen Resmi Logo DADU (Digitalisasi Data Guru)
 * 
 * Single Source of Truth: `logo.svg` (FloatingCube brand mark)
 * 
 * Desain & Sistem Animasi:
 * - Smooth entrance motion (opacity 0 -> 1, scale 0.94 -> 1, translateY 6 -> 0)
 * - Subtle breathing & float (scale 1.000 -> 1.012, translateY 0px -> -2px, 4s cycle)
 * - Periodic soft shine sweep (6s cycle, mask-clipped to cube facets, active for >=32px)
 * - Micro-interaction hover (scale 1.04, subtle lift y: -1, soft radiant glow)
 * - Reduced-motion accessibility (CSS media query disables continuous animations)
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
      <div className={`relative w-full h-full flex items-center justify-center ${shouldAnimate ? 'dadu-cube-animated' : ''}`}>
        <img
          src={logoSvg}
          alt={alt}
          width={pixelSize}
          height={pixelSize}
          loading="eager"
          decoding="async"
          draggable={false}
          className="w-full h-full object-contain filter drop-shadow-[0_2px_8px_rgba(80,72,164,0.25)] transition-all duration-300 group-hover:drop-shadow-[0_4px_16px_rgba(139,209,220,0.40)] pointer-events-none"
        />

        {shouldAnimate && pixelSize >= 32 && (
          <div
            className="absolute inset-0 pointer-events-none overflow-hidden select-none"
            style={{
              maskImage: `url("${logoSvg}")`,
              WebkitMaskImage: `url("${logoSvg}")`,
              maskSize: 'contain',
              WebkitMaskSize: 'contain',
              maskRepeat: 'no-repeat',
              WebkitMaskRepeat: 'no-repeat',
              maskPosition: 'center',
              WebkitMaskPosition: 'center',
            }}
            aria-hidden="true"
          >
            <div
              className="dadu-shine-sweep absolute inset-[-50%] w-[200%] h-[200%] pointer-events-none"
              style={{
                background: 'linear-gradient(115deg, transparent 0%, transparent 42%, rgba(255, 255, 255, 0.18) 50%, transparent 58%, transparent 100%)',
              }}
            />
          </div>
        )}
      </div>
    </motion.div>
  );

  // If mark-only, return just the icon image container
  if (effectiveVariant === 'mark') {
    return (
      <MotionConfig reducedMotion="user">
        <motion.div
          id={id}
          className={`inline-flex items-center justify-center ${isInteractive ? 'cursor-pointer' : ''} ${className}`}
          onClick={onClick}
          {...entranceAnimation}
        >
          {imageElement}
          <style>{LOGO_ANIMATION_STYLES}</style>
        </motion.div>
      </MotionConfig>
    );
  }

  // Horizontal or Full with Typography Block
  return (
    <MotionConfig reducedMotion="user">
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
        <style>{LOGO_ANIMATION_STYLES}</style>
      </motion.div>
    </MotionConfig>
  );
};

export default AppLogo;
