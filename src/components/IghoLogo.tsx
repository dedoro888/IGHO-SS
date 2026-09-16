import React from 'react';

interface IghoLogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  variant?: 'light' | 'dark' | 'white';
  showSubtitle?: boolean;
  className?: string;
}

export const IghoOfficialEmblem: React.FC<{ className?: string; inverted?: boolean }> = ({
  className = 'w-8 h-8',
  inverted = false,
}) => {
  const bgFill = inverted ? '#ffffff' : '#000000';
  const fgStroke = inverted ? '#000000' : '#ffffff';
  const fgFill = inverted ? '#000000' : '#ffffff';

  return (
    <svg
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`${className} shrink-0`}
    >
      {/* Background Badge */}
      <rect width="100" height="100" rx="18" fill={bgFill} />

      {/* TOP-LEFT: Stylized "1" / "I" with outline and top-left hook */}
      <path
        d="M16 18H28V12H44V46H34V22H24V28H16V18Z"
        stroke={fgStroke}
        strokeWidth="2.2"
        strokeLinejoin="miter"
        fill="none"
      />

      {/* TOP-RIGHT: Solid geometric "G" */}
      <path
        d="M54 12H86V24H66V34H76V30H86V46H54V12Z"
        fill={fgFill}
      />

      {/* BOTTOM-LEFT: Solid geometric "H" */}
      <path
        d="M16 54H28V67H36V54H48V88H36V77H28V88H16V54Z"
        fill={fgFill}
      />

      {/* BOTTOM-RIGHT: Geometric "O" with outer outline and inner vertical rectangle */}
      <rect
        x="54"
        y="54"
        width="32"
        height="34"
        stroke={fgStroke}
        strokeWidth="2.2"
        fill="none"
      />
      <rect
        x="63"
        y="62"
        width="14"
        height="18"
        stroke={fgStroke}
        strokeWidth="2.2"
        fill="none"
      />
    </svg>
  );
};

export const IghoLogo: React.FC<IghoLogoProps> = ({
  size = 'md',
  variant = 'dark',
  showSubtitle = true,
  className = '',
}) => {
  const iconDimensions = {
    sm: 'w-6 h-6',
    md: 'w-8 h-8',
    lg: 'w-11 h-11',
    xl: 'w-14 h-14',
  }[size];

  const titleSize = {
    sm: 'text-sm',
    md: 'text-base font-extrabold',
    lg: 'text-xl font-extrabold',
    xl: 'text-2xl font-black',
  }[size];

  const subtitleSize = {
    sm: 'text-[8px]',
    md: 'text-[9px]',
    lg: 'text-[10px]',
    xl: 'text-[11px]',
  }[size];

  const isWhite = variant === 'white';

  return (
    <div className={`inline-flex items-center gap-2.5 ${className}`}>
      {/* Official Vector Emblem */}
      <IghoOfficialEmblem className={iconDimensions} inverted={isWhite} />

      {/* Brand Text */}
      <div className="flex flex-col leading-none">
        <span
          className={`tracking-tight font-black ${titleSize} ${
            isWhite ? 'text-white' : 'text-neutral-950'
          }`}
        >
          IGHO
        </span>
        {showSubtitle && (
          <span
            className={`font-semibold tracking-wider uppercase font-mono mt-0.5 ${subtitleSize} ${
              isWhite ? 'text-neutral-400' : 'text-neutral-500'
            }`}
          >
            Software Systems
          </span>
        )}
      </div>
    </div>
  );
};

