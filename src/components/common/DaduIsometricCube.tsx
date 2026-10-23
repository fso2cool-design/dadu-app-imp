import React from 'react';
import { motion, useReducedMotion, type Transition } from 'motion/react';

export type CubeAnimationMode = 'default' | 'drop' | 'loading' | 'none';

export interface DaduIsometricCubeProps {
  size?: number;
  mode?: CubeAnimationMode;
  isHovered?: boolean;
  className?: string;
}

const SPRING_TRANSITION: Transition = {
  type: 'spring',
  stiffness: 360,
  damping: 22,
  mass: 0.8,
};

export const DaduIsometricCube: React.FC<DaduIsometricCubeProps> = ({
  size = 36,
  mode = 'default',
  isHovered = false,
  className = '',
}) => {
  const shouldReduceMotion = useReducedMotion();
  const isAnimated = mode !== 'none' && !shouldReduceMotion;
  const isExploded = isAnimated && isHovered && mode !== 'loading';

  // Distance scalar for exploded view in local SVG units (viewBox 512x512)
  const offset = 22;

  // Keyframes for auto-explode & construct in loading mode
  const getFacetAnimation = (targetX: number, targetY: number, hasGlow = false) => {
    if (mode === 'loading' && !shouldReduceMotion) {
      return {
        animate: {
          x: [0, targetX * 1.25, targetX * 1.32, 0, 0],
          y: [0, targetY * 1.25, targetY * 1.32, 0, 0],
          opacity: hasGlow ? [0.94, 1, 1, 0.94, 0.94] : [0.95, 1, 1, 0.95, 0.95],
          scale: [1, 1.02, 1.03, 1, 1],
        },
        transition: {
          duration: 2.8,
          repeat: Infinity,
          times: [0, 0.4, 0.6, 0.85, 1],
          ease: 'easeInOut' as const,
        },
      };
    }

    // Default hover exploded micro-interaction
    return {
      animate: {
        x: isExploded ? targetX : 0,
        y: isExploded ? targetY : 0,
      },
      transition: SPRING_TRANSITION,
    };
  };

  return (
    <div
      className={`relative inline-flex items-center justify-center select-none ${className}`}
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
          <motion.g
            {...getFacetAnimation(-offset * 0.85, -offset * 0.45)}
          >
            <polygon points="140,157 271,81 271,235 140,310" fill="#5048a4" />
          </motion.g>

          {/* 2. Right top outer facet (Yellow) */}
          <motion.g
            {...getFacetAnimation(offset * 0.85, -offset * 0.45)}
          >
            <polygon points="359,81 491,157 491,310 359,235" fill="#ffe000" />
          </motion.g>

          {/* 3. Bottom front facet (Peach) */}
          <motion.g
            {...getFacetAnimation(0, offset)}
          >
            <polygon points="185,386 315,310 446,386 315,462" fill="#f49a5c" />
          </motion.g>

          {/* 4. Top inner facet / cap (Cyan) with gentle glow at peak */}
          <motion.g
            {...getFacetAnimation(0, -offset, true)}
          >
            <polygon
              points="184,181 315,106 446,181 315,258"
              fill="#8bd1dc"
              opacity="0.94"
            />
          </motion.g>

          {/* 5. Left lower face (Amethyst) + Shading Overlay */}
          <motion.g
            {...getFacetAnimation(-offset * 0.75, offset * 0.55)}
          >
            <polygon points="162,196 294,272 294,423 162,347" fill="#784d92" />
            <polygon
              points="162,196 294,272 294,423 162,347"
              fill="#5e2180"
              opacity="0.3"
            />
          </motion.g>

          {/* 6. Right lower face (Ruby) + Shading Overlay */}
          <motion.g
            {...getFacetAnimation(offset * 0.75, offset * 0.55)}
          >
            <polygon points="337,272 469,196 469,347 337,423" fill="#d33248" />
            <polygon
              points="337,272 469,196 469,347 337,423"
              fill="#bf1f32"
              opacity="0.26"
            />
          </motion.g>
        </g>
      </svg>
    </div>
  );
};
