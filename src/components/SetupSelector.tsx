import React from 'react';
import { Building2, GraduationCap, Cross, Check } from 'lucide-react';
import { ActiveScreen } from '../types';
import { BackButton } from './BackButton';

interface SetupSelectorProps {
  onNavigate: (screen: ActiveScreen) => void;
}

export const SetupSelector: React.FC<SetupSelectorProps> = ({ onNavigate }) => {
  return (
    <div className="min-h-screen bg-black text-white px-4 sm:px-6 py-8 flex flex-col justify-between">
      {/* Top Bar */}
      <div>
        <div className="max-w-5xl mx-auto flex items-center justify-between pb-8">
          <BackButton onClick={() => onNavigate('landing')} className="bg-neutral-900 border-neutral-800 text-neutral-300 hover:text-white hover:bg-neutral-800" />

          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-white text-black font-black rounded flex items-center justify-center text-xs">
              I
            </div>
            <span className="font-extrabold text-base tracking-tight text-white">IGHO</span>
          </div>

          <span className="text-xs text-neutral-400 font-medium">Join IGHO Platform</span>
        </div>

        {/* Main Content */}
        <div className="max-w-2xl mx-auto text-center space-y-3 pt-2 sm:pt-6">
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white">
            What are you setting up?
          </h1>
          <p className="text-neutral-400 text-xs sm:text-sm max-w-lg mx-auto leading-relaxed">
            Select your industry to launch your modern operations workspace or register for early access.
          </p>
        </div>

        {/* Setup Cards Grid: 3 Products */}
        <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-5 mt-8 sm:mt-10">
          {/* Card 1: A Hotel (IGHO Stay) */}
          <div className="bg-neutral-950 border border-neutral-800 rounded-2xl p-6 flex flex-col justify-between hover:border-neutral-700 transition-all shadow-xl group">
            <div className="space-y-4">
              <div className="w-12 h-12 bg-white text-black rounded-2xl flex items-center justify-center shadow-md">
                <Building2 className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider">
                  Live Platform
                </span>
                <h3 className="text-2xl font-bold text-white">A Hotel</h3>
              </div>
              <p className="text-xs text-neutral-400 leading-relaxed">
                Reservations, rooms, folios, housekeeping, guests, billing and your own public booking portal.
              </p>

              <div className="space-y-2 pt-2 text-xs text-neutral-300">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded-full bg-emerald-950 text-emerald-400 flex items-center justify-center border border-emerald-800 shrink-0">
                    <Check className="w-2.5 h-2.5" />
                  </div>
                  <span>Instant hotel workspace</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded-full bg-emerald-950 text-emerald-400 flex items-center justify-center border border-emerald-800 shrink-0">
                    <Check className="w-2.5 h-2.5" />
                  </div>
                  <span>Multi-branch management</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded-full bg-emerald-950 text-emerald-400 flex items-center justify-center border border-emerald-800 shrink-0">
                    <Check className="w-2.5 h-2.5" />
                  </div>
                  <span>Direct customer booking portal</span>
                </div>
              </div>
            </div>

            <div className="pt-6">
              <button
                onClick={() => onNavigate('hotel_onboarding')}
                className="w-full bg-white text-black py-3 px-4 rounded-full text-xs sm:text-sm font-bold hover:bg-neutral-200 transition-all flex items-center justify-center gap-2 active:scale-95 shadow-md cursor-pointer"
              >
                <span>Register your hotel</span>
              </button>
            </div>
          </div>

          {/* Card 2: A School (IGHO Classroom) */}
          <div className="bg-neutral-950/80 border border-neutral-800 rounded-2xl p-6 flex flex-col justify-between hover:border-neutral-700 transition-all shadow-xl group">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="w-12 h-12 bg-neutral-900 text-neutral-300 rounded-2xl flex items-center justify-center border border-neutral-800">
                  <GraduationCap className="w-6 h-6" />
                </div>
                <span className="text-[10px] font-semibold bg-blue-950 text-blue-400 border border-blue-800 px-2.5 py-1 rounded-full">
                  Launching Q3 2026
                </span>
              </div>
              <div>
                <span className="text-[10px] font-bold text-blue-400 uppercase tracking-wider">
                  School ERP • Roadmap: Q3 2026
                </span>
                <h3 className="text-2xl font-bold text-white">A School</h3>
              </div>
              <p className="text-xs text-neutral-400 leading-relaxed">
                Student enrollment records, fee reconciliation, automated gradebooks, attendance, and parent alerts.
              </p>

              <div className="space-y-2 pt-2 text-xs text-neutral-300">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded-full bg-blue-950 text-blue-400 flex items-center justify-center border border-blue-800 shrink-0">
                    <Check className="w-2.5 h-2.5" />
                  </div>
                  <span>Term fee automated tracking</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded-full bg-blue-950 text-blue-400 flex items-center justify-center border border-blue-800 shrink-0">
                    <Check className="w-2.5 h-2.5" />
                  </div>
                  <span>Instant report card generation</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded-full bg-blue-950 text-blue-400 flex items-center justify-center border border-blue-800 shrink-0">
                    <Check className="w-2.5 h-2.5" />
                  </div>
                  <span>Parent communication portal</span>
                </div>
              </div>
            </div>

            <div className="pt-6">
              <button
                onClick={() => onNavigate('classroom_waitlist')}
                className="w-full bg-neutral-900 hover:bg-neutral-800 text-neutral-200 border border-neutral-700 py-3 px-4 rounded-full text-xs sm:text-sm font-semibold transition-all flex items-center justify-center gap-2 active:scale-95 cursor-pointer"
              >
                <span>Join school waitlist (Q3 2026)</span>
              </button>
            </div>
          </div>

          {/* Card 3: A Hospital (IGHO MedBay - Hospital Management System) */}
          <div className="bg-neutral-950/80 border border-neutral-800 rounded-2xl p-6 flex flex-col justify-between hover:border-neutral-700 transition-all shadow-xl group">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="w-12 h-12 bg-neutral-900 text-rose-400 rounded-2xl flex items-center justify-center border border-neutral-800">
                  <Cross className="w-6 h-6" />
                </div>
                <span className="text-[10px] font-semibold bg-rose-950 text-rose-400 border border-rose-800 px-2.5 py-1 rounded-full">
                  Launching Q1 2028
                </span>
              </div>
              <div>
                <span className="text-[10px] font-bold text-rose-400 uppercase tracking-wider">
                  Hospital System • Roadmap: Q1 2028
                </span>
                <h3 className="text-2xl font-bold text-white">A Hospital</h3>
              </div>
              <p className="text-xs text-neutral-400 leading-relaxed">
                Hospital management software for inpatient ward beds, outpatient doctor consults, pharmacy, and billing.
              </p>

              <div className="space-y-2 pt-2 text-xs text-neutral-300">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded-full bg-rose-950 text-rose-400 flex items-center justify-center border border-rose-800 shrink-0">
                    <Check className="w-2.5 h-2.5" />
                  </div>
                  <span>Live bed & ward occupancy</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded-full bg-rose-950 text-rose-400 flex items-center justify-center border border-rose-800 shrink-0">
                    <Check className="w-2.5 h-2.5" />
                  </div>
                  <span>Electronic health records (EHR)</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded-full bg-rose-950 text-rose-400 flex items-center justify-center border border-rose-800 shrink-0">
                    <Check className="w-2.5 h-2.5" />
                  </div>
                  <span>Clinical dispensary & lab billing</span>
                </div>
              </div>
            </div>

            <div className="pt-6">
              <button
                onClick={() => onNavigate('medbay_waitlist')}
                className="w-full bg-neutral-900 hover:bg-neutral-800 text-neutral-200 border border-neutral-700 py-3 px-4 rounded-full text-xs sm:text-sm font-semibold transition-all flex items-center justify-center gap-2 active:scale-95 cursor-pointer"
              >
                <span>Join hospital waitlist (Q1 2028)</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Workspace Signin Link */}
      <div className="text-center pt-8 pb-4 text-xs text-neutral-400 space-y-2">
        <div>
          Already have an IGHO workspace?{' '}
          <button
            onClick={() => onNavigate('staff_login')}
            className="text-white underline font-semibold hover:text-neutral-200"
          >
            Sign in
          </button>
        </div>
      </div>
    </div>
  );
};
