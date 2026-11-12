import React from 'react';
import { IghoLoadingEmblem } from './IghoLoadingEmblem';

interface IghoLoadingScreenProps {
  message?: string;
  subMessage?: string;
}

/**
 * Signature High-End Luxury Full-Screen Loader
 * Presents the dynamic color-inverting IGHO emblem with a soft ambient aura,
 * obsidian glass backdrop blur, and refined typography.
 */
export const IghoLoadingScreen: React.FC<IghoLoadingScreenProps> = ({
  message,
  subMessage,
}) => {
  return (
    <div
      className="fixed inset-0 z-50 bg-black/92 backdrop-blur-md flex flex-col items-center justify-center p-6 select-none animate-in fade-in duration-300"
      role="status"
      aria-live="polite"
    >
      {/* Ambient Radial Glow Halo */}
      <div className="absolute w-72 h-72 rounded-full bg-radial from-white/10 via-emerald-500/5 to-transparent blur-2xl pointer-events-none" />

      {/* Main Luxury Emblem */}
      <div className="relative z-10 flex flex-col items-center">
        <div className="p-3.5 rounded-3xl bg-neutral-900/60 border border-neutral-800/80 shadow-2xl backdrop-blur-xl">
          <IghoLoadingEmblem size="xl" className="w-16 h-16 sm:w-20 sm:h-20" speed="normal" />
        </div>

        {/* Typographic Status Readout */}
        {message && (
          <div className="mt-6 text-center space-y-1.5 max-w-sm px-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="inline-flex items-center gap-2 text-xs font-mono font-bold tracking-widest uppercase text-neutral-300">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping inline-block" />
              <span>{message}</span>
            </div>
            {subMessage && (
              <p className="text-[11px] font-sans text-neutral-500 leading-relaxed font-normal">
                {subMessage}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
