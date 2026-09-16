import React, { useState } from 'react';
import {
  FileCheck2,
  Clock,
  CheckCircle2,
  XCircle,
  Eye,
  Search,
  Building2,
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  MapPin,
  Mail,
  Phone,
  Check,
  X,
  ExternalLink,
  Copy,
  Send,
  GraduationCap,
  Building,
  HeartPulse,
  Hotel as HotelIcon,
} from 'lucide-react';
import { Hotel } from '../../types';

interface ConsoleRegistrationsViewProps {
  hotels?: Hotel[];
  onApproveHotel?: (hotelId: string) => void;
  onRejectHotel?: (hotelId: string, reason: string) => void;
  onNavigateBreadcrumb?: () => void;
}

export const ConsoleRegistrationsView: React.FC<ConsoleRegistrationsViewProps> = ({
  hotels = [],
  onApproveHotel,
  onRejectHotel,
  onNavigateBreadcrumb,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [orgTypeFilter, setOrgTypeFilter] = useState<'all' | 'hotels' | 'schools' | 'hospitals'>('all');
  const [rejectingHotel, setRejectingHotel] = useState<Hotel | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [approvedHotelModal, setApprovedHotelModal] = useState<Hotel | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedInvite, setCopiedInvite] = useState(false);

  // Pending hotel registrations derived from real hotels
  const pendingHotels = hotels.filter(
    (h) => (h as any).approvalStatus === 'pending' || !h.isLive
  );

  const filteredHotels = pendingHotels.filter((h) => {
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      !q ||
      h.name.toLowerCase().includes(q) ||
      (h.city && h.city.toLowerCase().includes(q)) ||
      (h.state && h.state.toLowerCase().includes(q)) ||
      (h.email && h.email.toLowerCase().includes(q));

    // Currently all organizations registered in IGHO Stay are hotels, but architecture allows filtering
    if (orgTypeFilter === 'schools' || orgTypeFilter === 'hospitals') {
      return false; // Real data only; no fake schools or hospitals in review queue
    }

    return matchesSearch;
  });

  const handleApprove = (hotel: Hotel) => {
    if (onApproveHotel) {
      onApproveHotel(hotel.id);
    }
    setApprovedHotelModal(hotel);
  };

  const handleCopy = (text: string, type: 'link' | 'invite') => {
    navigator.clipboard.writeText(text);
    if (type === 'link') {
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    } else {
      setCopiedInvite(true);
      setTimeout(() => setCopiedInvite(false), 2000);
    }
  };

  return (
    <div className="space-y-6 text-neutral-900">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-xs text-neutral-500">
        <button
          onClick={onNavigateBreadcrumb}
          className="hover:text-black flex items-center gap-1 transition-colors font-medium"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Dashboard</span>
        </button>
        <span className="text-neutral-300">/</span>
        <span className="text-neutral-900 font-bold">Registration Requests Review Queue</span>
      </div>

      {/* Header (Hotel Admin Portal Style) */}
      <div className="bg-white border border-neutral-200 rounded-2xl p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-amber-50 border border-amber-200 text-amber-700 flex items-center justify-center font-bold">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tight text-black">
              Tenant Registration Queue
            </h1>
            <p className="text-xs text-neutral-500">
              Audit and verify organization onboarding requests across IGHO Stay, Classroom, and MedBay.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200">
            {pendingHotels.length} Awaiting Verification
          </span>
        </div>
      </div>

      {/* Filter Bar with Organization Type Switching */}
      <div className="bg-white border border-neutral-200 rounded-2xl p-4 shadow-xs space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="relative flex-1 min-w-[240px] max-w-md">
            <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by name, city, state, or email..."
              className="w-full bg-neutral-50 border border-neutral-200 rounded-xl pl-9 pr-3 py-2 text-xs text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:border-black focus:bg-white transition-colors"
            />
          </div>

          {/* Org Type Filters */}
          <div className="flex items-center gap-1.5 p-1 bg-neutral-100 rounded-xl text-xs font-semibold">
            <button
              onClick={() => setOrgTypeFilter('all')}
              className={`px-3 py-1.5 rounded-lg transition-colors ${
                orgTypeFilter === 'all'
                  ? 'bg-white text-black font-bold shadow-xs'
                  : 'text-neutral-600 hover:text-black'
              }`}
            >
              All Requests
            </button>
            <button
              onClick={() => setOrgTypeFilter('hotels')}
              className={`px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 ${
                orgTypeFilter === 'hotels'
                  ? 'bg-white text-black font-bold shadow-xs'
                  : 'text-neutral-600 hover:text-black'
              }`}
            >
              <HotelIcon className="w-3.5 h-3.5" />
              <span>Hotels (IGHO Stay)</span>
            </button>
            <button
              onClick={() => setOrgTypeFilter('schools')}
              className={`px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 ${
                orgTypeFilter === 'schools'
                  ? 'bg-white text-black font-bold shadow-xs'
                  : 'text-neutral-600 hover:text-black'
              }`}
            >
              <GraduationCap className="w-3.5 h-3.5" />
              <span>Schools (Classroom)</span>
            </button>
            <button
              onClick={() => setOrgTypeFilter('hospitals')}
              className={`px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 ${
                orgTypeFilter === 'hospitals'
                  ? 'bg-white text-black font-bold shadow-xs'
                  : 'text-neutral-600 hover:text-black'
              }`}
            >
              <HeartPulse className="w-3.5 h-3.5" />
              <span>Hospitals (MedBay)</span>
            </button>
          </div>
        </div>
      </div>

      {/* Queue Table or Empty State */}
      {filteredHotels.length === 0 ? (
        <div className="bg-white border border-neutral-200 rounded-2xl p-12 text-center space-y-4 shadow-xs">
          <div className="w-12 h-12 rounded-2xl bg-neutral-100 border border-neutral-200 flex items-center justify-center mx-auto text-neutral-500">
            <FileCheck2 className="w-6 h-6" />
          </div>
          <div className="space-y-1 max-w-md mx-auto">
            <h3 className="text-base font-bold text-black">Review queue is clear</h3>
            <p className="text-xs text-neutral-500 leading-relaxed">
              {orgTypeFilter === 'all'
                ? 'No organization registration requests are currently pending review.'
                : `No pending registration requests found for category: ${orgTypeFilter}.`}
            </p>
          </div>
        </div>
      ) : (
        <div className="bg-white border border-neutral-200 rounded-2xl shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-neutral-50 border-b border-neutral-200 text-[10px] font-bold uppercase tracking-wider text-neutral-500">
                  <th className="p-4">Organization & Type</th>
                  <th className="p-4">Location</th>
                  <th className="p-4">Rooms / Capacity</th>
                  <th className="p-4">Contact Info</th>
                  <th className="p-4">CAC Number</th>
                  <th className="p-4 text-right">Review Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 text-xs text-neutral-800">
                {filteredHotels.map((hotel) => (
                  <tr key={hotel.id} className="hover:bg-neutral-50/80 transition-colors">
                    <td className="p-4">
                      <div className="font-bold text-neutral-900">{hotel.name}</div>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                          IGHO Stay
                        </span>
                        <span className="text-[10px] text-neutral-400 font-mono">ID: {hotel.id}</span>
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-1 text-neutral-700">
                        <MapPin className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
                        <span>{hotel.city || 'N/A'}, {hotel.state || 'N/A'}</span>
                      </div>
                    </td>
                    <td className="p-4 font-mono font-medium">{hotel.roomCount || 0} rooms</td>
                    <td className="p-4 text-neutral-600 font-mono text-[11px]">
                      <div>{hotel.email || '—'}</div>
                      <div className="text-[10px] text-neutral-400">{hotel.phone || ''}</div>
                    </td>
                    <td className="p-4 font-mono text-[11px] font-medium text-neutral-700">
                      {hotel.cacNumber || 'Pending CAC'}
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleApprove(hotel)}
                          className="px-3 py-1.5 rounded-xl bg-black hover:bg-neutral-800 text-white font-bold text-xs transition-colors flex items-center gap-1 shadow-xs"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>Approve & Launch</span>
                        </button>
                        <button
                          onClick={() => {
                            setRejectingHotel(hotel);
                            setRejectionReason('');
                          }}
                          className="px-3 py-1.5 rounded-xl border border-neutral-300 hover:bg-rose-50 hover:text-rose-700 hover:border-rose-300 text-neutral-700 font-semibold text-xs transition-colors flex items-center gap-1"
                        >
                          <X className="w-3.5 h-3.5" />
                          <span>Reject</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Approval Success & Credentials Modal */}
      {approvedHotelModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-neutral-200 rounded-2xl p-6 sm:p-8 max-w-lg w-full shadow-2xl space-y-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center font-bold">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-neutral-900">Registration Approved</h3>
                  <p className="text-xs text-neutral-500">
                    {approvedHotelModal.name} has been approved and provisioned.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setApprovedHotelModal(null)}
                className="text-neutral-400 hover:text-black"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Status overview */}
            <div className="grid grid-cols-2 gap-3 p-3 bg-neutral-50 rounded-2xl border border-neutral-200 text-xs">
              <div>
                <span className="text-[10px] uppercase font-bold text-neutral-400 block">Organization Status</span>
                <span className="font-bold text-emerald-600 flex items-center gap-1 mt-0.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block"></span>
                  Active
                </span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-neutral-400 block">Approval Status</span>
                <span className="font-bold text-emerald-600 flex items-center gap-1 mt-0.5">
                  <Check className="w-3.5 h-3.5" />
                  Approved
                </span>
              </div>
            </div>

            {/* Generated Links & Credentials */}
            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-neutral-700">Live Organization Dashboard</label>
                <div className="flex items-center gap-2">
                  <input
                    readOnly
                    value={`https://stay.igho.com/${approvedHotelModal.slug || approvedHotelModal.id}`}
                    className="flex-1 bg-neutral-100 border border-neutral-300 rounded-xl px-3 py-2 text-xs font-mono text-neutral-800"
                  />
                  <button
                    onClick={() =>
                      handleCopy(
                        `https://stay.igho.com/${approvedHotelModal.slug || approvedHotelModal.id}`,
                        'link'
                      )
                    }
                    className="px-3 py-2 rounded-xl bg-black text-white text-xs font-bold hover:bg-neutral-800 flex items-center gap-1"
                  >
                    {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedLink ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-neutral-700">Owner Activation & Invite Token</label>
                <div className="flex items-center gap-2">
                  <input
                    readOnly
                    value={`https://stay.igho.com/activate?token=act_${approvedHotelModal.id}`}
                    className="flex-1 bg-neutral-100 border border-neutral-300 rounded-xl px-3 py-2 text-xs font-mono text-neutral-800"
                  />
                  <button
                    onClick={() =>
                      handleCopy(
                        `https://stay.igho.com/activate?token=act_${approvedHotelModal.id}`,
                        'invite'
                      )
                    }
                    className="px-3 py-2 rounded-xl bg-neutral-200 text-neutral-800 text-xs font-bold hover:bg-neutral-300 flex items-center gap-1"
                  >
                    {copiedInvite ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedInvite ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Automated Dispatch Notification Status */}
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-2xl flex items-start gap-2.5 text-xs text-blue-900">
              <Send className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold block">Activation Notification Dispatched</span>
                <span className="text-[11px] text-blue-700">
                  Welcome instructions and login credentials have been simulated to{' '}
                  <strong className="font-mono">{approvedHotelModal.email}</strong>.
                </span>
              </div>
            </div>

            <div className="flex items-center justify-end">
              <button
                onClick={() => setApprovedHotelModal(null)}
                className="px-5 py-2.5 rounded-xl bg-black text-white text-xs font-bold hover:bg-neutral-800 transition-colors"
              >
                Close & Return
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {rejectingHotel && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-neutral-200 rounded-2xl p-6 sm:p-8 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center font-bold">
                <XCircle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-neutral-900">
                  Reject Registration
                </h3>
                <p className="text-xs text-neutral-500">{rejectingHotel.name}</p>
              </div>
            </div>

            <p className="text-xs text-neutral-500">
              Specify the reason for rejection (e.g. invalid CAC document, phone unverifiable). This reason will be recorded and communicated to the applicant.
            </p>
            <textarea
              rows={3}
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="e.g. CAC registration document could not be validated with the corporate affairs commission database."
              className="w-full bg-neutral-50 border border-neutral-300 rounded-xl p-3 text-xs text-neutral-900 focus:outline-none focus:border-black"
            />
            <div className="flex items-center justify-end gap-2">
              <button
                onClick={() => setRejectingHotel(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-neutral-700 hover:bg-neutral-100"
              >
                Cancel
              </button>
              <button
                disabled={!rejectionReason.trim()}
                onClick={() => {
                  if (onRejectHotel) onRejectHotel(rejectingHotel.id, rejectionReason);
                  setRejectingHotel(null);
                }}
                className="px-4 py-2 rounded-xl bg-rose-600 text-white text-xs font-bold hover:bg-rose-700 disabled:opacity-40"
              >
                Confirm Rejection
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
