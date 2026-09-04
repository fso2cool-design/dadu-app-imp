import React from 'react';

interface DaduLogoProps {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  withGlow?: boolean;
}

export const DaduLogo: React.FC<DaduLogoProps> = ({ 
  size = 'md', 
  className = '',
  withGlow = true
}) => {
  const sizeMap = {
    xs: 'w-5 h-5',
    sm: 'w-7 h-7',
    md: 'w-9 h-9',
    lg: 'w-12 h-12',
    xl: 'w-16 h-16'
  };

  return (
    <div 
      className={`inline-flex items-center justify-center shrink-0 ${sizeMap[size]} ${className}`}
      style={{
        filter: withGlow 
          ? 'drop-shadow(0 0 12px rgba(245, 147, 37, 0.45)) drop-shadow(0 0 4px rgba(0, 166, 244, 0.35))' 
          : 'none'
      }}
    >
      <svg 
        viewBox="0 0 100 105" 
        fill="none" 
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full transform transition-transform hover:scale-105 duration-300 select-none"
      >
        <defs>
          {/* Gradients for rich 3D lighting depth */}
          
          {/* Top Red Cap Gradient */}
          <linearGradient id="topRedCapGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#FF4A5A" />
            <stop offset="100%" stopColor="#E22436" />
          </linearGradient>

          {/* Left Red Block Gradient */}
          <linearGradient id="leftRedGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#EB3949" />
            <stop offset="100%" stopColor="#C91B2D" />
          </linearGradient>

          {/* Right Sky Blue Block Gradient */}
          <linearGradient id="rightBlueGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#1CC1FF" />
            <stop offset="100%" stopColor="#008FE0" />
          </linearGradient>

          {/* Center Cube: Top Orange Diamond */}
          <linearGradient id="centerOrangeGrad" x1="0%" y1="100%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#E67D15" />
            <stop offset="60%" stopColor="#F59325" />
            <stop offset="100%" stopColor="#FFA642" />
          </linearGradient>

          {/* Center Cube: Right Yellow Face */}
          <linearGradient id="centerYellowGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#FFD338" />
            <stop offset="100%" stopColor="#F5AC08" />
          </linearGradient>

          {/* Bottom Green Block Gradient */}
          <linearGradient id="bottomGreenGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#53D263" />
            <stop offset="100%" stopColor="#35A344" />
          </linearGradient>

          {/* Floating Lower Left Green Tab */}
          <linearGradient id="tabGreenGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#43C754" />
            <stop offset="100%" stopColor="#2E993D" />
          </linearGradient>

          {/* Floating Lower Right Blue Tab */}
          <linearGradient id="tabBlueGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#14BAFC" />
            <stop offset="100%" stopColor="#007ECC" />
          </linearGradient>

          {/* Diagonal Angular Shimmer (Kilauan Halus) */}
          <linearGradient id="cubeSheen" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0" />
            <stop offset="38%" stopColor="#FFFFFF" stopOpacity="0" />
            <stop offset="48%" stopColor="#FFFFFF" stopOpacity="0.65" />
            <stop offset="52%" stopColor="#FFFFFF" stopOpacity="0.65" />
            <stop offset="62%" stopColor="#FFFFFF" stopOpacity="0" />
            <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
            
            <animateTransform
              attributeName="gradientTransform"
              type="translate"
              from="-1.3 -1.3"
              to="1.3 1.3"
              dur="3.5s"
              repeatCount="indefinite"
            />
          </linearGradient>
        </defs>

        {/* Ambient Ground Contact Shadow */}
        <ellipse cx="50" cy="98" rx="26" ry="4.5" fill="#000000" opacity="0.6" filter="blur(1.5px)" />

        {/* ======================================================== */}
        {/* === THE MODULAR COLOR CUBE (EXACT REFERENCE DESIGN) === */}
        {/* ======================================================== */}

        {/* 1. TOP RED CAP (Apex with rounded top crest) */}
        <path
          d="M 50 11.5 
             Q 59 14.5 60.5 21 
             L 50 26.5 
             L 39.5 21 
             Q 41 14.5 50 11.5 
             Z"
          fill="url(#topRedCapGrad)"
        />

        {/* 2. TOP-LEFT RED BLOCK (With smooth rounded upper-left corner) */}
        <path
          d="M 37.5 22.5 
             L 48 28 
             L 31 38 
             L 31 60 
             L 14 50.5 
             L 14 34 
             Q 14 26 22 21.5 
             L 34 14.5 
             L 37.5 22.5 
             Z"
          fill="url(#leftRedGrad)"
        />

        {/* 3. TOP-RIGHT SKY BLUE BLOCK (With smooth rounded upper-right corner) */}
        <path
          d="M 62.5 22.5 
             L 52 28 
             L 69 38 
             L 69 60 
             L 86 50.5 
             L 86 34 
             Q 86 26 78 21.5 
             L 66 14.5 
             L 62.5 22.5 
             Z"
          fill="url(#rightBlueGrad)"
        />

        {/* 4. CENTER CUBE - TOP DIAMOND FACE (Warm Amber / Orange) */}
        <path
          d="M 50 29 
             L 68 39.5 
             L 50 50 
             L 32 39.5 
             Z"
          fill="url(#centerOrangeGrad)"
        />

        {/* 5. CENTER CUBE - RIGHT FACE (Bright Golden Yellow) */}
        <path
          d="M 50 50 
             L 68 39.5 
             L 68 61 
             L 50 71.5 
             Z"
          fill="url(#centerYellowGrad)"
        />

        {/* 6. BOTTOM GREEN BLOCK (Main Bottom Cube Block with rounded bottom tip) */}
        <path
          d="M 32 61 
             L 50 50 
             L 50 71.5 
             L 68 61 
             L 68 77 
             L 54 85 
             Q 50 87.5 46 85 
             L 32 77 
             Z"
          fill="url(#bottomGreenGrad)"
        />

        {/* 7. FLOATING LOWER-LEFT GREEN TAB (Rounded bottom-left edge) */}
        <path
          d="M 14 59 
             L 24 59 
             L 24 71 
             L 23 72.5 
             Q 14 74 14 65.5 
             Z"
          fill="url(#tabGreenGrad)"
        />

        {/* 8. FLOATING LOWER-RIGHT SKY BLUE TAB (Rounded bottom-right edge) */}
        <path
          d="M 86 59 
             L 76 59 
             L 76 71 
             L 77 72.5 
             Q 86 74 86 65.5 
             Z"
          fill="url(#tabBlueGrad)"
        />

        {/* ======================================================== */}
        {/* === SHIMMER / LIGHT SHEEN OVERLAY (ANIMASI SAPUAN)    === */}
        {/* ======================================================== */}
        {/* Clip to cube bounds so the shimmer only sweeps across the logo segments */}
        <g style={{ mixBlendMode: 'screen', pointerEvents: 'none' }}>
          <path
            d="M 50 11.5 
               Q 59 14.5 60.5 21 L 50 26.5 L 39.5 21 Q 41 14.5 50 11.5 Z
               M 37.5 22.5 L 48 28 L 31 38 L 31 60 L 14 50.5 L 14 34 Q 14 26 22 21.5 L 34 14.5 Z
               M 62.5 22.5 L 52 28 L 69 38 L 69 60 L 86 50.5 L 86 34 Q 86 26 78 21.5 L 66 14.5 Z
               M 50 29 L 68 39.5 L 50 50 L 32 39.5 Z
               M 50 50 L 68 39.5 L 68 61 L 50 71.5 Z
               M 32 61 L 50 50 L 50 71.5 L 68 61 L 68 77 L 54 85 Q 50 87.5 46 85 L 32 77 Z
               M 14 59 L 24 59 L 24 71 L 23 72.5 Q 14 74 14 65.5 Z
               M 86 59 L 76 59 L 76 71 L 77 72.5 Q 86 74 86 65.5 Z"
            fill="url(#cubeSheen)"
          />
        </g>
      </svg>
    </div>
  );
};
