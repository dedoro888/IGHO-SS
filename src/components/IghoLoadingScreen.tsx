import React from 'react';
import { IghoOfficialEmblem } from './IghoLogo';

interface IghoLoadingScreenProps {
  message?: string;
  subMessage?: string;
}

export const IghoLoadingScreen: React.FC<IghoLoadingScreenProps> = ({
  message = 'Connecting to IGHO Software Systems...',
  subMessage = 'Authenticating workspace and verifying permissions',
}) => {
  return (
    <div className="fixed inset-0 z-50 bg-neutral-950/95 backdrop-blur-md flex flex-col items-center justify-center p-6 text-white animate-in fade-in duration-200">
      {/* Centered Branded Hub */}
      <div className="flex flex-col items-center text-center space-y-6 max-w-sm mx-auto">
        {/* Animated Emblem with Rotating Halo */}
        <div className="relative">
          <div className="absolute -inset-4 bg-white/10 rounded-full blur-xl animate-pulse" />
          <div className="relative w-24 h-24 rounded-2xl bg-black border border-neutral-800 flex items-center justify-center shadow-2xl p-3">
            <IghoOfficialEmblem className="w-16 h-16" />
            {/* Smooth spinner ring around the emblem */}
            <div className="absolute -inset-1.5 rounded-[28px] border-2 border-transparent border-t-white/80 border-r-white/40 animate-spin" />
          </div>
        </div>

        {/* Company Title */}
        <div className="space-y-1.5">
          <div className="text-xl font-black tracking-tight text-white">
            IGHO Software Systems
          </div>
          <div className="text-[11px] font-mono uppercase tracking-widest text-neutral-400">
            Building Dreams • Enterprise Cloud
          </div>
        </div>

        {/* Dynamic Status Notification */}
        <div className="space-y-3 w-full max-w-xs">
          <div className="h-1.5 w-full bg-neutral-900 rounded-full overflow-hidden border border-neutral-800">
            <div className="h-full bg-white rounded-full animate-pulse w-3/4 transition-all duration-700" />
          </div>
          <p className="text-xs font-semibold text-neutral-200">{message}</p>
          <p className="text-[11px] text-neutral-400">{subMessage}</p>
        </div>
      </div>

      {/* Footer System Badge */}
      <div className="absolute bottom-6 text-[10px] font-mono text-neutral-500 uppercase tracking-wider">
        TLS 1.3 256-Bit Encrypted • ISO 27001 Certified Platform
      </div>
    </div>
  );
};
