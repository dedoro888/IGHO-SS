import React from 'react';
import { ArrowLeft } from 'lucide-react';

interface BackButtonProps {
  onClick?: () => void;
  className?: string;
  title?: string;
  ariaLabel?: string;
}

export const BackButton: React.FC<BackButtonProps> = ({
  onClick,
  className = '',
  title = 'Go back',
  ariaLabel = 'Go back',
}) => {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={ariaLabel}
      title={title}
      className={`group w-9 h-9 rounded-full bg-white border border-neutral-200 hover:border-neutral-300 text-neutral-600 hover:text-black hover:bg-neutral-100 shadow-xs flex items-center justify-center transition-all duration-150 active:scale-95 shrink-0 ${className}`}
    >
      <ArrowLeft className="w-4 h-4 transition-transform duration-150 group-hover:-translate-x-0.5" />
    </button>
  );
};
