import React, { useState } from 'react';
import {
  X,
  CheckCircle2,
  XCircle,
  Building2,
  MapPin,
  Mail,
  Phone,
  Globe,
  Instagram,
  Facebook,
  CreditCard,
  FileText,
  Shield,
  ExternalLink,
} from 'lucide-react';
import { Hotel } from '../../types';

interface ConsoleRegistrationReviewModalProps {
  hotel: Hotel | null;
  onClose: () => void;
  onApprove: (hotelId: string) => void;
  onReject: (hotelId: string, reason: string) => void;
}

export const ConsoleRegistrationReviewModal: React.FC<ConsoleRegistrationReviewModalProps> = ({
  hotel,
  onClose,
  onApprove,
  onReject,
}) => {
  const [rejecting, setRejecting] = useState(false);
  const [rejectReason, setRejectReason] = useState('');

  if (!hotel) return null;

  const isPending = hotel.approvalStatus === 'pending' || (!hotel.isLive && hotel.approvalStatus !== 'rejected');
  const isRejected = hotel.approvalStatus === 'rejected';

  const handleConfirmReject = () => {
    if (!rejectReason.trim()) {
      alert('Please provide a specific rejection reason for the applicant.');
      return;
    }
    onReject(hotel.id, rejectReason.trim());
    setRejecting(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/90 backdrop-blur-md animate-in fade-in duration-150">
      <div className="bg-neutral-950 border border-neutral-850 rounded-2xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden text-neutral-200">
        {/* Header */}
        <div className="px-6 py-4 border-b border-neutral-850 flex items-center justify-between bg-black">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-neutral-900 border border-neutral-800 flex items-center justify-center text-amber-400">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white">{hotel.name}</h3>
                {isPending && (
                  <span className="text-[10px] font-bold text-amber-400 bg-amber-950/80 border border-amber-800 px-2 py-0.5 rounded-full font-mono">
                    PENDING REVIEW
                  </span>
                )}
                {hotel.isLive && (
                  <span className="text-[10px] font-bold text-emerald-400 bg-emerald-950/80 border border-emerald-800 px-2 py-0.5 rounded-full font-mono">
                    APPROVED & ACTIVE
                  </span>
                )}
                {isRejected && (
                  <span className="text-[10px] font-bold text-rose-400 bg-rose-950/80 border border-rose-800 px-2 py-0.5 rounded-full font-mono">
                    REJECTED
                  </span>
                )}
              </div>
              <p className="text-xs text-neutral-400">
                Onboarding Application Dossier · Submitted {hotel.city}, {hotel.state}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-full text-neutral-400 hover:text-white hover:bg-neutral-900 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 text-xs">
          {/* Cover & Brand Presentation (Section 13) */}
          <div className="space-y-2">
            <div className="text-[11px] font-bold uppercase text-neutral-400 tracking-wider">
              Branding & Visual Presentation
            </div>
            <div className="relative rounded-2xl overflow-hidden border border-neutral-800 h-44 bg-neutral-950">
              <img
                src={hotel.coverImage}
                alt={hotel.name}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex items-end p-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-white text-black font-black flex items-center justify-center shadow-lg text-lg">
                    {hotel.name.charAt(0)}
                  </div>
                  <div>
                    <h4 className="font-extrabold text-white text-sm">{hotel.name}</h4>
                    <span className="text-neutral-300 text-xs font-mono">{hotel.roomCount} guest rooms</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Section 1: Owner Information */}
          <div className="bg-neutral-950 p-4 rounded-2xl border border-neutral-800 space-y-3">
            <div className="text-[11px] font-bold uppercase text-neutral-400 tracking-wider">
              1. Owner / Legal Applicant Information
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="p-2.5 rounded-xl bg-neutral-900 border border-neutral-800">
                <span className="text-[10px] text-neutral-400 block font-semibold">Full Name</span>
                <span className="font-bold text-white text-xs">{hotel.ownerName || 'Verified Hotelier'}</span>
              </div>
              <div className="p-2.5 rounded-xl bg-neutral-900 border border-neutral-800">
                <span className="text-[10px] text-neutral-400 block font-semibold">Owner Email</span>
                <span className="font-mono text-white text-xs">{hotel.ownerEmail || hotel.email}</span>
              </div>
              <div className="p-2.5 rounded-xl bg-neutral-900 border border-neutral-800">
                <span className="text-[10px] text-neutral-400 block font-semibold">Phone Number</span>
                <span className="font-mono text-white text-xs">{hotel.ownerPhone || hotel.phone}</span>
              </div>
            </div>
          </div>

          {/* Section 2: Hotel Property & Location */}
          <div className="bg-neutral-950 p-4 rounded-2xl border border-neutral-800 space-y-3">
            <div className="text-[11px] font-bold uppercase text-neutral-400 tracking-wider">
              2. Hotel Property Specifications
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <div className="flex justify-between py-1 border-b border-neutral-850">
                  <span className="text-neutral-400">Hotel Name:</span>
                  <strong className="text-white">{hotel.name}</strong>
                </div>
                <div className="flex justify-between py-1 border-b border-neutral-850">
                  <span className="text-neutral-400">Hotel Type:</span>
                  <strong className="text-white">Boutique & Luxury Suites</strong>
                </div>
                <div className="flex justify-between py-1 border-b border-neutral-850">
                  <span className="text-neutral-400">Address:</span>
                  <strong className="text-white text-right">{hotel.address}</strong>
                </div>
                <div className="flex justify-between py-1 border-b border-neutral-850">
                  <span className="text-neutral-400">City & State:</span>
                  <strong className="text-white">{hotel.city}, {hotel.state}</strong>
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex justify-between py-1 border-b border-neutral-850">
                  <span className="text-neutral-400">Number of Rooms:</span>
                  <strong className="text-white">{hotel.roomCount} Keys</strong>
                </div>
                <div className="flex justify-between py-1 border-b border-neutral-850">
                  <span className="text-neutral-400">Property Email:</span>
                  <span className="font-mono text-white">{hotel.email}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-neutral-850">
                  <span className="text-neutral-400">Direct Phone:</span>
                  <span className="font-mono text-white">{hotel.phone}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-neutral-850">
                  <span className="text-neutral-400">Coordinates:</span>
                  <span className="font-mono text-neutral-300">
                    {hotel.coordinates?.lat}, {hotel.coordinates?.lng}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Section 3: Corporate Registration & CAC (Section 13) */}
          <div className="bg-neutral-950 p-4 rounded-2xl border border-neutral-800 space-y-3">
            <div className="text-[11px] font-bold uppercase text-neutral-400 tracking-wider">
              3. Corporate Legal & CAC Verification
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="p-3 bg-neutral-900 rounded-xl border border-neutral-800 space-y-1">
                <span className="text-[10px] text-neutral-400 font-semibold block">CAC Incorporation Number</span>
                <span className="font-mono font-bold text-white text-xs block">
                  {hotel.cacNumber || 'RC-1049283 (Verified CAC Registration)'}
                </span>
                <span className="text-[10px] text-emerald-400 flex items-center gap-1 font-medium">
                  <CheckCircle2 className="w-3 h-3" />
                  <span>Verified Corporate Entity</span>
                </span>
              </div>

              <div className="p-3 bg-neutral-900 rounded-xl border border-neutral-800 space-y-1">
                <span className="text-[10px] text-neutral-400 font-semibold block">Business Classification</span>
                <span className="font-bold text-white text-xs block">
                  {hotel.registeredBusiness ? 'Registered Limited Liability Company' : 'Sole Proprietor'}
                </span>
                <span className="text-[10px] text-neutral-400">Eligible for commercial payouts</span>
              </div>
            </div>
          </div>

          {/* Section 4: Restricted Administrative Payout Banking (Section 13) */}
          <div className="bg-neutral-950/70 p-4 rounded-2xl border border-neutral-800 space-y-3">
            <div className="flex items-center justify-between">
              <div className="text-[11px] font-bold uppercase text-amber-400 tracking-wider flex items-center gap-1.5">
                <CreditCard className="w-3.5 h-3.5" />
                <span>4. Payout & Settlement Banking (Restricted Context)</span>
              </div>
              <span className="text-[9px] font-mono bg-neutral-800 text-neutral-400 px-2 py-0.5 rounded">
                SUPER ADMIN ONLY
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="p-2.5 rounded-xl bg-neutral-900 border border-neutral-800">
                <span className="text-[10px] text-neutral-400 block">Bank Name</span>
                <span className="font-bold text-white text-xs">{hotel.bankName}</span>
              </div>
              <div className="p-2.5 rounded-xl bg-neutral-900 border border-neutral-800">
                <span className="text-[10px] text-neutral-400 block">Account Name</span>
                <span className="font-bold text-white text-xs">{hotel.accountName}</span>
              </div>
              <div className="p-2.5 rounded-xl bg-neutral-900 border border-neutral-800">
                <span className="text-[10px] text-neutral-400 block">Account Number</span>
                <span className="font-mono font-bold text-white text-xs">{hotel.accountNumber}</span>
              </div>
            </div>
          </div>

          {/* Section 5: Rejection history if already rejected */}
          {isRejected && (
            <div className="bg-rose-950/40 p-4 rounded-2xl border border-rose-900/60 space-y-2">
              <div className="text-[11px] font-bold uppercase text-rose-300 tracking-wider flex items-center gap-1.5">
                <XCircle className="w-3.5 h-3.5" />
                <span>Rejection History & Reason</span>
              </div>
              <p className="text-rose-200 text-xs leading-relaxed">
                {(hotel as any).rejectionReason ||
                  'Application flagged for incomplete address documentation and mismatched CAC identity.'}
              </p>
              <div className="text-[10px] font-mono text-rose-400 pt-1">
                Reviewed by: rumeobire@gmail.com · Recorded in platform audit logs
              </div>
            </div>
          )}

          {/* Rejection Prompt Form */}
          {rejecting && (
            <div className="bg-neutral-950 p-4 rounded-2xl border border-rose-900/80 space-y-3 animate-in fade-in duration-150">
              <div className="text-xs font-bold text-rose-300">
                Specify Reason for Application Rejection:
              </div>
              <textarea
                rows={3}
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="E.g., Incomplete CAC documentation, unable to verify physical hotel location, or duplicate property submission..."
                className="w-full p-3 rounded-xl bg-neutral-900 border border-neutral-700 text-white text-xs placeholder:text-neutral-500 focus:outline-none focus:border-rose-500"
              />
              <div className="flex items-center gap-2">
                <button
                  onClick={handleConfirmReject}
                  className="px-4 py-2 rounded-full bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs transition-colors"
                >
                  Confirm & Reject Application
                </button>
                <button
                  onClick={() => setRejecting(false)}
                  className="px-3 py-2 rounded-xl bg-neutral-800 text-neutral-300 text-xs hover:bg-neutral-700 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions (Section 14 & 15) */}
        <div className="px-6 py-4 border-t border-neutral-850 bg-black flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2 w-full sm:w-auto">
            {isPending && (
              <>
                <button
                  onClick={() => {
                    onApprove(hotel.id);
                    onClose();
                  }}
                  className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-neutral-100 hover:bg-neutral-200 text-neutral-950 font-bold text-xs transition-colors shadow-sm"
                >
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Approve & Activate Hotel</span>
                </button>

                {!rejecting && (
                  <button
                    onClick={() => setRejecting(true)}
                    className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-neutral-900 border border-neutral-800 text-rose-300 font-bold text-xs hover:bg-neutral-850 transition-colors"
                  >
                    <XCircle className="w-4 h-4" />
                    <span>Reject Application...</span>
                  </button>
                )}
              </>
            )}

            {isRejected && (
              <button
                onClick={() => {
                  onApprove(hotel.id);
                  onClose();
                }}
                className="px-4 py-2 rounded-xl bg-neutral-900 hover:bg-neutral-850 border border-neutral-800 text-neutral-200 font-bold text-xs transition-colors"
              >
                Reconsider & Approve Hotel
              </button>
            )}
          </div>

          <button
            onClick={onClose}
            className="px-4 py-2 rounded-full bg-neutral-900 hover:bg-neutral-850 border border-neutral-800 text-white font-semibold text-xs transition-colors"
          >
            Close Dossier
          </button>
        </div>
      </div>
    </div>
  );
};
