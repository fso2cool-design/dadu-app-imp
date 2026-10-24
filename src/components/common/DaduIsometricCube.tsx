import React from 'react';

export type CubeAnimationMode = 'default' | 'drop' | 'loading' | 'none';

export interface DaduIsometricCubeProps {
  size?: number;
  mode?: CubeAnimationMode;
  isHovered?: boolean;
  className?: string;
}

/**
 * DaduIsometricCube - Vektor SVG Faset Logo DADU
 * Menggunakan arsitektur kelas CSS murni 1:1 identik dengan logo_animation_preview.html:
 * - .facet-item + hover (.group:hover / .exploded)
 * - .load-facet-* (Auto Explode & Construct pada Loading Screen)
 */
export const DaduIsometricCube: React.FC<DaduIsometricCubeProps> = ({
  size = 36,
  mode = 'default',
  isHovered = false,
  className = '',
}) => {
  const isLoading = mode === 'loading';
  const isExploded = isHovered && mode !== 'loading' && mode !== 'none';

  return (
    <div
      className={`relative inline-flex items-center justify-center select-none ${isExploded ? 'exploded' : ''} ${className}`}
      style={{ width: size, height: size }}
      aria-hidden="true"
    >
      <svg
        viewBox="0 0 512 512"
        fill="none"
        width="100%"
        height="100%"
        shapeRendering="geometricPrecision"
        className="w-full h-full overflow-visible"
      >
        <g
          id="dadu-floating-cube"
          transform="translate(256, 252) scale(1.16) translate(-315.5, -271.5)"
        >
          {/* 1. Left top outer facet (Purple) */}
          <polygon
            className={`facet-item facet-left-top ${isLoading ? 'load-facet-purple' : ''}`}
            points="140,157 271,81 271,235 140,310"
            fill="#5048a4"
          />

          {/* 2. Right top outer facet (Yellow) */}
          <polygon
            className={`facet-item facet-right-top ${isLoading ? 'load-facet-yellow' : ''}`}
            points="359,81 491,157 491,310 359,235"
            fill="#ffe000"
          />

          {/* 3. Bottom front facet (Peach) */}
          <polygon
            className={`facet-item facet-bottom ${isLoading ? 'load-facet-peach' : ''}`}
            points="185,386 315,310 446,386 315,462"
            fill="#f49a5c"
          />

          {/* 4. Top inner facet / cap (Cyan) */}
          <polygon
            className={`facet-item facet-top ${isLoading ? 'load-facet-top' : ''}`}
            points="184,181 315,106 446,181 315,258"
            fill="#8bd1dc"
            opacity="0.94"
          />

          {/* 5. Left lower face (Amethyst) + Shading Overlay */}
          <g className={`facet-item facet-left-lower ${isLoading ? 'load-facet-amethyst' : ''}`}>
            <polygon points="162,196 294,272 294,423 162,347" fill="#784d92" />
            <polygon
              points="162,196 294,272 294,423 162,347"
              fill="#5e2180"
              opacity="0.3"
            />
          </g>

          {/* 6. Right lower face (Ruby) + Shading Overlay */}
          <g className={`facet-item facet-right-lower ${isLoading ? 'load-facet-ruby' : ''}`}>
            <polygon points="337,272 469,196 469,347 337,423" fill="#d33248" />
            <polygon
              points="337,272 469,196 469,347 337,423"
              fill="#bf1f32"
              opacity="0.26"
            />
          </g>
        </g>
      </svg>
    </div>
  );
};
