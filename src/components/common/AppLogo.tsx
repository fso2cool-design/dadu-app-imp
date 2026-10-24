import React, { useState } from 'react';
import logoSvg from '../../assets/logo.svg';
import { DaduIsometricCube } from './DaduIsometricCube';
import { useOptionalAppearance } from '../../context/AppearanceContext';

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
@keyframes daduFloat {
  0%, 100% {
    transform: translateY(0px) rotate(0deg) scale(1);
  }
  50% {
    transform: translateY(-4px) rotate(1.2deg) scale(1.02);
  }
}

@keyframes dropBounce {
  0% {
    opacity: 0;
    transform: translateY(-60px) rotate(-28deg) scale(0.45);
  }
  55% {
    opacity: 1;
    transform: translateY(6px) rotate(3deg) scale(1.06);
  }
  75% {
    transform: translateY(-4px) rotate(-1.5deg) scale(0.97);
  }
  90% {
    transform: translateY(1.5px) rotate(0.5deg) scale(1.01);
  }
  100% {
    opacity: 1;
    transform: translateY(0px) rotate(0deg) scale(1);
  }
}

@keyframes loadingAutoExplodeTop {
  0%, 15% { transform: translate(0, 0); }
  45% { transform: translate(0, -28px); filter: drop-shadow(0 0 6px rgba(139,209,220,0.7)); }
  65% { transform: translate(0, -30px); filter: drop-shadow(0 0 8px rgba(139,209,220,0.85)); }
  85%, 100% { transform: translate(0, 0); filter: none; }
}

@keyframes loadingAutoExplodePurple {
  0%, 15% { transform: translate(0, 0); }
  45% { transform: translate(-24px, -13px); }
  65% { transform: translate(-25px, -14px); }
  85%, 100% { transform: translate(0, 0); }
}

@keyframes loadingAutoExplodeYellow {
  0%, 15% { transform: translate(0, 0); }
  45% { transform: translate(24px, -13px); }
  65% { transform: translate(25px, -14px); }
  85%, 100% { transform: translate(0, 0); }
}

@keyframes loadingAutoExplodePeach {
  0%, 15% { transform: translate(0, 0); }
  45% { transform: translate(0, 28px); }
  65% { transform: translate(0, 30px); }
  85%, 100% { transform: translate(0, 0); }
}

@keyframes loadingAutoExplodeAmethyst {
  0%, 15% { transform: translate(0, 0); }
  45% { transform: translate(-20px, 16px); }
  65% { transform: translate(-21px, 17px); }
  85%, 100% { transform: translate(0, 0); }
}

@keyframes loadingAutoExplodeRuby {
  0%, 15% { transform: translate(0, 0); }
  45% { transform: translate(20px, 16px); }
  65% { transform: translate(21px, 17px); }
  85%, 100% { transform: translate(0, 0); }
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

.anim-float {
  animation: daduFloat 4s ease-in-out infinite;
  transform-origin: center center;
  will-change: transform;
}

.anim-loading-float {
  animation: daduFloat 2.8s ease-in-out infinite;
  transform-origin: center center;
  will-change: transform;
}

.anim-drop {
  animation: dropBounce 0.75s cubic-bezier(0.16, 1, 0.3, 1) forwards;
  transform-origin: center center;
  will-change: transform, opacity;
}

.facet-item {
  transition: transform 0.35s cubic-bezier(0.16, 1, 0.3, 1);
}

.group:hover .facet-top,
.exploded .facet-top {
  transform: translateY(-22px);
}

.group:hover .facet-left-top,
.exploded .facet-left-top {
  transform: translate(-18px, -10px);
}

.group:hover .facet-right-top,
.exploded .facet-right-top {
  transform: translate(18px, -10px);
}

.group:hover .facet-bottom,
.exploded .facet-bottom {
  transform: translateY(22px);
}

.group:hover .facet-left-lower,
.exploded .facet-left-lower {
  transform: translate(-16px, 12px);
}

.group:hover .facet-right-lower,
.exploded .facet-right-lower {
  transform: translate(16px, 12px);
}

.load-facet-top { animation: loadingAutoExplodeTop 2.8s cubic-bezier(0.16, 1, 0.3, 1) infinite; }
.load-facet-purple { animation: loadingAutoExplodePurple 2.8s cubic-bezier(0.16, 1, 0.3, 1) infinite; }
.load-facet-yellow { animation: loadingAutoExplodeYellow 2.8s cubic-bezier(0.16, 1, 0.3, 1) infinite; }
.load-facet-peach { animation: loadingAutoExplodePeach 2.8s cubic-bezier(0.16, 1, 0.3, 1) infinite; }
.load-facet-amethyst { animation: loadingAutoExplodeAmethyst 2.8s cubic-bezier(0.16, 1, 0.3, 1) infinite; }
.load-facet-ruby { animation: loadingAutoExplodeRuby 2.8s cubic-bezier(0.16, 1, 0.3, 1) infinite; }

.dadu-shine-sweep {
  animation: daduShineSweep 4s cubic-bezier(0.4, 0, 0.2, 1) infinite;
  will-change: transform, opacity;
}
`;

/**
 * AppLogo - Komponen Resmi Logo DADU (Digitalisasi Data Guru)
 * Menggunakan arsitektur animasi 1:1 identik dengan logo_animation_preview.html:
 * - Default: .anim-float + hover .exploded / .group:hover (Sidebar & Header)
 * - Drop: .anim-drop (LoginPage)
 * - Loading: .anim-loading-float + .load-facet-* (LoadingScreen)
 * - None: Static <img> fallback saat animasi dimatikan di preferensi
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
  const isInteractive = Boolean(onClick);
  const appearance = useOptionalAppearance();
  const userAnimationsEnabled = appearance?.animationsEnabled ?? true;

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

  const effectiveMode: AppLogoAnimationMode = (!animated || !userAnimationsEnabled)
    ? 'none'
    : animationMode;

  const getContainerAnimationClass = () => {
    if (effectiveMode === 'drop') return 'anim-drop';
    if (effectiveMode === 'loading') return 'anim-loading-float';
    if (effectiveMode === 'default') return 'anim-float';
    return '';
  };

  const imageElement = (
    <div
      className="relative shrink-0 flex items-center justify-center select-none"
      style={{ width: pixelSize, height: pixelSize }}
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
    </div>
  );

  if (effectiveVariant === 'mark') {
    return (
      <div
        id={id}
        className={`inline-flex items-center justify-center group ${isInteractive ? 'cursor-pointer active:scale-95 transition-transform' : ''} ${className}`}
        onClick={onClick}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {imageElement}
        <style>{LOGO_ANIMATION_STYLES}</style>
      </div>
    );
  }

  return (
    <div
      id={id}
      className={`inline-flex items-center gap-2.5 min-w-0 group ${isInteractive ? 'cursor-pointer active:scale-98 transition-transform' : ''} ${className}`}
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
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
    </div>
  );
};

export default AppLogo;
