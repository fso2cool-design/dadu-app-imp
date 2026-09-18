import React from 'react';

export type LogoSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | number | string;

export interface LogoProps extends Omit<React.SVGProps<SVGSVGElement>, 'size'> {
  size?: LogoSize;
  showText?: boolean;
  animated?: boolean;
  className?: string;
  textClassName?: string;
  subtitle?: string;
}

/**
 * Logo Resmi DADU (Digitalisasi Data Guru)
 * Berdasarkan desain visual prisma isometrik dengan jaringan data dan simpul lingkaran:
 * - Prisma luar solid gelap (ungu tua ke navy)
 * - Inti kubus dalam dengan pendaran gradien magenta/pink
 * - Jaringan garis data putih presisi
 * - Simpul putih di pusat (central hub) & bidang permukaan
 * - Simpul lingkaran ungu/magenta di sudut-sudut luar
 * - Dilengkapi animasi CSS (pulse nodes, ambient core glow, dan hover interaction)
 */
export const Logo: React.FC<LogoProps> = ({
  size = 'md',
  showText = false,
  animated = true,
  className = '',
  textClassName = '',
  subtitle = 'Digitalisasi Data Guru',
  ...props
}) => {
  const sizeMap: Record<string, number> = {
    xs: 20,
    sm: 28,
    md: 36,
    lg: 48,
    xl: 64,
  };

  const numericSize = typeof size === 'number' 
    ? size 
    : (typeof size === 'string' && sizeMap[size]) 
      ? sizeMap[size] 
      : (parseInt(String(size), 10) || 36);

  const iconSvg = (
    <svg
      viewBox="0 0 120 120"
      width={numericSize}
      height={numericSize}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`shrink-0 transition-transform duration-300 hover:scale-105 select-none ${className}`}
      {...props}
    >
      <defs>
        {/* Glow Filters */}
        <filter id="daduCenterGlow" x="-60%" y="-60%" width="220%" height="220%">
          <feGaussianBlur stdDeviation="2.5" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>

        <filter id="daduNodeGlow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="2" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>

        <filter id="daduCoreAmbient" x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur stdDeviation="4" result="ambientGlow" />
          <feMerge>
            <feMergeNode in="ambientGlow" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>

        {/* 1. Prisma Luar Solid: Facet Gradients (Dark Purple to Navy/Deep Violet) */}
        {/* Top Facet */}
        <linearGradient id="facetTopGrad" x1="50%" y1="0%" x2="50%" y2="100%">
          <stop offset="0%" stopColor="#831843" />
          <stop offset="30%" stopColor="#701A75" />
          <stop offset="100%" stopColor="#4A044E" />
        </linearGradient>

        {/* Left Facet */}
        <linearGradient id="facetLeftGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#3B0764" />
          <stop offset="60%" stopColor="#2E1065" />
          <stop offset="100%" stopColor="#17072B" />
        </linearGradient>

        {/* Right Facet */}
        <linearGradient id="facetRightGrad" x1="100%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#581C87" />
          <stop offset="60%" stopColor="#311042" />
          <stop offset="100%" stopColor="#150524" />
        </linearGradient>

        {/* Bottom Tip Shadow Gradient */}
        <linearGradient id="facetBottomTip" x1="50%" y1="0%" x2="50%" y2="100%">
          <stop offset="0%" stopColor="#3B0764" stopOpacity="0" />
          <stop offset="100%" stopColor="#0B0314" stopOpacity="0.8" />
        </linearGradient>

        {/* 2. Inti Kubus Kristal Dalam: Translucent Neon Magenta/Pink */}
        <linearGradient id="innerCubeTop" x1="0%" y1="100%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#C026D3" stopOpacity="0.85" />
          <stop offset="50%" stopColor="#E879F9" stopOpacity="0.9" />
          <stop offset="100%" stopColor="#F472B6" stopOpacity="0.95" />
        </linearGradient>

        <linearGradient id="innerCubeLeft" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#86198F" stopOpacity="0.75" />
          <stop offset="100%" stopColor="#4A044E" stopOpacity="0.85" />
        </linearGradient>

        <linearGradient id="innerCubeRight" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#A21CAF" stopOpacity="0.8" />
          <stop offset="100%" stopColor="#581C87" stopOpacity="0.7" />
        </linearGradient>

        {/* 3. Outer Corner Nodes Gradients (Purple to Magenta) */}
        <radialGradient id="outerNodeTop" cx="35%" cy="35%" r="65%">
          <stop offset="0%" stopColor="#F472B6" />
          <stop offset="50%" stopColor="#DB2777" />
          <stop offset="100%" stopColor="#831843" />
        </radialGradient>

        <radialGradient id="outerNodeMid" cx="35%" cy="35%" r="65%">
          <stop offset="0%" stopColor="#E879F9" />
          <stop offset="55%" stopColor="#A21CAF" />
          <stop offset="100%" stopColor="#581C87" />
        </radialGradient>

        <radialGradient id="outerNodeBottom" cx="35%" cy="35%" r="65%">
          <stop offset="0%" stopColor="#A855F7" />
          <stop offset="60%" stopColor="#6B21A8" />
          <stop offset="100%" stopColor="#2E1065" />
        </radialGradient>

        {/* CSS Keyframe Animation Rules */}
        {animated && (
          <style>{`
            @keyframes daduPulseHeartbeat {
              0%, 100% { transform: scale(1); opacity: 1; }
              50% { transform: scale(1.18); opacity: 0.88; filter: drop-shadow(0 0 6px rgba(255,255,255,0.9)); }
            }
            @keyframes daduSubNodePulse {
              0%, 100% { transform: scale(1); opacity: 0.95; }
              50% { transform: scale(1.12); opacity: 1; }
            }
            @keyframes daduCoreBreath {
              0%, 100% { opacity: 0.85; }
              50% { opacity: 1; filter: drop-shadow(0 0 8px rgba(244,114,182,0.6)); }
            }
            @keyframes daduOuterRhythm {
              0%, 100% { opacity: 0.9; }
              50% { opacity: 1; filter: drop-shadow(0 0 4px rgba(217,70,239,0.7)); }
            }
            .dadu-center-node {
              transform-origin: 60px 60px;
              animation: daduPulseHeartbeat 2.8s ease-in-out infinite;
            }
            .dadu-sub-node-top {
              transform-origin: 60px 33px;
              animation: daduSubNodePulse 2.8s ease-in-out infinite 0.4s;
            }
            .dadu-sub-node-left {
              transform-origin: 36px 74px;
              animation: daduSubNodePulse 2.8s ease-in-out infinite 0.8s;
            }
            .dadu-sub-node-right {
              transform-origin: 84px 74px;
              animation: daduSubNodePulse 2.8s ease-in-out infinite 1.2s;
            }
            .dadu-inner-core {
              animation: daduCoreBreath 3.6s ease-in-out infinite;
            }
            .dadu-outer-nodes {
              animation: daduOuterRhythm 3.2s ease-in-out infinite;
            }
          `}</style>
        )}
      </defs>

      {/* ========================================================= */}
      {/* 1. PRISMA SOLID LUAR (Dark Purple/Violet 3D Isometric Body) */}
      {/* Outer Hexagon Vertices:
          Top: (60, 18)
          Top-Right: (96, 38)
          Bottom-Right: (96, 80)
          Bottom: (60, 100)
          Bottom-Left: (24, 80)
          Top-Left: (24, 38)
          Center: (60, 60)
      */}
      {/* ========================================================= */}
      <g>
        {/* Top Facet: (60,18) -> (96,38) -> (60,60) -> (24,38) */}
        <polygon 
          points="60,18 96,38 60,60 24,38" 
          fill="url(#facetTopGrad)" 
        />

        {/* Left Facet: (24,38) -> (60,60) -> (60,100) -> (24,80) */}
        <polygon 
          points="24,38 60,60 60,100 24,80" 
          fill="url(#facetLeftGrad)" 
        />

        {/* Right Facet: (60,60) -> (96,38) -> (96,80) -> (60,100) */}
        <polygon 
          points="60,60 96,38 96,80 60,100" 
          fill="url(#facetRightGrad)" 
        />

        {/* Bottom Tip Shadow / Contrast */}
        <polygon 
          points="24,80 60,100 96,80 60,60" 
          fill="url(#facetBottomTip)" 
        />
      </g>

      {/* ========================================================= */}
      {/* 2. INTI KUBUS KRISTAL (Glowing Translucent Inner Cube)   */}
      {/* Scaled & centered around (60,60):
          Top face: (60, 48) -> (72, 55) -> (60, 62) -> (48, 55)
          Left face: (48, 55) -> (60, 62) -> (60, 77) -> (48, 70)
          Right face: (60, 62) -> (72, 55) -> (72, 70) -> (60, 77)
      */}
      {/* ========================================================= */}
      <g className={animated ? 'dadu-inner-core' : ''} filter="url(#daduCoreAmbient)">
        {/* Top Face */}
        <polygon 
          points="60,48 73,55.5 60,63 47,55.5" 
          fill="url(#innerCubeTop)" 
          stroke="#F472B6" 
          strokeWidth="0.75"
          strokeOpacity="0.8"
        />

        {/* Left Face */}
        <polygon 
          points="47,55.5 60,63 60,78 47,70.5" 
          fill="url(#innerCubeLeft)" 
          stroke="#A855F7" 
          strokeWidth="0.75"
          strokeOpacity="0.7"
        />

        {/* Right Face */}
        <polygon 
          points="60,63 73,55.5 73,70.5 60,78" 
          fill="url(#innerCubeRight)" 
          stroke="#EC4899" 
          strokeWidth="0.75"
          strokeOpacity="0.75"
        />
      </g>

      {/* ========================================================= */}
      {/* 3. JARINGAN GARIS DATA PUTIH (Data Network Lines)        */}
      {/* Menghubungkan simpul pusat ke sudut-sudut & sub-simpul  */}
      {/* ========================================================= */}
      <g stroke="#FFFFFF" strokeLinecap="round" strokeLinejoin="round">
        {/* Garis sumbu utama dari pusat (60,60) ke sudut luar */}
        <line x1="60" y1="60" x2="60" y2="18" strokeWidth="2.2" strokeOpacity="0.95" />
        <line x1="60" y1="60" x2="24" y2="80" strokeWidth="2.2" strokeOpacity="0.95" />
        <line x1="60" y1="60" x2="96" y2="80" strokeWidth="2.2" strokeOpacity="0.95" />

        {/* Garis batas heksagon luar */}
        <path 
          d="M 60 18 L 96 38 L 96 80 L 60 100 L 24 80 L 24 38 Z" 
          strokeWidth="2.2" 
          strokeOpacity="0.95" 
        />

        {/* Garis jaringan facet atas (menghubungkan simpul bidang atas ke sudut) */}
        <line x1="60" y1="33" x2="24" y2="38" strokeWidth="1.8" strokeOpacity="0.85" />
        <line x1="60" y1="33" x2="96" y2="38" strokeWidth="1.8" strokeOpacity="0.85" />

        {/* Garis jaringan facet kiri (menghubungkan simpul bidang kiri ke sudut) */}
        <line x1="36" y1="74" x2="24" y2="38" strokeWidth="1.8" strokeOpacity="0.85" />
        <line x1="36" y1="74" x2="60" y2="100" strokeWidth="1.8" strokeOpacity="0.85" />

        {/* Garis jaringan facet kanan (menghubungkan simpul bidang kanan ke sudut) */}
        <line x1="84" y1="74" x2="96" y2="38" strokeWidth="1.8" strokeOpacity="0.85" />
        <line x1="84" y1="74" x2="60" y2="100" strokeWidth="1.8" strokeOpacity="0.85" />

        {/* Garis diagonal dalam penyeimbang struktur kristal */}
        <line x1="24" y1="38" x2="60" y2="18" strokeWidth="1.2" strokeOpacity="0.4" />
        <line x1="96" y1="38" x2="60" y2="18" strokeWidth="1.2" strokeOpacity="0.4" />
      </g>

      {/* ========================================================= */}
      {/* 4. SIMPUL LUAR (Outer Spherical Nodes pada 6 Sudut)      */}
      {/* ========================================================= */}
      <g className={animated ? 'dadu-outer-nodes' : ''}>
        {/* Top (60,18) */}
        <circle cx="60" cy="18" r="5.5" fill="url(#outerNodeTop)" filter="url(#daduNodeGlow)" />
        <circle cx="60" cy="18" r="2.2" fill="#FFFFFF" opacity="0.85" />

        {/* Top-Right (96,38) */}
        <circle cx="96" cy="38" r="5.5" fill="url(#outerNodeTop)" filter="url(#daduNodeGlow)" />
        <circle cx="96" cy="38" r="2.2" fill="#FFFFFF" opacity="0.85" />

        {/* Bottom-Right (96,80) */}
        <circle cx="96" cy="80" r="5.5" fill="url(#outerNodeMid)" filter="url(#daduNodeGlow)" />
        <circle cx="96" cy="80" r="2.2" fill="#FFFFFF" opacity="0.85" />

        {/* Bottom (60,100) */}
        <circle cx="60" cy="100" r="6" fill="url(#outerNodeBottom)" filter="url(#daduNodeGlow)" />
        <circle cx="60" cy="100" r="2.4" fill="#FFFFFF" opacity="0.85" />

        {/* Bottom-Left (24,80) */}
        <circle cx="24" cy="80" r="5.5" fill="url(#outerNodeBottom)" filter="url(#daduNodeGlow)" />
        <circle cx="24" cy="80" r="2.2" fill="#FFFFFF" opacity="0.85" />

        {/* Top-Left (24,38) */}
        <circle cx="24" cy="38" r="5.5" fill="url(#outerNodeMid)" filter="url(#daduNodeGlow)" />
        <circle cx="24" cy="38" r="2.2" fill="#FFFFFF" opacity="0.85" />
      </g>

      {/* ========================================================= */}
      {/* 5. SIMPUL DATA PUTIH (White Internal Data Nodes)          */}
      {/* - 1 Simpul Hub Tengah Utama di (60, 60)                   */}
      {/* - 3 Simpul Pembagi di bidang permukaan (Atas, Kiri, Kanan) */}
      {/* ========================================================= */}
      {/* Simpul Bidang Atas (60, 33) */}
      <g className={animated ? 'dadu-sub-node-top' : ''}>
        <circle cx="60" cy="33" r="4.5" fill="#FFFFFF" filter="url(#daduNodeGlow)" />
        <circle cx="60" cy="33" r="2" fill="#FDF4FF" />
      </g>

      {/* Simpul Bidang Kiri (36, 74) */}
      <g className={animated ? 'dadu-sub-node-left' : ''}>
        <circle cx="36" cy="74" r="4.5" fill="#FFFFFF" filter="url(#daduNodeGlow)" />
        <circle cx="36" cy="74" r="2" fill="#FDF4FF" />
      </g>

      {/* Simpul Bidang Kanan (84, 74) */}
      <g className={animated ? 'dadu-sub-node-right' : ''}>
        <circle cx="84" cy="74" r="4.5" fill="#FFFFFF" filter="url(#daduNodeGlow)" />
        <circle cx="84" cy="74" r="2" fill="#FDF4FF" />
      </g>

      {/* Simpul Pusat Utama (Central Data Hub) di (60, 60) */}
      <g className={animated ? 'dadu-center-node' : ''}>
        <circle cx="60" cy="60" r="5.8" fill="#FFFFFF" filter="url(#daduCenterGlow)" />
        <circle cx="60" cy="60" r="3" fill="#FAF5FF" />
      </g>
    </svg>
  );

  if (!showText) {
    return iconSvg;
  }

  return (
    <div className={`inline-flex items-center gap-2.5 ${textClassName}`}>
      {iconSvg}
      <div className="flex flex-col text-left min-w-0 leading-none select-none">
        <span className="font-extrabold text-slate-900 dark:text-white text-base sm:text-lg tracking-tight truncate flex items-center gap-1.5">
          <span>Dadu</span>
        </span>
        {subtitle && (
          <span className="text-[10px] sm:text-[11px] font-medium text-slate-500 dark:text-slate-400 tracking-tight truncate mt-1">
            {subtitle}
          </span>
        )}
      </div>
    </div>
  );
};

export default Logo;
