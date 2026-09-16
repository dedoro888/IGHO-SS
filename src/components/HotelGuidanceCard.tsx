import React, { useState } from 'react';
import {
  Sparkles,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  Circle,
  HelpCircle,
  ShieldCheck,
  Bed,
  Users,
  CreditCard,
  X,
  Layers,
} from 'lucide-react';

interface HotelGuidanceCardProps {
  roomCount: number;
  staffCount: number;
  onNavigateTab: (tab: any) => void;
  onOpenAddRoom: () => void;
  onOpenAddStaff: () => void;
}

export const HotelGuidanceCard: React.FC<HotelGuidanceCardProps> = ({
  roomCount,
  staffCount,
  onNavigateTab,
  onOpenAddRoom,
  onOpenAddStaff,
}) => {
  const [isDismissed, setIsDismissed] = useState(false);
  const [isExpanded, setIsExpanded] = useState(true);
  const [activeGuideModal, setActiveGuideModal] = useState<string | null>(null);

  if (isDismissed) return null;

  const steps = [
    {
      id: 'rooms',
      title: 'Configure Room Inventory & Rates',
      description: 'Add your rooms, assign pricing per night (₦), amenities, and floor numbers.',
      completed: roomCount > 0,
      actionLabel: 'Add Room',
      onAction: onOpenAddRoom,
    },
    {
      id: 'staff',
      title: 'Invite Staff & Configure Permissions',
      description: 'Add Managers, Receptionists, Finance, or Housekeepers with fine-grained access.',
      completed: staffCount > 1,
      actionLabel: 'Invite Staff',
      onAction: onOpenAddStaff,
    },
    {
      id: 'settings',
      title: 'Review Online Booking Rules & Branding',
      description: 'Set customer verification requirements, room price visibility, and share your portal link.',
      completed: true,
      actionLabel: 'Open Settings',
      onAction: () => onNavigateTab('settings'),
    },
    {
      id: 'reservations',
      title: 'Learn Check-in & Housekeeping Workflow',
      description: 'Departed guests automatically transition rooms to dirty for housekeeping roster updates.',
      completed: false,
      actionLabel: 'View Guide',
      onAction: () => setActiveGuideModal('workflow'),
    },
  ];

  const completedCount = steps.filter((s) => s.completed).length;

  return (
    <>
      <div className="bg-gradient-to-r from-neutral-900 to-neutral-950 text-white rounded-2xl p-5 sm:p-6 border border-neutral-800 shadow-xl space-y-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/10 text-white flex items-center justify-center font-bold">
              <Sparkles className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm sm:text-base font-black tracking-tight text-white">
                  Getting Started with IGHO Stay
                </h3>
                <span className="text-[10px] font-mono font-bold bg-amber-400/20 text-amber-300 border border-amber-400/40 px-2 py-0.5 rounded-full">
                  {completedCount}/{steps.length} Steps
                </span>
              </div>
              <p className="text-xs text-neutral-400 mt-0.5">
                Quick onboarding guide to help you manage rooms, guests, and staff permissions effortlessly.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="p-1.5 rounded-xl hover:bg-neutral-800 text-neutral-400 hover:text-white transition-colors"
              title={isExpanded ? 'Collapse' : 'Expand'}
            >
              {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
            <button
              onClick={() => setIsDismissed(true)}
              className="p-1.5 rounded-xl hover:bg-neutral-800 text-neutral-400 hover:text-white transition-colors"
              title="Dismiss"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {isExpanded && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
            {steps.map((step, idx) => (
              <div
                key={step.id}
                className={`p-3.5 rounded-2xl border transition-colors flex items-start justify-between gap-3 ${
                  step.completed
                    ? 'bg-neutral-900/60 border-neutral-800/80'
                    : 'bg-neutral-800/50 border-neutral-700/80 hover:border-neutral-600'
                }`}
              >
                <div className="flex items-start gap-2.5">
                  {step.completed ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  ) : (
                    <Circle className="w-4 h-4 text-neutral-500 shrink-0 mt-0.5" />
                  )}
                  <div className="space-y-0.5">
                    <h4
                      className={`text-xs font-bold ${
                        step.completed ? 'text-neutral-300 line-through' : 'text-white'
                      }`}
                    >
                      {step.title}
                    </h4>
                    <p className="text-[11px] text-neutral-400 leading-tight">
                      {step.description}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={step.onAction}
                  className="shrink-0 px-2.5 py-1 rounded-full bg-white/10 hover:bg-white text-white hover:text-black text-[11px] font-bold transition-colors"
                >
                  {step.actionLabel}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Guide Explainer Modal */}
      {activeGuideModal === 'workflow' && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-white text-neutral-900 rounded-2xl p-6 shadow-2xl space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
              <div className="flex items-center gap-2">
                <HelpCircle className="w-5 h-5 text-black" />
                <h3 className="font-bold text-base text-black">How Reservations & Housekeeping Work</h3>
              </div>
              <button
                onClick={() => setActiveGuideModal(null)}
                className="text-neutral-400 hover:text-black"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs text-neutral-600">
              <div className="p-3 bg-neutral-50 rounded-xl space-y-1">
                <strong className="text-black block text-xs">1. Guest Booking & Verification</strong>
                <p>
                  When a guest books through your public portal, their reservation appears as{' '}
                  <span className="font-semibold text-amber-700">Pending Verification</span>. Staff with{' '}
                  <code className="font-mono text-[10px] bg-neutral-200 px-1 py-0.5 rounded">reservations.edit</code>{' '}
                  can confirm payment and lock the room.
                </p>
              </div>

              <div className="p-3 bg-neutral-50 rounded-xl space-y-1">
                <strong className="text-black block text-xs">2. Check-In & Folio</strong>
                <p>
                  At reception, staff with <code className="font-mono text-[10px] bg-neutral-200 px-1 py-0.5 rounded">reservations.check_in</code>{' '}
                  click <strong>Check In</strong> to assign keys and mark the room as occupied.
                </p>
              </div>

              <div className="p-3 bg-neutral-50 rounded-xl space-y-1">
                <strong className="text-black block text-xs">3. Departure & Automated Cleaning Task</strong>
                <p>
                  Clicking <strong>Check Out</strong> completes the guest stay, generates final billing, and automatically creates a new task in the{' '}
                  <strong>Housekeeping</strong> roster for deep cleaning.
                </p>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setActiveGuideModal(null)}
                className="bg-black text-white px-5 py-2 rounded-xl text-xs font-bold hover:bg-neutral-800"
              >
                Understood
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
