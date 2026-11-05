import React from 'react';

export interface IghoLoadingEmblemProps {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  inverted?: boolean; // If true, base is white with black letters, inverting to black patches with white letters
  speed?: 'normal' | 'fast' | 'slow';
}

/**
 * IGHO Signature Dynamic Loading Emblem
 * Features an orbital contrast inversion wave where the letters and quadrants
 * of the IGHO emblem invert colors sequentially (I -> G -> O -> H),
 * making the colors appear to move dynamically around the logo.
 */
export const IghoLoadingEmblem: React.FC<IghoLoadingEmblemProps> = ({
  size = 'md',
  className = '',
  inverted = false,
  speed = 'normal',
}) => {
  const sizeMap = {
    xs: 'w-4 h-4',
    sm: 'w-5 h-5',
    md: 'w-8 h-8',
    lg: 'w-16 h-16',
    xl: 'w-24 h-24',
  };

  const duration = speed === 'fast' ? '1.0s' : speed === 'slow' ? '1.8s' : '1.35s';
  const dim = sizeMap[size] || sizeMap.md;

  // Color mapping based on whether the emblem is base-dark or base-light
  const baseBg = inverted ? '#ffffff' : '#000000';
  const patchColor = inverted ? '#000000' : '#ffffff';
  const baseFg = inverted ? '#000000' : '#ffffff';
  const invertedFg = inverted ? '#ffffff' : '#000000';

  const uid = React.useId().replace(/:/g, '');

  return (
    <svg
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`${dim} ${className} shrink-0 select-none`}
      role="status"
      aria-label="Loading"
    >
      <defs>
        <style>{`
          @keyframes igho-patch-${uid} {
            0% {
              opacity: 0;
              transform: scale(0.96);
            }
            12%, 30% {
              opacity: 1;
              transform: scale(1);
            }
            42%, 100% {
              opacity: 0;
              transform: scale(0.96);
            }
          }

          @keyframes igho-glyph-fill-${uid} {
            0% {
              fill: ${baseFg};
            }
            12%, 30% {
              fill: ${invertedFg};
            }
            42%, 100% {
              fill: ${baseFg};
            }
          }

          @keyframes igho-glyph-stroke-${uid} {
            0% {
              stroke: ${baseFg};
            }
            12%, 30% {
              stroke: ${invertedFg};
            }
            42%, 100% {
              stroke: ${baseFg};
            }
          }

          .igho-p1-${uid} {
            transform-origin: 27.5px 27.5px;
            animation: igho-patch-${uid} ${duration} cubic-bezier(0.4, 0, 0.2, 1) infinite 0s;
          }
          .igho-g1-${uid} {
            animation: igho-glyph-stroke-${uid} ${duration} cubic-bezier(0.4, 0, 0.2, 1) infinite 0s;
          }

          .igho-p2-${uid} {
            transform-origin: 72.5px 27.5px;
            animation: igho-patch-${uid} ${duration} cubic-bezier(0.4, 0, 0.2, 1) infinite calc(${duration} * 0.25);
          }
          .igho-g2-${uid} {
            animation: igho-glyph-fill-${uid} ${duration} cubic-bezier(0.4, 0, 0.2, 1) infinite calc(${duration} * 0.25);
          }

          .igho-p3-${uid} {
            transform-origin: 72.5px 72.5px;
            animation: igho-patch-${uid} ${duration} cubic-bezier(0.4, 0, 0.2, 1) infinite calc(${duration} * 0.50);
          }
          .igho-g3-${uid} {
            animation: igho-glyph-stroke-${uid} ${duration} cubic-bezier(0.4, 0, 0.2, 1) infinite calc(${duration} * 0.50);
          }

          .igho-p4-${uid} {
            transform-origin: 27.5px 72.5px;
            animation: igho-patch-${uid} ${duration} cubic-bezier(0.4, 0, 0.2, 1) infinite calc(${duration} * 0.75);
          }
          .igho-g4-${uid} {
            animation: igho-glyph-fill-${uid} ${duration} cubic-bezier(0.4, 0, 0.2, 1) infinite calc(${duration} * 0.75);
          }
        `}</style>
      </defs>

      {/* Main Outer Emblem Badge */}
      <rect width="100" height="100" rx="18" fill={baseBg} />

      {/* QUADRANT 1: "I" (Top-Left) */}
      <g>
        <rect
          x="7"
          y="7"
          width="41"
          height="41"
          rx="12"
          fill={patchColor}
          className={`igho-p1-${uid}`}
        />
        <path
          d="M16 18H28V12H44V46H34V22H24V28H16V18Z"
          stroke={baseFg}
          strokeWidth="2.4"
          strokeLinejoin="miter"
          fill="none"
          className={`igho-g1-${uid}`}
        />
      </g>

      {/* QUADRANT 2: "G" (Top-Right) */}
      <g>
        <rect
          x="52"
          y="7"
          width="41"
          height="41"
          rx="12"
          fill={patchColor}
          className={`igho-p2-${uid}`}
        />
        <path
          d="M54 12H86V24H66V34H76V30H86V46H54V12Z"
          fill={baseFg}
          className={`igho-g2-${uid}`}
        />
      </g>

      {/* QUADRANT 3: "O" (Bottom-Right - following clockwise flow I -> G -> O -> H) */}
      <g>
        <rect
          x="52"
          y="52"
          width="41"
          height="41"
          rx="12"
          fill={patchColor}
          className={`igho-p3-${uid}`}
        />
        <rect
          x="54"
          y="54"
          width="32"
          height="34"
          stroke={baseFg}
          strokeWidth="2.4"
          fill="none"
          className={`igho-g3-${uid}`}
        />
        <rect
          x="63"
          y="62"
          width="14"
          height="18"
          stroke={baseFg}
          strokeWidth="2.4"
          fill="none"
          className={`igho-g3-${uid}`}
        />
      </g>

      {/* QUADRANT 4: "H" (Bottom-Left) */}
      <g>
        <rect
          x="7"
          y="52"
          width="41"
          height="41"
          rx="12"
          fill={patchColor}
          className={`igho-p4-${uid}`}
        />
        <path
          d="M16 54H28V67H36V54H48V88H36V77H28V88H16V54Z"
          fill={baseFg}
          className={`igho-g4-${uid}`}
        />
      </g>
    </svg>
  );
};

export interface IghoLoadingSpinnerProps {
  size?: 'xs' | 'sm' | 'md' | 'lg';
  className?: string;
  inverted?: boolean;
  label?: string;
}

/**
 * Compact Inline Loader with Animated Emblem & optional label
 */
export const IghoLoadingSpinner: React.FC<IghoLoadingSpinnerProps> = ({
  size = 'sm',
  className = '',
  inverted = false,
  label,
}) => {
  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <IghoLoadingEmblem size={size} inverted={inverted} />
      {label && <span className="text-xs font-semibold">{label}</span>}
    </span>
  );
};
