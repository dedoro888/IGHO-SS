import React from 'react';
import { Smartphone, Monitor, Sparkles } from 'lucide-react';
import { ActiveScreen } from '../types';

interface MobileFrameProps {
  children: React.ReactNode;
  isMobileDeviceMode: boolean;
  setIsMobileDeviceMode: (val: boolean) => void;
  activeScreen: ActiveScreen;
  setActiveScreen: (screen: ActiveScreen) => void;
}

export const MobileFrame: React.FC<MobileFrameProps> = ({
  children,
  isMobileDeviceMode,
  setIsMobileDeviceMode,
  activeScreen,
  setActiveScreen,
}) => {
  return (
    <div className="min-h-screen bg-neutral-900 text-neutral-100 flex flex-col items-center">
      {/* Top Preview Control Bar */}
      <header className="w-full bg-neutral-950 border-b border-neutral-800 px-3 py-2 flex flex-wrap items-center justify-between gap-2 z-50 text-xs">
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 bg-white text-black font-bold rounded flex items-center justify-center text-[11px]">
            I
          </div>
          <span className="font-semibold text-white tracking-wide">IGHO Mobile</span>
          <span className="bg-emerald-950 text-emerald-400 border border-emerald-800 px-1.5 py-0.5 rounded text-[10px] font-medium flex items-center gap-1">
            <Sparkles className="w-3 h-3" /> React Native Pixel-Perfect
          </span>
        </div>

        {/* Screen Quick Jumper for easy inspection */}
        <div className="flex items-center gap-1 overflow-x-auto py-1 max-w-full text-[11px] scrollbar-none">
          <span className="text-neutral-500 mr-1 hidden sm:inline">Screen:</span>
          {[
            { id: 'landing', label: 'Landing' },
            { id: 'setup_selector', label: 'Setup' },
            { id: 'hotel_onboarding', label: 'Hotel Onboarding' },
            { id: 'hotel_directory', label: 'Find Hotel' },
            { id: 'hotel_guest_portal', label: 'Rooms' },
            { id: 'room_detail', label: 'Room 201' },
            { id: 'guest_checkout', label: 'Checkout' },
            { id: 'guest_dashboard', label: 'Guest Portal' },
            { id: 'staff_portal', label: 'Staff Portal' },
            { id: 'classroom_waitlist', label: 'Classroom' },
            { id: 'medbay_waitlist', label: 'MedBay' },
          ].map((s) => (
            <button
              key={s.id}
              onClick={() => setActiveScreen(s.id as ActiveScreen)}
              className={`px-2 py-1 rounded transition-all whitespace-nowrap ${
                activeScreen === s.id
                  ? 'bg-white text-black font-medium shadow-sm'
                  : 'text-neutral-400 hover:text-white hover:bg-neutral-800'
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>

        {/* View Mode Toggle */}
        <div className="flex items-center bg-neutral-900 border border-neutral-800 rounded-lg p-0.5">
          <button
            onClick={() => setIsMobileDeviceMode(true)}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs transition-colors ${
              isMobileDeviceMode
                ? 'bg-neutral-700 text-white font-medium shadow-sm'
                : 'text-neutral-400 hover:text-neutral-200'
            }`}
            title="Mobile Device Shell"
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Mobile Shell</span>
          </button>
          <button
            onClick={() => setIsMobileDeviceMode(false)}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs transition-colors ${
              !isMobileDeviceMode
                ? 'bg-neutral-700 text-white font-medium shadow-sm'
                : 'text-neutral-400 hover:text-neutral-200'
            }`}
            title="Responsive Full Width"
          >
            <Monitor className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Full Width</span>
          </button>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 w-full flex justify-center items-start py-4 sm:py-6 px-2 sm:px-4">
        {isMobileDeviceMode ? (
          <div className="relative w-full max-w-[395px] h-[844px] max-h-[92vh] bg-black rounded-[46px] p-2.5 shadow-2xl border-4 border-neutral-700 ring-1 ring-neutral-900/50 flex flex-col overflow-hidden">
            {/* Native Mobile Status Bar */}
            <div className="w-full bg-white text-black px-6 pt-3 pb-2 flex justify-between items-center text-[12px] font-semibold select-none z-40 rounded-t-[36px]">
              <span>9:41</span>
              {/* Dynamic Island / Speaker */}
              <div className="w-24 h-4 bg-black rounded-full flex items-center justify-end px-2">
                <div className="w-2.5 h-2.5 rounded-full bg-neutral-800/80 border border-neutral-700"></div>
              </div>
              <div className="flex items-center gap-1.5 text-neutral-800">
                <span className="text-[10px] font-bold">5G</span>
                <div className="w-5 h-2.5 border border-black rounded-sm p-0.5 flex items-center">
                  <div className="w-3 h-full bg-black rounded-xs"></div>
                </div>
              </div>
            </div>

            {/* Mobile Viewport Screen */}
            <div className="flex-1 w-full bg-white text-neutral-900 overflow-y-auto overflow-x-hidden relative scrollbar-none">
              {children}
            </div>

            {/* Mobile Bottom Home Bar */}
            <div className="w-full bg-white py-1.5 flex justify-center items-center rounded-b-[36px]">
              <div className="w-32 h-1 bg-neutral-300 rounded-full"></div>
            </div>
          </div>
        ) : (
          <div className="w-full max-w-5xl bg-white text-neutral-900 min-h-[85vh] rounded-2xl shadow-xl overflow-hidden border border-neutral-200">
            {children}
          </div>
        )}
      </main>
    </div>
  );
};
