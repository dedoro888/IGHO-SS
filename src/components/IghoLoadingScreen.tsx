import React from 'react';
import { IghoLoadingEmblem } from './IghoLoadingEmblem';

interface IghoLoadingScreenProps {
  message?: string;
  subMessage?: string;
}

/**
 * Minimalist Full-Screen Loader
 * Clean presentation displaying solely the dynamic color-inverting IGHO emblem
 * with no surrounding text, borders, or boxes.
 */
export const IghoLoadingScreen: React.FC<IghoLoadingScreenProps> = () => {
  return (
    <div className="fixed inset-0 z-50 bg-neutral-950/90 backdrop-blur-sm flex items-center justify-center p-6 animate-in fade-in duration-200">
      <IghoLoadingEmblem size="xl" className="w-16 h-16 sm:w-20 sm:h-20" />
    </div>
  );
};
