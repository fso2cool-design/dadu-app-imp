import React, { useState } from 'react';
import { motion, MotionConfig, useReducedMotion } from 'motion/react';
import logoSvg from '../../assets/logo.svg';
import { DaduIsometricCube } from './DaduIsometricCube';

export type AppLogoSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | number;
export type AppLogoVariant = 'full' | 'mark' | 'horizontal';
export type AppLogoAnimationMode = 'default' | 'drop' | 'loading' | 'none';

export interface AppLogoProps {
  /** Size preset or custom numeric pixel value */
  size?: AppLogoSize;
  /** Presentation variant: 'mark' (icon only), 'horizontal' (icon + title), or 'full' (icon + title + subtitle) */
  variant?: AppLogoVariant;
  /** Whether to enable refined entrance and hover micro-interaction */
  animated?: boolean;
  /** Specialized animation preset */
  animationMode?: AppLogoAnimationMode;
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
    transform: translateY(0px) rotate(0deg) scale(1);
  }
  50% {
    transform: translateY(-3.5px) rotate(1.2deg) scale(1.02);
  }
}

@keyframes daduCubeLoadingFloat {
  0%, 100% {
    transform: translateY(0px) rotate(0deg) scale(1);
  }
  50% {
    transform: translateY(-4px) rotate(1.2deg) scale(1.02);
  }
}

@keyframes daduShineSweep {
  0%, 50% {
    transform: translateX(-150%) rotate(25deg);
    opacity: 0;
  }
  55% {
    opacity: 1;
  }
  85% {
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

.dadu-cube-loading {
  animation: daduCubeLoadingFloat 2.8s ease-in-out infinite;
  transform-origin: center center;
  will-change: transform;
}

.dadu-shine-sweep {
  animation: daduShineSweep 4s cubic-bezier(0.4, 0, 0.2, 1) infinite;
  will-change: transform, opacity;
}

@media (prefers-reduced-motion: reduce) {
  .dadu-cube-animated,
  .dadu-cube-loading,
  .dadu-shine-sweep {
    animation: none !important;
    transform: none !important;
  }
}
`;

/**
 * AppLogo - Komponen Resmi Logo DADU (Digitalisasi Data Guru)
 *
 * Sistem Animasi Terintegrasi:
 * - Default: 3D Isometric Levitation Float + Exploded Facet Hover via DaduIsometricCube
 * - Drop: Dice Drop & Settle entrance motion (LoginPage Hero)
 * - Loading: Auto Explode & Construct rhythmic facet cycle (LoadingScreen)
 * - Reduced-Motion Aware & WCAG 2.2 Level AA Compliant
 */
export const AppLogo: React.FC<AppLogoProps> = ({
  size = 'md',
  variant,
  animated = true,
  animationMode = 'default',
  className = '',
  textClassName = '',
  subtitle = 'Digitalisasi Data Guru',
  onClick,
  showText,
  collapsed = false,
  id = 'dadu-app-logo',
  alt = 'Logo Resmi DADU',
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const shouldReduceMotion = useReducedMotion();
  const isInteractive = Boolean(onClick);

  // Compute numeric dimensions
  const pixelSize = typeof size === 'number'
    ? size
    : SIZE_MAP[size] || 36;

  // Determine effective variant
  const effectiveVariant: AppLogoVariant = variant
    ? variant
    : (showText === false || collapsed)
      ? 'mark'
      : (showText || subtitle)
        ? 'full'
        : 'mark';

  const effectiveMode: AppLogoAnimationMode = !animated || shouldReduceMotion
    ? 'none'
    : animationMode;

  // Entrance motion configuration based on mode
  const getEntranceAnimation = () => {
    if (effectiveMode === 'none') return {};

    if (effectiveMode === 'drop') {
      return {
        initial: { opacity: 0, y: -45, scale: 0.55, rotate: -25 },
        animate: { opacity: 1, y: 0, scale: 1, rotate: 0 },
        transition: {
          type: 'spring' as const,
          stiffness: 280,
          damping: 18,
          mass: 0.9,
        },
      };
    }

    return {
      initial: { opacity: 0, y: 6, scale: 0.94 },
      animate: { opacity: 1, y: 0, scale: 1 },
      transition: {
        duration: 0.5,
        ease: [0.16, 1, 0.3, 1] as const,
      },
    };
  };

  // Micro-interaction hover & click
  const hoverAnimation = effectiveMode !== 'none' ? {
    whileHover: {
      scale: 1.05,
      y: -1.5,
      transition: { duration: 0.22, ease: [0.16, 1, 0.3, 1] as const },
    },
    whileTap: isInteractive ? {
      scale: 0.94,
      rotate: 8,
      transition: { type: 'spring' as const, stiffness: 450, damping: 15 },
    } : undefined,
  } : {};

  const getContainerAnimationClass = () => {
    if (effectiveMode === 'loading') return 'dadu-cube-loading';
    if (effectiveMode !== 'none') return 'dadu-cube-animated';
    return '';
  };

  const imageElement = (
    <motion.div
      className="relative shrink-0 flex items-center justify-center select-none"
      style={{ width: pixelSize, height: pixelSize }}
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
      {...hoverAnimation}
    >
      <div
        className={`relative w-full h-full flex items-center justify-center ${getContainerAnimationClass()}`}
        role={effectiveMode === 'none' ? undefined : 'img'}
        aria-label={effectiveMode === 'none' ? undefined : alt}
      >
        {effectiveMode === 'none' ? (
          <img
            src={logoSvg}
            alt={alt}
            width={pixelSize}
            height={pixelSize}
            loading="eager"
            decoding="async"
            draggable={false}
            className="w-full h-full object-contain filter drop-shadow-[0_2px_8px_rgba(80,72,164,0.25)] pointer-events-none"
          />
        ) : (
          <div className="relative w-full h-full flex items-center justify-center filter drop-shadow-[0_2px_8px_rgba(80,72,164,0.25)] group-hover:drop-shadow-[0_4px_16px_rgba(139,209,220,0.40)] transition-all duration-300">
            <DaduIsometricCube
              size={pixelSize}
              mode={effectiveMode}
              isHovered={isHovered}
            />

            {pixelSize >= 32 && (
              <div
                className="absolute inset-0 pointer-events-none overflow-hidden select-none"
                style={{
                  maskImage: `url("${logoSvg}")`,
                  WebkitMaskImage: `url("${logoSvg}")`,
                  maskMode: 'alpha',
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
        )}
      </div>
    </motion.div>
  );

  if (effectiveVariant === 'mark') {
    return (
      <MotionConfig reducedMotion="user">
        <motion.div
          id={id}
          className={`inline-flex items-center justify-center ${isInteractive ? 'cursor-pointer' : ''} ${className}`}
          onClick={onClick}
          {...getEntranceAnimation()}
        >
          {imageElement}
          <style>{LOGO_ANIMATION_STYLES}</style>
        </motion.div>
      </MotionConfig>
    );
  }

  return (
    <MotionConfig reducedMotion="user">
      <motion.div
        id={id}
        className={`inline-flex items-center gap-2.5 min-w-0 ${isInteractive ? 'cursor-pointer group' : ''} ${className}`}
        onClick={onClick}
        {...getEntranceAnimation()}
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
